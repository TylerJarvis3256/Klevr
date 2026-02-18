import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma } from '@/__tests__/helpers'

const { mockDeleteFile } = vi.hoisted(() => ({
  mockDeleteFile: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: createMockPrisma() }))
vi.mock('@/lib/s3', () => ({ deleteFile: mockDeleteFile }))

import { prisma } from '@/lib/prisma'
import { deleteResumeUploadWithCleanup } from '../delete-resume-upload'

const mockPrisma = prisma as unknown as ReturnType<typeof createMockPrisma>

describe('deleteResumeUploadWithCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when resume not found', async () => {
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(null)

    const result = await deleteResumeUploadWithCleanup('nonexistent', 'user-1')

    expect(result).toEqual({ success: false, error: 'Resume not found' })
    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockPrisma.resumeUpload.delete).not.toHaveBeenCalled()
  })

  it('returns error when resume belongs to a different user', async () => {
    // findFirst with user_id constraint returns null for wrong user
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(null)

    const result = await deleteResumeUploadWithCleanup('resume-1', 'wrong-user')

    expect(result).toEqual({ success: false, error: 'Resume not found' })
    expect(mockPrisma.resumeUpload.findFirst).toHaveBeenCalledWith({
      where: { id: 'resume-1', user_id: 'wrong-user' },
    })
  })

  it('deletes S3 file and DB record for file-uploaded resume', async () => {
    const resume = {
      id: 'resume-1',
      user_id: 'user-1',
      storage_url: 'resumes/user-1/123-test.pdf',
      file_name: 'test.pdf',
    }
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(resume)
    mockPrisma.resumeUpload.delete.mockResolvedValue(resume)
    mockPrisma.profile.findUnique.mockResolvedValue({ resume_file_url: 'other-key' })
    mockDeleteFile.mockResolvedValue(undefined)

    const result = await deleteResumeUploadWithCleanup('resume-1', 'user-1')

    expect(result).toEqual({ success: true, s3Deleted: true })
    expect(mockDeleteFile).toHaveBeenCalledWith('resumes/user-1/123-test.pdf')
    expect(mockPrisma.resumeUpload.delete).toHaveBeenCalledWith({ where: { id: 'resume-1' } })
  })

  it('skips S3 delete for pasted text resumes (storage_url is null)', async () => {
    const resume = {
      id: 'resume-2',
      user_id: 'user-1',
      storage_url: null,
      file_name: 'Pasted Resume',
    }
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(resume)
    mockPrisma.resumeUpload.delete.mockResolvedValue(resume)

    const result = await deleteResumeUploadWithCleanup('resume-2', 'user-1')

    expect(result).toEqual({ success: true, s3Deleted: false })
    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockPrisma.resumeUpload.delete).toHaveBeenCalledWith({ where: { id: 'resume-2' } })
  })

  it('continues with DB delete even if S3 fails', async () => {
    const resume = {
      id: 'resume-3',
      user_id: 'user-1',
      storage_url: 'resumes/user-1/123-fail.pdf',
      file_name: 'fail.pdf',
    }
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(resume)
    mockPrisma.resumeUpload.delete.mockResolvedValue(resume)
    mockPrisma.profile.findUnique.mockResolvedValue({ resume_file_url: 'other-key' })
    mockDeleteFile.mockRejectedValue(new Error('S3 error'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await deleteResumeUploadWithCleanup('resume-3', 'user-1')

    expect(result).toEqual({ success: true, s3Deleted: false })
    expect(mockPrisma.resumeUpload.delete).toHaveBeenCalledWith({ where: { id: 'resume-3' } })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('clears Profile resume fields when active resume is deleted', async () => {
    const s3Key = 'resumes/user-1/123-active.pdf'
    const resume = {
      id: 'resume-4',
      user_id: 'user-1',
      storage_url: s3Key,
      file_name: 'active.pdf',
    }
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(resume)
    mockPrisma.resumeUpload.delete.mockResolvedValue(resume)
    mockPrisma.profile.findUnique.mockResolvedValue({ resume_file_url: s3Key })
    mockPrisma.profile.update.mockResolvedValue({})
    mockDeleteFile.mockResolvedValue(undefined)

    const result = await deleteResumeUploadWithCleanup('resume-4', 'user-1')

    expect(result).toEqual({ success: true, s3Deleted: true })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
      data: {
        resume_file_url: null,
        resume_file_name: null,
        resume_uploaded_at: null,
      },
    })
  })

  it('does NOT clear Profile fields when a non-active resume is deleted', async () => {
    const resume = {
      id: 'resume-5',
      user_id: 'user-1',
      storage_url: 'resumes/user-1/123-old.pdf',
      file_name: 'old.pdf',
    }
    mockPrisma.resumeUpload.findFirst.mockResolvedValue(resume)
    mockPrisma.resumeUpload.delete.mockResolvedValue(resume)
    mockPrisma.profile.findUnique.mockResolvedValue({
      resume_file_url: 'resumes/user-1/456-current.pdf',
    })
    mockDeleteFile.mockResolvedValue(undefined)

    const result = await deleteResumeUploadWithCleanup('resume-5', 'user-1')

    expect(result).toEqual({ success: true, s3Deleted: true })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })
})
