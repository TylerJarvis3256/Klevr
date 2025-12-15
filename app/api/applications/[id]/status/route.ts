import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
    const { status } = updateStatusSchema.parse(body)

    // Set applied_at timestamp when moving to APPLIED status
    const updateData: any = { status }
    if (status === 'APPLIED') {
      updateData.applied_at = new Date()
    }

    const application = await prisma.application.updateMany({
      where: {
        id,
        user_id: user.id,
      },
      data: updateData,
    })

    if (application.count === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
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
