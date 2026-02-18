import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for creating/updating education
const educationSchema = z.object({
  school: z.string().min(1, 'School is required'),
  degree: z.string().min(1, 'Degree is required'),
  major: z.string().optional(),
  graduation_date: z.string().min(1, 'Graduation date is required'),
  gpa: z.string().optional(),
  location: z.string().optional(),
  relevant_coursework: z.array(z.string()).optional(),
  honors: z.array(z.string()).optional(),
  display_order: z.number().optional(),
})

// GET /api/profile/education - List all education entries
export async function GET(_req: NextRequest) {
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
    console.error('GET /api/profile/education error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profile/education - Create new education entry
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = educationSchema.parse(body)

    // If display_order not provided, set it to be last
    let displayOrder = validatedData.display_order
    if (displayOrder === undefined) {
      const maxOrder = await prisma.education.findFirst({
        where: { user_id: user.id },
        orderBy: { display_order: 'desc' },
        select: { display_order: true },
      })
      displayOrder = (maxOrder?.display_order ?? -1) + 1
    }

    const education = await prisma.education.create({
      data: {
        user_id: user.id,
        school: validatedData.school,
        degree: validatedData.degree,
        major: validatedData.major,
        graduation_date: validatedData.graduation_date,
        gpa: validatedData.gpa,
        location: validatedData.location,
        relevant_coursework: validatedData.relevant_coursework || [],
        honors: validatedData.honors || [],
        display_order: displayOrder,
      },
    })

    return NextResponse.json({ education }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('POST /api/profile/education error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
