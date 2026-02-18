import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { enhanceBullet } from '@/lib/bullet-enhancer'
import { z } from 'zod'

const enhanceRequestSchema = z.object({
  jobDescription: z.string().optional(),
  context: z
    .object({
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      skills: z.array(z.string()).optional(),
    })
    .optional(),
})

// POST /api/profile/bullets/[id]/ai-enhance - Enhance existing bullet with AI
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()
    const validatedData = enhanceRequestSchema.parse(body)

    // Verify bullet ownership
    const bullet = await prisma.bullet.findUnique({
      where: { id },
      include: {
        JobExperience: {
          select: { title: true, company: true },
        },
      },
    })

    if (!bullet) {
      return NextResponse.json({ error: 'Bullet not found' }, { status: 404 })
    }

    if (bullet.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Enhance the bullet
    const enhanced = await enhanceBullet(user.id, {
      bulletText: bullet.text,
      jobDescription: validatedData.jobDescription,
      context: validatedData.context || {
        jobTitle: bullet.JobExperience?.title,
        companyName: bullet.JobExperience?.company,
      },
    })

    // Optionally auto-update the bullet with enhanced version
    // For now, just return the suggestion
    return NextResponse.json({ enhanced })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('POST /api/profile/bullets/[id]/ai-enhance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
