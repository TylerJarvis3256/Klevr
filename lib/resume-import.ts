import { prisma } from '@/lib/prisma'
import { ParsedResume } from '@/lib/resume-parser'

interface ImportSummary {
  educationAdded: number
  experienceAdded: number
  projectsAdded: number
  bulletsAdded: number
}

/**
 * Import parsed resume data into structured DB records.
 * Deduplicates by school+degree, title+company, and project name (case-insensitive).
 * Creates Bullet records linked to their parent experience/project.
 * Updates Profile: parsed_resume, parsed_resume_confirmed_at, merges skills.
 */
export async function importParsedResume(
  userId: string,
  parsedResume: ParsedResume
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    educationAdded: 0,
    experienceAdded: 0,
    projectsAdded: 0,
    bulletsAdded: 0,
  }

  // --- Education ---
  const existingEducation = await prisma.education.findMany({
    where: { user_id: userId },
    select: { school: true, degree: true },
  })
  const eduKeys = new Set(
    existingEducation.map(e => `${e.school.toLowerCase()}|${e.degree.toLowerCase()}`)
  )

  const maxEduOrder = await prisma.education.aggregate({
    where: { user_id: userId },
    _max: { display_order: true },
  })
  let eduOrder = maxEduOrder._max.display_order || 0

  for (const edu of parsedResume.education) {
    const key = `${edu.school.toLowerCase()}|${(edu.degree || '').toLowerCase()}`
    if (eduKeys.has(key)) continue

    await prisma.education.create({
      data: {
        user_id: userId,
        school: edu.school,
        degree: edu.degree || 'Degree',
        major: edu.major || null,
        graduation_date: edu.graduationDate || '',
        gpa: edu.gpa || null,
        display_order: ++eduOrder,
      },
    })
    summary.educationAdded++
    eduKeys.add(key)
  }

  // --- Experience ---
  const existingExperience = await prisma.jobExperience.findMany({
    where: { user_id: userId },
    select: { title: true, company: true },
  })
  const expKeys = new Set(
    existingExperience.map(e => `${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
  )

  const maxExpOrder = await prisma.jobExperience.aggregate({
    where: { user_id: userId },
    _max: { display_order: true },
  })
  let expOrder = maxExpOrder._max.display_order || 0

  for (const exp of parsedResume.experience) {
    const key = `${exp.title.toLowerCase()}|${exp.company.toLowerCase()}`
    if (expKeys.has(key)) continue

    const created = await prisma.jobExperience.create({
      data: {
        user_id: userId,
        title: exp.title,
        company: exp.company,
        location: exp.location || null,
        start_date: exp.startDate || '',
        end_date: exp.endDate || null,
        is_current: exp.current,
        display_order: ++expOrder,
      },
    })

    summary.experienceAdded++
    expKeys.add(key)

    // Create bullets for this experience
    for (const bulletText of exp.bullets) {
      if (!bulletText.trim()) continue
      await prisma.bullet.create({
        data: {
          user_id: userId,
          experience_id: created.id,
          text: bulletText.trim(),
        },
      })
      summary.bulletsAdded++
    }
  }

  // --- Projects ---
  const existingProjects = await prisma.project.findMany({
    where: { user_id: userId },
    select: { name: true },
  })
  const projKeys = new Set(existingProjects.map(p => p.name.toLowerCase()))

  const maxProjOrder = await prisma.project.aggregate({
    where: { user_id: userId },
    _max: { display_order: true },
  })
  let projOrder = maxProjOrder._max.display_order || 0

  for (const proj of parsedResume.projects) {
    if (projKeys.has(proj.name.toLowerCase())) continue

    await prisma.project.create({
      data: {
        user_id: userId,
        name: proj.name,
        description: proj.description || null,
        technologies: proj.technologies || [],
        url: proj.url || null,
        display_order: ++projOrder,
      },
    })

    summary.projectsAdded++
    projKeys.add(proj.name.toLowerCase())

    // Projects from parsed resume don't have bullets in the ParsedResume type,
    // but if the description is substantial, we skip creating bullets from it
  }

  // --- Update Profile: parsed_resume, confirmed_at, merge skills ---
  const profile = await prisma.profile.findUnique({
    where: { user_id: userId },
    select: { skills: true },
  })

  const existingSkills = profile?.skills || []
  const newSkills = [
    ...(parsedResume.skills?.languages || []),
    ...(parsedResume.skills?.frameworks || []),
    ...(parsedResume.skills?.tools || []),
    ...(parsedResume.skills?.other || []),
  ]
  const mergedSkills = [...new Set([...existingSkills, ...newSkills])].sort()

  await prisma.profile.update({
    where: { user_id: userId },
    data: {
      parsed_resume: parsedResume as object,
      parsed_resume_confirmed_at: new Date(),
      skills: mergedSkills,
    },
  })

  return summary
}
