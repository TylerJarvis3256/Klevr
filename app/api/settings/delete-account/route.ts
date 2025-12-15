import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = deleteAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid confirmation text', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Delete user (cascade will delete all related data)
    // Note: In production, consider soft-delete with deleted_at timestamp
    // and schedule cleanup after 30 days
    await prisma.user.delete({
      where: { id: user.id },
    })

    // TODO: Delete Auth0 user via Management API
    // This requires additional setup with Auth0 Management API credentials

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error: any) {
    console.error('POST /api/settings/delete-account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
