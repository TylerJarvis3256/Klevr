import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const basicsSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  school: z.string().min(1, 'School is required').max(200),
  major: z.string().min(1, 'Major is required').max(200),
  graduation_year: z.coerce.number().int().min(2020).max(2035, 'Invalid graduation year'),
})

export type BasicsInput = z.infer<typeof basicsSchema>

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate input
    const body = await req.json()
    const parsed = basicsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { full_name, school, major, graduation_year } = parsed.data

    // 3. Upsert profile
    const profile = await prisma.profile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        full_name,
        school,
        major,
        graduation_year,
      },
      update: {
        full_name,
        school,
        major,
        graduation_year,
      },
    })

    return NextResponse.json(profile, { status: 200 })
  } catch (error) {
    console.error('POST /api/profile/basics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
