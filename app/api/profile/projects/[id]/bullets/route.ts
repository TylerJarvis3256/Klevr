import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulletSchema = z.object({
  text: z.string().min(1, 'Bullet text is required').max(500),
  tags: z.array(z.string()).optional(),
  priority: z.number().optional(),
  is_favorite: z.boolean().optional(),
  ai_category: z.string().optional(),
  metrics: z
    .object({
      type: z.enum(['percentage', 'absolute']),
      value: z.number(),
    })
    .optional(),
})

// POST /api/profile/projects/[id]/bullets - Create a bullet for a project
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const projectId = params.id
    const body = await req.json()
    const validatedData = bulletSchema.parse(body)

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create bullet
    const bullet = await prisma.bullet.create({
      data: {
        user_id: user.id,
        project_id: projectId,
        text: validatedData.text,
        tags: validatedData.tags || [],
        priority: validatedData.priority ?? 0,
        is_favorite: validatedData.is_favorite ?? false,
        ai_category: validatedData.ai_category,
        metrics: validatedData.metrics,
      },
    })

    return NextResponse.json({ bullet }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('POST /api/profile/projects/[id]/bullets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
