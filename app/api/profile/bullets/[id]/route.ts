import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateBulletSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  priority: z.number().int().optional(),
  is_favorite: z.boolean().optional(),
  ai_category: z.string().max(100).nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateBulletSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.bullet.updateMany({
      where: { id, user_id: user.id },
      data: {
        ...(parsed.data.text !== undefined && { text: parsed.data.text }),
        ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
        ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
        ...(parsed.data.is_favorite !== undefined && { is_favorite: parsed.data.is_favorite }),
        ...(parsed.data.ai_category !== undefined && { ai_category: parsed.data.ai_category }),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Bullet not found' }, { status: 404 })
    }

    const bullet = await prisma.bullet.findFirst({
      where: { id, user_id: user.id },
    })

    return NextResponse.json({ bullet })
  } catch (error) {
    console.error('Error updating bullet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deleted = await prisma.bullet.deleteMany({
      where: { id, user_id: user.id },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Bullet not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bullet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
