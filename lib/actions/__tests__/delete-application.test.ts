import { describe, it, expect, vi, beforeEach } from 'vitest'

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  }
}

const { mockPrisma, mockDeleteFile } = vi.hoisted(() => {
  const mockDeleteFile = vi.fn()
  const mockPrisma = {
    application: createModelMock(),
    job: createModelMock(),
    generatedDocument: createModelMock(),
  }
  return { mockPrisma, mockDeleteFile }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/s3', () => ({ deleteFile: mockDeleteFile }))

import { deleteApplicationWithCleanup } from '../delete-application'

describe('deleteApplicationWithCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when application not found', async () => {
    mockPrisma.application.findUnique.mockResolvedValue(null)

    const result = await deleteApplicationWithCleanup('non-existent-id')

    expect(result).toEqual({ success: false, error: 'Application not found' })
    expect(mockPrisma.application.delete).not.toHaveBeenCalled()
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it('deletes S3 files before cascade-deleting application', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      job_id: 'job-1',
      GeneratedDocument: [
        { id: 'doc-1', storage_url: 'documents/app-1/resume-123.pdf' },
        { id: 'doc-2', storage_url: 'documents/app-1/cover-letter-456.pdf' },
      ],
    })
    mockDeleteFile.mockResolvedValue(undefined)
    mockPrisma.application.delete.mockResolvedValue({})
    mockPrisma.application.count.mockResolvedValue(0)
    mockPrisma.job.delete.mockResolvedValue({})

    const result = await deleteApplicationWithCleanup('app-1')

    expect(mockDeleteFile).toHaveBeenCalledTimes(2)
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/resume-123.pdf')
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/cover-letter-456.pdf')
    expect(mockPrisma.application.delete).toHaveBeenCalledWith({
      where: { id: 'app-1' },
    })
    expect(result).toEqual({ success: true, s3FilesDeleted: 2, s3FilesFailed: 0 })
  })

  it('continues with application delete even if S3 file delete fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      job_id: 'job-1',
      GeneratedDocument: [
        { id: 'doc-1', storage_url: 'documents/app-1/resume-123.pdf' },
        { id: 'doc-2', storage_url: 'documents/app-1/cover-letter-456.pdf' },
      ],
    })
    mockDeleteFile
      .mockRejectedValueOnce(new Error('S3 access denied'))
      .mockResolvedValueOnce(undefined)
    mockPrisma.application.delete.mockResolvedValue({})
    mockPrisma.application.count.mockResolvedValue(1)

    const result = await deleteApplicationWithCleanup('app-1')

    expect(mockPrisma.application.delete).toHaveBeenCalledWith({
      where: { id: 'app-1' },
    })
    expect(result).toEqual({ success: true, s3FilesDeleted: 1, s3FilesFailed: 1 })
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to delete S3 file for document doc-1:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('cleans up orphan job when no other applications reference it', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      job_id: 'job-1',
      GeneratedDocument: [],
    })
    mockPrisma.application.delete.mockResolvedValue({})
    mockPrisma.application.count.mockResolvedValue(0)
    mockPrisma.job.delete.mockResolvedValue({})

    await deleteApplicationWithCleanup('app-1')

    expect(mockPrisma.application.count).toHaveBeenCalledWith({
      where: { job_id: 'job-1' },
    })
    expect(mockPrisma.job.delete).toHaveBeenCalledWith({
      where: { id: 'job-1' },
    })
  })

  it('does NOT delete job when other applications still reference it', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      job_id: 'job-1',
      GeneratedDocument: [],
    })
    mockPrisma.application.delete.mockResolvedValue({})
    mockPrisma.application.count.mockResolvedValue(2)

    await deleteApplicationWithCleanup('app-1')

    expect(mockPrisma.application.count).toHaveBeenCalledWith({
      where: { job_id: 'job-1' },
    })
    expect(mockPrisma.job.delete).not.toHaveBeenCalled()
  })

  it('skips S3 delete for documents with no storage_url', async () => {
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      job_id: 'job-1',
      GeneratedDocument: [
        { id: 'doc-1', storage_url: null },
        { id: 'doc-2', storage_url: 'documents/app-1/resume-123.pdf' },
      ],
    })
    mockDeleteFile.mockResolvedValue(undefined)
    mockPrisma.application.delete.mockResolvedValue({})
    mockPrisma.application.count.mockResolvedValue(0)
    mockPrisma.job.delete.mockResolvedValue({})

    const result = await deleteApplicationWithCleanup('app-1')

    expect(mockDeleteFile).toHaveBeenCalledTimes(1)
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/app-1/resume-123.pdf')
    expect(result).toEqual({ success: true, s3FilesDeleted: 1, s3FilesFailed: 0 })
  })
})
