import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { generateUploadUrl, generateResumeKey, ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '@/lib/s3'

const requestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  fileSize: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate input
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { filename, contentType, fileSize } = parsed.data

    // 3. Validate file type
    if (!ALLOWED_MIME_TYPES.RESUME.includes(contentType)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only PDF and DOCX files are allowed',
          allowed: ['PDF', 'DOCX'],
        },
        { status: 400 }
      )
    }

    // 4. Validate file size
    if (fileSize > FILE_SIZE_LIMITS.RESUME) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File size must be less than ${FILE_SIZE_LIMITS.RESUME / (1024 * 1024)} MB`,
          maxSize: FILE_SIZE_LIMITS.RESUME,
          maxSizeMB: FILE_SIZE_LIMITS.RESUME / (1024 * 1024),
        },
        { status: 400 }
      )
    }

    // 5. Generate S3 key and presigned URL
    const key = generateResumeKey(user.id, filename)
    const uploadUrl = await generateUploadUrl(key, contentType)

    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn: 300, // 5 minutes
    })

  } catch (error) {
    console.error('POST /api/upload/resume-url error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
