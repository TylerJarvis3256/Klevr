import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { name } = await request.json()

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    if (name.length > 200) {
      return NextResponse.json({ error: 'Name too long (max 200 characters)' }, { status: 400 })
    }

    // Verify document belongs to user
    const document = await prisma.generatedDocument.findFirst({
      where: {
        id,
        Application: {
          user_id: user.id,
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update display name
    await prisma.generatedDocument.update({
      where: { id },
      data: { display_name: name.trim() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error renaming document:', error)
    return NextResponse.json({ error: 'Failed to rename document' }, { status: 500 })
  }
}
