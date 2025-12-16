import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: applicationId } = await params

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        user_id: user.id,
      },
      select: {
        id: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Fetch activity logs for this application
    const activities = await prisma.activityLog.findMany({
      where: {
        application_id: applicationId,
      },
      orderBy: {
        created_at: 'desc', // Newest first
      },
      select: {
        id: true,
        type: true,
        metadata: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      activities,
      total: activities.length,
    })
  } catch (error) {
    console.error('Error fetching application timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    )
  }
}
