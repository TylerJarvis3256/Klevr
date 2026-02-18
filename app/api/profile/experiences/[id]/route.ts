import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const experienceUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  location: z.string().optional(),
  start_date: z.string().min(1).optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().optional(),
  description: z.string().optional(),
  key_metrics: z.string().optional(),
  display_order: z.number().optional(),
})

// PATCH /api/profile/experiences/[id]
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()
    const validatedData = experienceUpdateSchema.parse(body)

    const existing = await prisma.jobExperience.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const experience = await prisma.jobExperience.update({
      where: { id },
      data: validatedData,
      include: { Bullets: true },
    })

    return NextResponse.json({ experience })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('PATCH /api/profile/experiences/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/experiences/[id]
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    const existing = await prisma.jobExperience.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Bullets will be cascade deleted
    await prisma.jobExperience.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/profile/experiences/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
