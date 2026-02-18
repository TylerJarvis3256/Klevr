import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDownloadUrl } from '@/lib/s3'
import { deleteResumeUploadWithCleanup } from '@/lib/actions/delete-resume-upload'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const resume = await prisma.resumeUpload.findFirst({
    where: { id, user_id: user.id },
    select: { storage_url: true },
  })

  if (!resume || !resume.storage_url) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const downloadUrl = await generateDownloadUrl(resume.storage_url, 900)
  return NextResponse.json({ downloadUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const result = await deleteResumeUploadWithCleanup(id, user.id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
