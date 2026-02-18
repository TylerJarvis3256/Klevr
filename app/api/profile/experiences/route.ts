import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const experienceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  is_current: z.boolean().optional(),
  description: z.string().optional(),
  key_metrics: z.string().optional(),
  display_order: z.number().optional(),
})

// GET /api/profile/experiences - List all experiences with bullets
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const experiences = await prisma.jobExperience.findMany({
      where: { user_id: user.id },
      include: {
        Bullets: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { display_order: 'asc' },
    })

    return NextResponse.json({ experiences })
  } catch (error) {
    console.error('GET /api/profile/experiences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profile/experiences - Create new experience
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = experienceSchema.parse(body)

    // Auto-set display_order if not provided
    let displayOrder = validatedData.display_order
    if (displayOrder === undefined) {
      const maxOrder = await prisma.jobExperience.findFirst({
        where: { user_id: user.id },
        orderBy: { display_order: 'desc' },
        select: { display_order: true },
      })
      displayOrder = (maxOrder?.display_order ?? -1) + 1
    }

    const experience = await prisma.jobExperience.create({
      data: {
        user_id: user.id,
        title: validatedData.title,
        company: validatedData.company,
        location: validatedData.location,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        is_current: validatedData.is_current ?? false,
        description: validatedData.description,
        key_metrics: validatedData.key_metrics,
        display_order: displayOrder,
      },
      include: {
        Bullets: true,
      },
    })

    return NextResponse.json({ experience }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('POST /api/profile/experiences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
