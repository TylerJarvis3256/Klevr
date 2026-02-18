import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for updating education
const educationUpdateSchema = z.object({
  school: z.string().min(1).optional(),
  degree: z.string().min(1).optional(),
  major: z.string().optional(),
  graduation_date: z.string().min(1).optional(),
  gpa: z.string().optional(),
  location: z.string().optional(),
  relevant_coursework: z.array(z.string()).optional(),
  honors: z.array(z.string()).optional(),
  display_order: z.number().optional(),
})

// PATCH /api/profile/education/[id] - Update education entry
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()
    const validatedData = educationUpdateSchema.parse(body)

    // Verify ownership
    const existing = await prisma.education.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Education entry not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update
    const education = await prisma.education.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({ education })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('PATCH /api/profile/education/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/education/[id] - Delete education entry
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    // Verify ownership
    const existing = await prisma.education.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Education entry not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete
    await prisma.education.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/profile/education/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
