import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { suggestBullets } from '@/lib/bullet-enhancer'
import { z } from 'zod'

const suggestRequestSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
  experienceContext: z
    .object({
      title: z.string(),
      company: z.string(),
      description: z.string().optional(),
    })
    .optional(),
  projectContext: z
    .object({
      name: z.string(),
      description: z.string().optional(),
      technologies: z.array(z.string()),
    })
    .optional(),
})

// POST /api/profile/bullets/ai-suggest - Generate bullet suggestions
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = suggestRequestSchema.parse(body)

    // Generate suggestions
    const suggestions = await suggestBullets(user.id, {
      jobDescription: validatedData.jobDescription,
      experienceContext: validatedData.experienceContext,
      projectContext: validatedData.projectContext,
    })

    return NextResponse.json(suggestions)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('POST /api/profile/bullets/ai-suggest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
