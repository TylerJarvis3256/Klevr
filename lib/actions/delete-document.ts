import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'

type DeleteResult =
  | { success: true; data: { id: string; storage_url: string } }
  | { success: false; error: string }

/**
 * Permanently delete a generated document from S3 and the database.
 * S3 deletion happens first - if it fails, the DB record is preserved.
 */
export async function permanentlyDeleteDocument(documentId: string): Promise<DeleteResult> {
  const document = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
    select: { id: true, storage_url: true },
  })

  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  // Delete from S3 first - if this fails, we keep the DB record
  try {
    await deleteFile(document.storage_url)
  } catch (error) {
    return {
      success: false,
      error: `S3 deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  // S3 succeeded - now delete DB record
  try {
    await prisma.generatedDocument.delete({
      where: { id: documentId },
    })
  } catch (error) {
    return {
      success: false,
      error: `DB deletion failed after S3 delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  return { success: true, data: { id: document.id, storage_url: document.storage_url } }
}
