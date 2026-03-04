import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetSignedUrl } from '@/__tests__/helpers'

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = vi.fn()
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

import { GetObjectCommand } from '@aws-sdk/client-s3'
import { generateDownloadUrl } from '@/lib/s3'

describe('generateDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets disposition to "attachment" when no filename provided', async () => {
    await generateDownloadUrl('documents/abc/resume-123.pdf')

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment',
      })
    )
  })

  it('includes filename in Content-Disposition when provided', async () => {
    await generateDownloadUrl('documents/abc/resume-123.pdf', 900, 'Tyler Jarvis Resume.pdf')

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment; filename="Tyler Jarvis Resume.pdf"',
      })
    )
  })

  it('encodes special characters in filename', async () => {
    await generateDownloadUrl('key', 900, 'file%name.pdf')

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment; filename="file%25name.pdf"',
      })
    )
  })
})
