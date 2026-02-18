import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs before imports, so inline the mock creation
const { mockGeneratedDocument, mockDeleteFile } = vi.hoisted(() => {
  return {
    mockGeneratedDocument: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    mockDeleteFile: vi.fn(),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: { generatedDocument: mockGeneratedDocument },
}))

vi.mock('@/lib/s3', () => ({ deleteFile: mockDeleteFile }))

import { permanentlyDeleteDocument } from '../delete-document'

describe('permanentlyDeleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when document does not exist', async () => {
    mockGeneratedDocument.findUnique.mockResolvedValue(null)

    const result = await permanentlyDeleteDocument('nonexistent-id')

    expect(result).toEqual({ success: false, error: 'Document not found' })
    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockGeneratedDocument.delete).not.toHaveBeenCalled()
  })

  it('does not delete DB record when S3 deletion fails', async () => {
    mockGeneratedDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      storage_url: 'documents/app-1/resume-123.pdf',
    })
    mockDeleteFile.mockRejectedValue(new Error('S3 access denied'))

    const result = await permanentlyDeleteDocument('doc-1')

    expect(result).toEqual({
      success: false,
      error: 'S3 deletion failed: S3 access denied',
    })
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/resume-123.pdf')
    expect(mockGeneratedDocument.delete).not.toHaveBeenCalled()
  })

  it('deletes S3 object and DB record on success', async () => {
    mockGeneratedDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      storage_url: 'documents/app-1/resume-123.pdf',
    })
    mockDeleteFile.mockResolvedValue(undefined)
    mockGeneratedDocument.delete.mockResolvedValue({})

    const result = await permanentlyDeleteDocument('doc-1')

    expect(result).toEqual({
      success: true,
      data: { id: 'doc-1', storage_url: 'documents/app-1/resume-123.pdf' },
    })
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/resume-123.pdf')
    expect(mockGeneratedDocument.delete).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    })
  })

  it('returns error when DB deletion fails after S3 succeeds', async () => {
    mockGeneratedDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      storage_url: 'documents/app-1/resume-123.pdf',
    })
    mockDeleteFile.mockResolvedValue(undefined)
    mockGeneratedDocument.delete.mockRejectedValue(new Error('DB constraint violation'))

    const result = await permanentlyDeleteDocument('doc-1')

    expect(result).toEqual({
      success: false,
      error: 'DB deletion failed after S3 delete: DB constraint violation',
    })
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/resume-123.pdf')
    expect(mockGeneratedDocument.delete).toHaveBeenCalled()
  })
})
