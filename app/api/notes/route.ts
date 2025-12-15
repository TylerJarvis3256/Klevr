import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createNoteSchema = z.object({
  applicationId: z.string().min(1),
  content: z.string().min(1).max(5000),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createNoteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { applicationId, content } = parsed.data

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        Job: {
          user_id: user.id,
        },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        application_id: applicationId,
        content,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
