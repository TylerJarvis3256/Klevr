import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function DELETE(
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

    // Soft delete (mark as deleted)
    await prisma.generatedDocument.update({
      where: { id },
      data: { deleted_at: new Date() },
    })

    // Log document deleted
    await logActivity({
      user_id: user.id,
      application_id: document.application_id,
      type: 'DOCUMENT_DELETED',
      metadata: {
        document_id: document.id,
        document_type: document.type,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
