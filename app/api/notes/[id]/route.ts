import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateNoteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content } = parsed.data

    // Verify user owns the note (through application)
    const note = await prisma.note.findFirst({
      where: {
        id,
        Application: {
          Job: {
            user_id: user.id,
          },
        },
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: { content },
    })

    return NextResponse.json(updatedNote)
  } catch (error: any) {
    console.error('PATCH /api/notes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify user owns the note (through application)
    const note = await prisma.note.findFirst({
      where: {
        id,
        Application: {
          Job: {
            user_id: user.id,
          },
        },
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Delete note
    await prisma.note.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/notes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
