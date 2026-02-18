import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const bulletUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().min(0).max(5).optional(),
  is_favorite: z.boolean().optional(),
  ai_category: z.string().optional(),
  metrics: z
    .object({
      type: z.enum(['percentage', 'absolute']),
      value: z.number(),
    })
    .optional(),
})

// PATCH /api/profile/bullets/[id]
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()
    const validatedData = bulletUpdateSchema.parse(body)

    const existing = await prisma.bullet.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bullet not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bullet = await prisma.bullet.update({
      where: { id },
      data: validatedData,
      include: {
        JobExperience: {
          select: { id: true, title: true, company: true },
        },
        Project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ bullet })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('PATCH /api/profile/bullets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/bullets/[id]
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    const existing = await prisma.bullet.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bullet not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.bullet.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/profile/bullets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
