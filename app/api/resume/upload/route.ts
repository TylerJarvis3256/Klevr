import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma, prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const uploadSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
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
    const parsed = uploadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { key, filename } = parsed.data

    // 3. Update profile with resume file info
    const profile = await prisma.profile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        resume_file_url: key,
        resume_file_name: filename,
        resume_uploaded_at: new Date(),
      },
      update: {
        resume_file_url: key,
        resume_file_name: filename,
        resume_uploaded_at: new Date(),
        // Clear previous parsed resume when new file is uploaded
        parsed_resume: Prisma.JsonNull,
        parsed_resume_confirmed_at: null,
      },
    })

    // Note: In Stage 4, we'll trigger an Inngest event here to parse the resume asynchronously
    // For now, users will need to provide resume text directly for parsing

    return NextResponse.json({
      success: true,
      profile,
      message: 'Resume uploaded successfully. Please provide resume text for parsing.',
    })

  } catch (error) {
    console.error('POST /api/resume/upload error:', error)
    return NextResponse.json(
      { error: 'Failed to save resume upload' },
      { status: 500 }
    )
  }
}
