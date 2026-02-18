import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateDownloadUrl, deleteFile } from '@/lib/s3'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const resume = await prisma.resumeUpload.findFirst({
      where: { id, user_id: user.id, deleted_at: null },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (!resume.storage_url) {
      return NextResponse.json({ error: 'No file available for download' }, { status: 404 })
    }

    const downloadUrl = await generateDownloadUrl(resume.storage_url)

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error('Error getting resume download URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const resume = await prisma.resumeUpload.findFirst({
      where: { id, user_id: user.id, deleted_at: null },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Delete from S3 if file exists
    if (resume.storage_url) {
      try {
        await deleteFile(resume.storage_url)
      } catch {
        // S3 delete failures are non-fatal
        console.error('Failed to delete S3 file:', resume.storage_url)
      }
    }

    // Soft delete the record
    await prisma.resumeUpload.update({
      where: { id },
      data: { deleted_at: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
