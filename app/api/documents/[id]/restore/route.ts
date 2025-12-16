import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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

    // Restore (clear deleted_at)
    await prisma.generatedDocument.update({
      where: { id },
      data: { deleted_at: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error restoring document:', error)
    return NextResponse.json({ error: 'Failed to restore document' }, { status: 500 })
  }
}
