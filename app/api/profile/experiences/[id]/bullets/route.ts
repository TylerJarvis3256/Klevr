import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createBulletSchema = z.object({
  text: z.string().min(1, 'Text is required').max(2000),
  tags: z.array(z.string().max(100)).max(20).default([]),
  priority: z.number().int().min(0).max(10).default(0),
  is_favorite: z.boolean().default(false),
  ai_category: z.string().max(100).nullable().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify experience ownership
    const experience = await prisma.jobExperience.findFirst({
      where: { id, user_id: user.id },
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

    const bullet = await prisma.bullet.create({
      data: {
        user_id: user.id,
        experience_id: id,
        project_id: null,
        text: parsed.data.text,
        tags: parsed.data.tags,
        priority: parsed.data.priority,
        is_favorite: parsed.data.is_favorite,
        ai_category: parsed.data.ai_category || null,
      },
    })

    return NextResponse.json({ bullet }, { status: 201 })
  } catch (error) {
    console.error('Error creating experience bullet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
