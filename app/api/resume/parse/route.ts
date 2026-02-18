import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, Prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseResumeText } from '@/lib/resume-parser'

const parseSchema = z.object({
  resumeText: z.string().min(50, 'Resume text must be at least 50 characters').optional(),
  key: z.string().optional(),
  fileType: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate input
    const body = await req.json()
    const parsed = parseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    let resumeText: string

    // 3. Get resume text (either from direct paste or file extraction)
    if (parsed.data.key && parsed.data.fileType) {
      // Extract from uploaded file
      const { downloadFile } = await import('@/lib/s3')
      const { extractTextFromBuffer } = await import('@/lib/file-extractor')

      const fileBuffer = await downloadFile(parsed.data.key)
      resumeText = await extractTextFromBuffer(fileBuffer, parsed.data.fileType)

      if (!resumeText || resumeText.length < 50) {
        return NextResponse.json(
          { error: 'Could not extract sufficient text from file' },
          { status: 400 }
        )
      }
    } else if (parsed.data.resumeText) {
      // Direct text paste
      resumeText = parsed.data.resumeText
    } else {
      return NextResponse.json(
        { error: 'Either resumeText or (key + fileType) must be provided' },
        { status: 400 }
      )
    }

    // 4. Parse resume using OpenAI
    const parsedResume = await parseResumeText(resumeText)

    // 5. Save parsed resume to profile (not confirmed yet)
    await prisma.profile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        parsed_resume: parsedResume as unknown as Prisma.InputJsonValue,
      },
      update: {
        parsed_resume: parsedResume as unknown as Prisma.InputJsonValue,
        // Clear confirmation when re-parsing
        parsed_resume_confirmed_at: null,
      },
    })

    return NextResponse.json({
      success: true,
      parsed_resume: parsedResume,
    })
  } catch (error) {
    console.error('POST /api/resume/parse error:', error)

    // Provide more helpful error message for parsing failures
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to parse resume',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 })
  }
}
