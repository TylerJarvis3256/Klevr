import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    // 1. Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user with profile
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        Profile: true,
      },
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        auth0_id: userData.auth0_id,
        created_at: userData.created_at,
      },
      profile: userData.Profile,
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
