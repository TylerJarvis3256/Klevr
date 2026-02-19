import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createEducationSchema = z.object({
  school: z.string().min(1, 'School is required').max(200),
  degree: z.string().min(1, 'Degree is required').max(200),
  major: z.string().max(200).or(z.literal('')).nullable().optional(),
  graduation_date: z.string().min(1, 'Graduation date is required').max(100),
  gpa: z.string().max(10).or(z.literal('')).nullable().optional(),
  location: z.string().max(200).or(z.literal('')).nullable().optional(),
  relevant_coursework: z.array(z.string().max(200)).max(50).default([]),
  honors: z.array(z.string().max(200)).max(50).default([]),
  display_order: z.number().int().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const education = await prisma.education.findMany({
      where: { user_id: user.id },
      orderBy: { display_order: 'asc' },
    })

    return NextResponse.json({ education })
  } catch (error) {
    console.error('Error fetching education:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createEducationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.education.aggregate({
      where: { user_id: user.id },
      _max: { display_order: true },
    })

    const education = await prisma.education.create({
      data: {
        user_id: user.id,
        school: parsed.data.school,
        degree: parsed.data.degree,
        major: parsed.data.major || null,
        graduation_date: parsed.data.graduation_date,
        gpa: parsed.data.gpa || null,
        location: parsed.data.location || null,
        relevant_coursework: parsed.data.relevant_coursework,
        honors: parsed.data.honors,
        display_order: parsed.data.display_order ?? (maxOrder._max.display_order ?? -1) + 1,
      },
    })

    return NextResponse.json({ education }, { status: 201 })
  } catch (error) {
    console.error('Error creating education:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
