import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Schema for validating the parsed resume structure
const parsedResumeSchema = z.object({
  personal: z.object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
  }),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    graduationDate: z.string().nullable().optional(),
    gpa: z.string().nullable().optional(),
  })),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    current: z.boolean(),
    bullets: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    technologies: z.array(z.string()),
    url: z.string().nullable().optional(),
  })),
  skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    tools: z.array(z.string()),
    other: z.array(z.string()),
  }),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  })),
})

const confirmSchema = z.object({
  parsed_resume: parsedResumeSchema,
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
    const parsed = confirmSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid resume data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { parsed_resume } = parsed.data

    // 3. Update profile with confirmed parsed resume
    const profile = await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        parsed_resume: parsed_resume as any,
        parsed_resume_confirmed_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        parsed_resume_confirmed_at: profile.parsed_resume_confirmed_at,
      },
    })

  } catch (error) {
    console.error('POST /api/resume/confirm error:', error)

    // Check if profile doesn't exist
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm resume' },
      { status: 500 }
    )
  }
}
