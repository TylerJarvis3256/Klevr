import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseResumeText } from '@/lib/resume-parser'
import { generateUploadUrl, generateResumeKey } from '@/lib/s3'
import { z } from 'zod'

const updateResumeSchema = z.object({
  method: z.enum(['upload', 'paste']),
  // For upload method
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  // For paste method
  resumeText: z.string().optional(),
})

/**
 * POST /api/resume/update
 *
 * Step 1: Initiate resume update (get presigned URL for upload OR parse pasted text)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateResumeSchema.parse(body)

    if (validatedData.method === 'upload') {
      // File upload flow - generate presigned URL
      if (!validatedData.fileName || !validatedData.fileType) {
        return NextResponse.json(
          { error: 'fileName and fileType required for upload' },
          { status: 400 }
        )
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!allowedTypes.includes(validatedData.fileType)) {
        return NextResponse.json(
          { error: 'Only PDF and DOCX files are supported' },
          { status: 400 }
        )
      }

      // Generate S3 key
      const key = generateResumeKey(user.id, validatedData.fileName)

      // Generate presigned upload URL (5 minutes)
      const uploadUrl = await generateUploadUrl(key, validatedData.fileType, 300)

      return NextResponse.json({
        uploadUrl,
        key,
        method: 'upload',
      })
    } else {
      // Paste text flow - parse immediately
      if (!validatedData.resumeText || validatedData.resumeText.trim().length === 0) {
        return NextResponse.json({ error: 'resumeText required for paste method' }, { status: 400 })
      }

      // Parse resume text
      const parsedResume = await parseResumeText(validatedData.resumeText)

      // Don't auto-confirm - return for user review
      return NextResponse.json({
        method: 'paste',
        parsedResume,
      })
    }
  } catch (error) {
    console.error('POST /api/resume/update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process resume update' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/resume/update
 *
 * Step 2: After file uploaded to S3, download and extract text server-side
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { key, fileName, fileType } = body

    if (!key || !fileName || !fileType) {
      return NextResponse.json({ error: 'key, fileName, and fileType required' }, { status: 400 })
    }

    // Download file from S3
    const { downloadFile } = await import('@/lib/s3')
    const fileBuffer = await downloadFile(key)

    // Extract text from file (server-side)
    const { extractTextFromBuffer } = await import('@/lib/file-extractor')
    const resumeText = await extractTextFromBuffer(fileBuffer, fileType)

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract sufficient text from file' },
        { status: 400 }
      )
    }

    // Parse resume text
    const parsedResume = await parseResumeText(resumeText)

    // Store file info but don't confirm yet
    await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        resume_file_url: key,
        resume_file_name: fileName,
        resume_uploaded_at: new Date(),
        // Don't set parsed_resume or parsed_resume_confirmed_at yet
      },
    })

    return NextResponse.json({
      parsedResume,
      fileKey: key,
    })
  } catch (error) {
    console.error('PATCH /api/resume/update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse uploaded resume' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/resume/update
 *
 * Step 3: Confirm the parsed resume and update profile
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { parsedResume, shouldMigrate = true } = body

    if (!parsedResume) {
      return NextResponse.json({ error: 'parsedResume required' }, { status: 400 })
    }

    // Merge new resume data with existing data (ADDITIVE)
    if (shouldMigrate) {
      const { mergeStructuredDataFromParsedResume } = await import('@/lib/migrate-user-profile')
      await mergeStructuredDataFromParsedResume(user.id, parsedResume)
    } else {
      // If not migrating, just update parsed_resume and skills
      const profile = await prisma.profile.findUnique({
        where: { user_id: user.id },
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
        where: { user_id: user.id },
        data: {
          parsed_resume: parsedResume,
          parsed_resume_confirmed_at: new Date(),
          skills: mergedSkills,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Resume updated successfully',
    })
  } catch (error) {
    console.error('PUT /api/resume/update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm resume update' },
      { status: 500 }
    )
  }
}
