import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'

interface DeleteResult {
  success: true
  s3FilesDeleted: number
  s3FilesFailed: number
}

interface DeleteError {
  success: false
  error: string
}

/**
 * Delete an application with full S3 cleanup.
 * Removes S3 files for generated documents before cascade-deleting the application,
 * then cleans up orphan jobs with no remaining applications.
 */
export async function deleteApplicationWithCleanup(
  applicationId: string
): Promise<DeleteResult | DeleteError> {
  // Fetch application with its generated documents and job reference
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      job_id: true,
      GeneratedDocument: {
        select: { id: true, storage_url: true },
      },
    },
  })

  if (!application) {
    return { success: false, error: 'Application not found' }
  }

  // Delete S3 files for each generated document
  let s3FilesDeleted = 0
  let s3FilesFailed = 0

  for (const doc of application.GeneratedDocument) {
    if (doc.storage_url) {
      try {
        await deleteFile(doc.storage_url)
        s3FilesDeleted++
      } catch (error) {
        s3FilesFailed++
        console.error(`Failed to delete S3 file for document ${doc.id}:`, error)
      }
    }
  }

  // Delete the application (cascade handles GeneratedDocument, Note, AiTask, ActivityLog)
  await prisma.application.delete({
    where: { id: applicationId },
  })

  // Clean up orphan job if no other applications reference it
  const otherApplications = await prisma.application.count({
    where: { job_id: application.job_id },
  })

  if (otherApplications === 0) {
    await prisma.job.delete({
      where: { id: application.job_id },
    })
  }

  return { success: true, s3FilesDeleted, s3FilesFailed }
}
