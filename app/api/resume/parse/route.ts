import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { parseResumeText } from '@/lib/resume-parser'

const parseSchema = z.object({
  resumeText: z.string().min(50, 'Resume text must be at least 50 characters'),
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

    const { resumeText } = parsed.data

    // 3. Parse resume using OpenAI
    const parsedResume = await parseResumeText(resumeText)

    // 4. Save parsed resume to profile (not confirmed yet)
    await prisma.profile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        parsed_resume: parsedResume as any,
      },
      update: {
        parsed_resume: parsedResume as any,
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

    return NextResponse.json(
      { error: 'Failed to parse resume' },
      { status: 500 }
    )
  }
}
