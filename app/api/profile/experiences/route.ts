import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createExperienceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  company: z.string().min(1, 'Company is required').max(200),
  location: z.string().max(200).or(z.literal('')).nullable().optional(),
  start_date: z.string().min(1, 'Start date is required').max(100),
  end_date: z.string().max(100).or(z.literal('')).nullable().optional(),
  is_current: z.boolean().default(false),
  description: z.string().max(2000).or(z.literal('')).nullable().optional(),
  key_metrics: z.string().max(1000).or(z.literal('')).nullable().optional(),
  display_order: z.number().int().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const experiences = await prisma.jobExperience.findMany({
      where: { user_id: user.id },
      include: { Bullets: { orderBy: { priority: 'asc' } } },
      orderBy: { display_order: 'asc' },
    })

    return NextResponse.json({ experiences })
  } catch (error) {
    console.error('Error fetching experiences:', error)
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
    const parsed = createExperienceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.jobExperience.aggregate({
      where: { user_id: user.id },
      _max: { display_order: true },
    })

    const experience = await prisma.jobExperience.create({
      data: {
        user_id: user.id,
        title: parsed.data.title,
        company: parsed.data.company,
        location: parsed.data.location || null,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date || null,
        is_current: parsed.data.is_current,
        description: parsed.data.description || null,
        key_metrics: parsed.data.key_metrics || null,
        display_order: parsed.data.display_order ?? (maxOrder._max.display_order ?? -1) + 1,
      },
      include: { Bullets: true },
    })

    return NextResponse.json({ experience }, { status: 201 })
  } catch (error) {
    console.error('Error creating experience:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
