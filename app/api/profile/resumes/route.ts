import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/prisma'
import {
  generateResumeKey,
  generateUploadUrl,
  downloadFile,
  validateS3KeyOwnership,
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS,
} from '@/lib/s3'
import { extractTextFromBuffer } from '@/lib/file-extractor'
import { parseResumeText } from '@/lib/resume-parser'

const MAX_RESUMES = 3

const postSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('upload'),
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    fileSize: z.number().int().positive(),
    s3Key: z.string().optional(),
  }),
  z.object({
    method: z.literal('paste'),
    resumeText: z.string().min(50, 'Resume text must be at least 50 characters'),
  }),
])

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resumes = await prisma.resumeUpload.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      file_name: true,
      file_type: true,
      file_size: true,
      source: true,
      parsed_at: true,
      parsing_error: true,
      created_at: true,
    },
  })

  return NextResponse.json({
    resumes: resumes.map(r => ({
      ...r,
      uploaded_at: r.created_at.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = postSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Check resume count limit
  const existingCount = await prisma.resumeUpload.count({
    where: { user_id: user.id },
  })

  if (existingCount >= MAX_RESUMES) {
    return NextResponse.json(
      { error: 'Maximum of 3 resumes allowed. Delete an existing resume to upload a new one.' },
      { status: 400 }
    )
  }

  if (data.method === 'upload') {
    return handleUpload(user.id, data)
  } else {
    return handlePaste(user.id, data)
  }
}

async function handleUpload(
  userId: string,
  data: { fileName: string; fileType: string; fileSize: number; s3Key?: string }
) {
  // Validate file type
  if (!ALLOWED_MIME_TYPES.RESUME.includes(data.fileType)) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 })
  }

  // Validate file size
  if (data.fileSize > FILE_SIZE_LIMITS.RESUME) {
    return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
  }

  // Step 1: No s3Key - generate presigned upload URL
  if (!data.s3Key) {
    const key = generateResumeKey(userId, data.fileName)
    const uploadUrl = await generateUploadUrl(key, data.fileType, 300)
    return NextResponse.json({ uploadUrl, s3Key: key })
  }

  // Step 3: s3Key provided - process uploaded file
  try {
    validateS3KeyOwnership(data.s3Key, userId)
    const buffer = await downloadFile(data.s3Key)

    if (buffer.length > FILE_SIZE_LIMITS.RESUME) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 })
    }
    const text = await extractTextFromBuffer(buffer, data.fileType)
    const parsedResume = await parseResumeText(text, userId)

    // Create ResumeUpload record
    const resumeUpload = await prisma.resumeUpload.create({
      data: {
        user_id: userId,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_url: data.s3Key,
        source: 'upload',
        parsed_at: new Date(),
      },
    })

    const summary = await updateProfileFromParsedResume(
      userId,
      parsedResume,
      data.s3Key,
      data.fileName
    )

    return NextResponse.json({ resumeUploadId: resumeUpload.id, summary })
  } catch (error) {
    console.error('Resume processing error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process resume'

    // Create record with parsing error (log full error internally)
    await prisma.resumeUpload.create({
      data: {
        user_id: userId,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_url: data.s3Key,
        source: 'upload',
        parsing_error: errorMessage,
      },
    })

    return NextResponse.json({ error: 'Failed to process resume' }, { status: 500 })
  }
}

async function handlePaste(userId: string, data: { resumeText: string }) {
  try {
    const parsedResume = await parseResumeText(data.resumeText, userId)

    const resumeUpload = await prisma.resumeUpload.create({
      data: {
        user_id: userId,
        file_name: 'Pasted Resume',
        file_type: 'text/plain',
        file_size: Buffer.byteLength(data.resumeText, 'utf-8'),
        storage_url: null,
        source: 'paste',
        parsed_at: new Date(),
      },
    })

    const summary = await updateProfileFromParsedResume(userId, parsedResume, null, 'Pasted Resume')

    return NextResponse.json({ resumeUploadId: resumeUpload.id, summary })
  } catch (error) {
    console.error('Resume paste processing error:', error)
    return NextResponse.json({ error: 'Failed to process resume' }, { status: 500 })
  }
}

async function updateProfileFromParsedResume(
  userId: string,
  parsedResume: Awaited<ReturnType<typeof parseResumeText>>,
  storageUrl: string | null,
  fileName: string
) {
  // Fetch current profile with parsed_resume and skills
  const currentProfile = await prisma.profile.findUnique({
    where: { user_id: userId },
    select: { skills: true, parsed_resume: true },
  })

  const existing = (currentProfile?.parsed_resume ?? null) as Record<string, unknown> | null

  // --- Merge parsed_resume sections ---

  // Personal: prefer new non-null values, keep existing where new is null
  const existingPersonal = (existing?.personal ?? {}) as Record<string, unknown>
  const mergedPersonal = { ...existingPersonal }
  for (const [key, value] of Object.entries(parsedResume.personal)) {
    if (value != null) {
      mergedPersonal[key] = value
    }
  }

  // Education: dedup by school + degree (case-insensitive)
  const existingEducation = (Array.isArray(existing?.education) ? existing.education : []) as Array<
    Record<string, unknown>
  >
  const eduKeys = new Set(
    existingEducation.map(
      e => `${String(e.school ?? '').toLowerCase()}|${String(e.degree ?? '').toLowerCase()}`
    )
  )
  const newEducation = parsedResume.education.filter(
    e => !eduKeys.has(`${e.school.toLowerCase()}|${String(e.degree ?? '').toLowerCase()}`)
  )
  const mergedEducation = [...existingEducation, ...newEducation]

  // Experience: dedup by title + company (case-insensitive)
  const existingExperience = (
    Array.isArray(existing?.experience) ? existing.experience : []
  ) as Array<Record<string, unknown>>
  const expKeys = new Set(
    existingExperience.map(
      e => `${String(e.title ?? '').toLowerCase()}|${String(e.company ?? '').toLowerCase()}`
    )
  )
  const newExperience = parsedResume.experience.filter(
    e => !expKeys.has(`${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
  )
  const mergedExperience = [...existingExperience, ...newExperience]

  // Projects (parsed_resume JSON): dedup by name (case-insensitive)
  const existingProjects = (Array.isArray(existing?.projects) ? existing.projects : []) as Array<
    Record<string, unknown>
  >
  const projKeys = new Set(existingProjects.map(p => String(p.name ?? '').toLowerCase()))
  const newParsedProjects = parsedResume.projects.filter(p => !projKeys.has(p.name.toLowerCase()))
  const mergedProjects = [...existingProjects, ...newParsedProjects]

  // Skills (parsed_resume JSON): union each sub-array, case-insensitive dedup
  const existingSkillsJson = (existing?.skills ?? {}) as Record<string, unknown>
  const mergedSkillsJson: Record<string, string[]> = {}
  for (const category of ['languages', 'frameworks', 'tools', 'other'] as const) {
    const existArr = Array.isArray(existingSkillsJson[category])
      ? (existingSkillsJson[category] as string[])
      : []
    const newArr = parsedResume.skills[category]
    const seen = new Set(existArr.map(s => s.toLowerCase()))
    const merged = [...existArr]
    for (const s of newArr) {
      const lower = s.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        merged.push(s)
      }
    }
    mergedSkillsJson[category] = merged
  }

  // Certifications: dedup by name (case-insensitive)
  const existingCerts = (
    Array.isArray(existing?.certifications) ? existing.certifications : []
  ) as Array<Record<string, unknown>>
  const certKeys = new Set(existingCerts.map(c => String(c.name ?? '').toLowerCase()))
  const newCerts = parsedResume.certifications.filter(c => !certKeys.has(c.name.toLowerCase()))
  const mergedCerts = [...existingCerts, ...newCerts]

  const mergedParsedResume = {
    personal: mergedPersonal,
    education: mergedEducation,
    experience: mergedExperience,
    projects: mergedProjects,
    skills: mergedSkillsJson,
    certifications: mergedCerts,
  }

  // --- Merge Profile.skills[] (flat array) ---
  const resumeSkills = [
    ...parsedResume.skills.languages,
    ...parsedResume.skills.frameworks,
    ...parsedResume.skills.tools,
    ...parsedResume.skills.other,
  ]

  const allSkills = [...(currentProfile?.skills || []), ...resumeSkills]
  const uniqueSkills: string[] = []
  const skillsSeen = new Set<string>()

  for (const skill of allSkills) {
    const trimmed = skill.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (!skillsSeen.has(lower)) {
      skillsSeen.add(lower)
      uniqueSkills.push(trimmed)
    }
  }

  // Update profile with merged data
  await prisma.profile.update({
    where: { user_id: userId },
    data: {
      parsed_resume: mergedParsedResume as unknown as Prisma.InputJsonValue,
      parsed_resume_confirmed_at: new Date(),
      skills: uniqueSkills,
      ...(storageUrl
        ? {
            resume_file_url: storageUrl,
            resume_file_name: fileName,
            resume_uploaded_at: new Date(),
          }
        : {}),
    },
  })

  // --- Education (DB records): add-only, dedup by school+degree ---
  let educationAdded = 0
  if (newEducation.length > 0) {
    const existingDbEdu = await prisma.education.findMany({
      where: { user_id: userId },
      select: { school: true, degree: true, display_order: true },
    })

    const existingEduKeys = new Set(
      existingDbEdu.map(e => `${e.school.toLowerCase()}|${e.degree.toLowerCase()}`)
    )
    const maxEduOrder = existingDbEdu.reduce((max, e) => Math.max(max, e.display_order), -1)

    const eduToCreate = newEducation
      .filter(
        e =>
          !existingEduKeys.has(`${e.school.toLowerCase()}|${String(e.degree ?? '').toLowerCase()}`)
      )
      .map((edu, index) => ({
        user_id: userId,
        school: edu.school,
        degree: edu.degree || '',
        major: edu.major || null,
        graduation_date: edu.graduationDate || '',
        gpa: edu.gpa || null,
        display_order: maxEduOrder + 1 + index,
      }))

    if (eduToCreate.length > 0) {
      await prisma.education.createMany({ data: eduToCreate })
    }
    educationAdded = eduToCreate.length
  }

  // --- Experience + Bullets (DB records): add-only, dedup by title+company ---
  let experienceAdded = 0
  let bulletsAdded = 0
  if (newExperience.length > 0) {
    const existingDbExp = await prisma.jobExperience.findMany({
      where: { user_id: userId },
      select: { title: true, company: true, display_order: true },
    })

    const existingExpKeys = new Set(
      existingDbExp.map(e => `${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
    )
    const maxExpOrder = existingDbExp.reduce((max, e) => Math.max(max, e.display_order), -1)

    const expToCreate = newExperience.filter(
      e => !existingExpKeys.has(`${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
    )

    for (let i = 0; i < expToCreate.length; i++) {
      const exp = expToCreate[i]
      const created = await prisma.jobExperience.create({
        data: {
          user_id: userId,
          title: exp.title,
          company: exp.company,
          location: exp.location || null,
          start_date: exp.startDate || '',
          end_date: exp.endDate || null,
          is_current: exp.current,
          display_order: maxExpOrder + 1 + i,
        },
      })

      // Create bullets for this experience
      if (exp.bullets && exp.bullets.length > 0) {
        await prisma.bullet.createMany({
          data: exp.bullets.map((text, j) => ({
            user_id: userId,
            experience_id: created.id,
            text,
            priority: j,
          })),
        })
        bulletsAdded += exp.bullets.length
      }
    }
    experienceAdded = expToCreate.length
  }

  // --- Projects (DB records): add-only, no delete ---
  let projectsAdded = 0
  if (parsedResume.projects && parsedResume.projects.length > 0) {
    const existingDbProjects = await prisma.project.findMany({
      where: { user_id: userId },
      select: { name: true, display_order: true },
    })

    const existingNames = new Set(existingDbProjects.map(p => p.name.toLowerCase()))
    const maxOrder = existingDbProjects.reduce((max, p) => Math.max(max, p.display_order), -1)

    const projectsToCreate = parsedResume.projects
      .filter(p => !existingNames.has(p.name.toLowerCase()))
      .map((project, index) => {
        let githubLink: string | null = null
        let projectUrl: string | null = project.url || null

        if (projectUrl && projectUrl.toLowerCase().includes('github.com')) {
          githubLink = projectUrl
          projectUrl = null
        }

        return {
          user_id: userId,
          name: project.name,
          description: project.description || null,
          technologies: project.technologies || [],
          date_range: null as string | null,
          url: projectUrl,
          github_link: githubLink,
          display_order: maxOrder + 1 + index,
        }
      })

    if (projectsToCreate.length > 0) {
      await prisma.project.createMany({ data: projectsToCreate })
    }
    projectsAdded = projectsToCreate.length
  }

  return { educationAdded, experienceAdded, projectsAdded, bulletsAdded }
}
