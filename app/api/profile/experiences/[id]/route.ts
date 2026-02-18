import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateExperienceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(200).or(z.literal('')).nullable().optional(),
  start_date: z.string().min(1).max(100).optional(),
  end_date: z.string().max(100).or(z.literal('')).nullable().optional(),
  is_current: z.boolean().optional(),
  description: z.string().max(2000).or(z.literal('')).nullable().optional(),
  key_metrics: z.string().max(1000).or(z.literal('')).nullable().optional(),
  display_order: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateExperienceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.jobExperience.updateMany({
      where: { id, user_id: user.id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.company !== undefined && { company: parsed.data.company }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location || null }),
        ...(parsed.data.start_date !== undefined && { start_date: parsed.data.start_date }),
        ...(parsed.data.end_date !== undefined && { end_date: parsed.data.end_date || null }),
        ...(parsed.data.is_current !== undefined && { is_current: parsed.data.is_current }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description || null,
        }),
        ...(parsed.data.key_metrics !== undefined && {
          key_metrics: parsed.data.key_metrics || null,
        }),
        ...(parsed.data.display_order !== undefined && {
          display_order: parsed.data.display_order,
        }),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const experience = await prisma.jobExperience.findFirst({
      where: { id, user_id: user.id },
      include: { Bullet: { orderBy: { priority: 'desc' } } },
    })

    return NextResponse.json({ experience })
  } catch (error) {
    console.error('Error updating experience:', error)
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

    const deleted = await prisma.jobExperience.deleteMany({
      where: { id, user_id: user.id },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting experience:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
