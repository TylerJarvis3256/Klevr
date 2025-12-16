import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logStatusChange } from '@/lib/activity-log'

const updateStatusSchema = z.object({
  status: z.enum(['PLANNED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const updateData: any = { status: newStatus }
    if (newStatus === 'APPLIED') {
      updateData.applied_at = new Date()
    }

    // Update the application
    await prisma.application.update({
      where: { id },
      data: updateData,
    })

    // Log status change if status actually changed
    if (oldStatus !== newStatus) {
      await logStatusChange(user.id, id, oldStatus, newStatus)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error updating application status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
