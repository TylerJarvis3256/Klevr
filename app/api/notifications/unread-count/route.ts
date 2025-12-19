import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications/unread-count
 *
 * Quick endpoint to get unread notification count for badge
 */
export async function GET(_request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unreadCount = await prisma.notification.count({
      where: {
        user_id: user.id,
        read_at: null,
      },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    // Check if this is a JSON parsing error from malformed session
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.warn('Notification count: Malformed session detected, treating as unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log unexpected errors
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
