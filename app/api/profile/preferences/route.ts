import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const preferencesSchema = z.object({
  job_types: z.array(z.string()).min(1, 'Select at least one job type'),
  preferred_locations: z.array(z.string()).min(1, 'Add at least one location'),
})

export type PreferencesInput = z.infer<typeof preferencesSchema>

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate input
    const body = await req.json()
    const parsed = preferencesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { job_types, preferred_locations } = parsed.data

    // 3. Update profile (must exist from basics step)
    const profile = await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        job_types,
        preferred_locations,
      },
    })

    return NextResponse.json(profile, { status: 200 })
  } catch (error) {
    console.error('POST /api/profile/preferences error:', error)

    // Check if profile doesn't exist
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Profile not found. Please complete the basics step first.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
