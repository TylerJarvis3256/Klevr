import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDownloadUrl } from '@/lib/s3'

/**
 * GET /api/profile/resumes/[id]
 * Generate a download URL for a resume file
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: resumeId } = await params

    // Find the resume and verify ownership
    const resume = await prisma.resumeUpload.findFirst({
      where: {
        id: resumeId,
        user_id: user.id,
        deleted_at: null,
      },
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Check if there's a file to download (pasted text has no file)
    if (!resume.file_url) {
      return NextResponse.json(
        { error: 'This resume has no file to download (it was pasted as text)' },
        { status: 400 }
      )
    }

    // Generate presigned download URL (valid for 15 minutes)
    const downloadUrl = await generateDownloadUrl(resume.file_url, 900)

    return NextResponse.json({
      downloadUrl,
      fileName: resume.file_name,
    })
  } catch (error) {
    console.error('GET /api/profile/resumes/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/resumes/[id]
 * Soft delete a resume (sets deleted_at timestamp)
 * NOTE: This does NOT delete structured data (Education, Experience, etc.)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: resumeId } = await params

    // Find the resume and verify ownership
    const resume = await prisma.resumeUpload.findFirst({
      where: {
        id: resumeId,
        user_id: user.id,
        deleted_at: null, // Can't delete already deleted resume
      },
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found or already deleted' },
        { status: 404 }
      )
    }

    // Soft delete the resume (set deleted_at timestamp)
    await prisma.resumeUpload.update({
      where: { id: resumeId },
      data: {
        deleted_at: new Date(),
      },
    })

    // Note: We do NOT delete structured data (Education, Experience, Projects, Bullets)
    // as specified in the requirements. The user's profile data is preserved.

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully. Your profile data has been preserved.',
    })
  } catch (error) {
    console.error('DELETE /api/profile/resumes/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    )
  }
}
