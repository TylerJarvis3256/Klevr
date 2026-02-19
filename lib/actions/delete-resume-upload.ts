import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'

interface DeleteResult {
  success: true
  s3Deleted: boolean
}

interface DeleteError {
  success: false
  error: string
}

/**
 * Delete a resume upload with full S3 cleanup.
 * Removes the S3 file (if present), deletes the DB record,
 * and clears Profile resume fields if this was the active resume.
 */
export async function deleteResumeUploadWithCleanup(
  resumeUploadId: string,
  userId: string
): Promise<DeleteResult | DeleteError> {
  const resume = await prisma.resumeUpload.findFirst({
    where: { id: resumeUploadId, user_id: userId },
  })

  if (!resume) {
    return { success: false, error: 'Resume not found' }
  }

  // Delete S3 file if present (pasted text resumes have no storage_url)
  let s3Deleted = false
  if (resume.storage_url) {
    try {
      await deleteFile(resume.storage_url)
      s3Deleted = true
    } catch (error) {
      console.error(`Failed to delete S3 file for resume ${resume.id}:`, error)
      // Continue with DB cleanup even if S3 fails
    }
  }

  // Delete the DB record
  await prisma.resumeUpload.delete({
    where: { id: resumeUploadId },
  })

  // If Profile.resume_file_url matches this resume's S3 key, clear resume fields
  if (resume.storage_url) {
    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
      select: { resume_file_url: true },
    })

    if (profile?.resume_file_url === resume.storage_url) {
      await prisma.profile.update({
        where: { user_id: userId },
        data: {
          resume_file_url: null,
          resume_file_name: null,
          resume_uploaded_at: null,
        },
      })
    }
  }

  return { success: true, s3Deleted }
}
