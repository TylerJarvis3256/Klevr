import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logStatusChange } from '@/lib/activity-log'

const updateStatusSchema = z.object({
  status: z.enum(['PLANNED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status: newStatus } = updateStatusSchema.parse(body)

    // Fetch current application to get old status
    const currentApplication = await prisma.application.findFirst({
      where: {
        id,
        user_id: user.id,
      },
      select: {
        status: true,
      },
    })

    if (!currentApplication) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const oldStatus = currentApplication.status

    // Set applied_at timestamp when moving to APPLIED status
    const updateData: { status: typeof newStatus; applied_at?: Date } = { status: newStatus }
    if (newStatus === 'APPLIED') {
      updateData.applied_at = new Date()
    }

    // Update the application (include user_id to prevent TOCTOU)
    const result = await prisma.application.updateMany({
      where: { id, user_id: user.id },
      data: updateData,
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Log status change if status actually changed
    if (oldStatus !== newStatus) {
      await logStatusChange(user.id, id, oldStatus, newStatus)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error updating application status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
