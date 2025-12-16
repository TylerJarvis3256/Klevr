import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).or(z.literal('')).nullable().optional(),
  technologies: z.array(z.string().max(100)).max(50).optional(),
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Normalize technologies if provided
    let normalizedTechs: string[] | undefined
    if (parsed.data.technologies) {
      const uniqueTechs: string[] = []
      const seen = new Set<string>()
      for (const tech of parsed.data.technologies.map(t => t.trim()).filter(t => t)) {
        const lower = tech.toLowerCase()
        if (!seen.has(lower)) {
          seen.add(lower)
          uniqueTechs.push(tech)
        }
      }
      normalizedTechs = uniqueTechs
    }

    const updated = await prisma.project.updateMany({
      where: {
        id,
        user_id: user.id,
      },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(normalizedTechs !== undefined && { technologies: normalizedTechs }),
        ...(parsed.data.date_range !== undefined && { date_range: parsed.data.date_range || null }),
        ...(parsed.data.url !== undefined && { url: parsed.data.url || null }),
        ...(parsed.data.github_link !== undefined && { github_link: parsed.data.github_link || null }),
        ...(parsed.data.display_order !== undefined && { display_order: parsed.data.display_order }),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deleted = await prisma.project.deleteMany({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
