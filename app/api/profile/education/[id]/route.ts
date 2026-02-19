import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateEducationSchema = z.object({
  school: z.string().min(1).max(200).optional(),
  degree: z.string().min(1).max(200).optional(),
  major: z.string().max(200).or(z.literal('')).nullable().optional(),
  graduation_date: z.string().min(1).max(100).optional(),
  gpa: z.string().max(10).or(z.literal('')).nullable().optional(),
  location: z.string().max(200).or(z.literal('')).nullable().optional(),
  relevant_coursework: z.array(z.string().max(200)).max(50).optional(),
  honors: z.array(z.string().max(200)).max(50).optional(),
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
    const parsed = updateEducationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.education.updateMany({
      where: { id, user_id: user.id },
      data: {
        ...(parsed.data.school !== undefined && { school: parsed.data.school }),
        ...(parsed.data.degree !== undefined && { degree: parsed.data.degree }),
        ...(parsed.data.major !== undefined && { major: parsed.data.major || null }),
        ...(parsed.data.graduation_date !== undefined && {
          graduation_date: parsed.data.graduation_date,
        }),
        ...(parsed.data.gpa !== undefined && { gpa: parsed.data.gpa || null }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location || null }),
        ...(parsed.data.relevant_coursework !== undefined && {
          relevant_coursework: parsed.data.relevant_coursework,
        }),
        ...(parsed.data.honors !== undefined && { honors: parsed.data.honors }),
        ...(parsed.data.display_order !== undefined && {
          display_order: parsed.data.display_order,
        }),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Education not found' }, { status: 404 })
    }

    const education = await prisma.education.findFirst({
      where: { id, user_id: user.id },
    })

    return NextResponse.json({ education })
  } catch (error) {
    console.error('Error updating education:', error)
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

    const deleted = await prisma.education.deleteMany({
      where: { id, user_id: user.id },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Education not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting education:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
