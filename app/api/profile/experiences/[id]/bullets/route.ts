import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createBulletSchema = z.object({
  text: z.string().min(1, 'Bullet text is required').max(500),
  tags: z.array(z.string().max(50)).max(10).default([]),
  priority: z.number().int().optional(),
  is_favorite: z.boolean().default(false),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experienceId } = await params

    // Verify the experience belongs to the user
    const experience = await prisma.jobExperience.findFirst({
      where: { id: experienceId, user_id: user.id },
    })

    if (!experience) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = createBulletSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const maxPriority = await prisma.bullet.aggregate({
      where: { experience_id: experienceId, user_id: user.id },
      _max: { priority: true },
    })

    const bullet = await prisma.bullet.create({
      data: {
        user_id: user.id,
        experience_id: experienceId,
        text: parsed.data.text,
        tags: parsed.data.tags,
        priority: parsed.data.priority ?? (maxPriority._max.priority ?? -1) + 1,
        is_favorite: parsed.data.is_favorite,
      },
    })

    return NextResponse.json({ bullet }, { status: 201 })
  } catch (error) {
    console.error('Error creating experience bullet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
