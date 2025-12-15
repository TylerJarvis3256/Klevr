import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First verify the application belongs to the user
    const application = await prisma.application.findFirst({
      where: {
        id,
        user_id: user.id,
      },
      select: {
        job_id: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Delete the application (cascade will handle related records)
    await prisma.application.delete({
      where: { id },
    })

    // Optionally delete the job if there are no other applications for it
    const otherApplications = await prisma.application.count({
      where: { job_id: application.job_id },
    })

    if (otherApplications === 0) {
      await prisma.job.delete({
        where: { id: application.job_id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
