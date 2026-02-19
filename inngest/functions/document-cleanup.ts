import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { permanentlyDeleteDocument } from '@/lib/actions/delete-document'

const RETENTION_DAYS = 90

/**
 * Scheduled job to clean up expired generated documents.
 *
 * Schedule: Daily at 2:00 AM UTC
 * - Finds documents older than 90 days
 * - Deletes S3 objects and DB records for each
 * - Uses per-document steps for Inngest idempotency
 */
export const documentCleanupFunction = inngest.createFunction(
  {
    id: 'document-cleanup',
    name: 'Document Cleanup',
  },
  { cron: '0 2 * * *' }, // Daily at 2:00 AM UTC
  async ({ step, logger }) => {
    const expiredDocuments = await step.run('find-expired-documents', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

      return await prisma.generatedDocument.findMany({
        where: { created_at: { lt: cutoffDate } },
        select: { id: true, storage_url: true, application_id: true, type: true },
      })
    })

    logger.info(`Found ${expiredDocuments.length} expired documents to clean up`)

    if (expiredDocuments.length === 0) {
      return { message: 'No expired documents found', documentsDeleted: 0, documentsFailed: 0 }
    }

    let documentsDeleted = 0
    let documentsFailed = 0
    const errors: string[] = []

    for (const doc of expiredDocuments) {
      const result = await step.run(`delete-doc-${doc.id}`, async () => {
        return await permanentlyDeleteDocument(doc.id)
      })

      if (result.success) {
        documentsDeleted++
      } else {
        documentsFailed++
        errors.push(`${doc.id}: ${result.error}`)
        logger.error(`Failed to delete document ${doc.id}: ${result.error}`)
      }
    }

    return {
      message: 'Document cleanup completed',
      documentsDeleted,
      documentsFailed,
      errors,
    }
  }
)
