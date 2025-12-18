import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/notifications/mark-all-read
 *
 * Mark all user's notifications as read
 */
export async function POST(_request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        user_id: user.id,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      markedCount: result.count,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
