import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(1000).or(z.literal('')).nullable().optional(),
  technologies: z.array(z.string().max(100)).max(50, 'Maximum 50 technologies').default([]),
  date_range: z.string().max(100).or(z.literal('')).nullable().optional(),
  url: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL',
    }),
  github_link: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL',
    }),
  display_order: z.number().int().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { user_id: user.id },
      orderBy: { display_order: 'asc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
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
    console.log('POST /api/profile/projects body:', JSON.stringify(body, null, 2))

    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Validation failed:', JSON.stringify(parsed.error.format(), null, 2))
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Normalize technologies array (trim, dedupe, remove empties)
    const uniqueTechs: string[] = []
    const seen = new Set<string>()
    for (const tech of parsed.data.technologies.map(t => t.trim()).filter(t => t)) {
      const lower = tech.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        uniqueTechs.push(tech)
      }
    }

    // Get max display_order
    const maxOrder = await prisma.project.aggregate({
      where: { user_id: user.id },
      _max: { display_order: true },
    })

    const project = await prisma.project.create({
      data: {
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        technologies: uniqueTechs,
        date_range: parsed.data.date_range || null,
        url: parsed.data.url || null,
        github_link: parsed.data.github_link || null,
        display_order: (maxOrder._max.display_order || 0) + 1,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
