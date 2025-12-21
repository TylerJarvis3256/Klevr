import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseResumeText } from '@/lib/resume-parser'
import { generateUploadUrl, generateResumeKey, downloadFile } from '@/lib/s3'
import { extractTextFromBuffer } from '@/lib/file-extractor'
import { mergeStructuredDataFromParsedResume } from '@/lib/migrate-user-profile'
import { z } from 'zod'

const uploadResumeSchema = z.object({
  method: z.enum(['upload', 'paste']),
  // For upload method - step 1: get presigned URL
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  // For upload method - step 2: process uploaded file
  s3Key: z.string().optional(),
  // For paste method
  resumeText: z.string().min(50).optional(),
})

/**
 * GET /api/profile/resumes
 * List all non-deleted resumes for the current user
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query all non-deleted resumes, ordered by most recent first
    const resumes = await prisma.resumeUpload.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
      },
      orderBy: {
        uploaded_at: 'desc',
      },
      select: {
        id: true,
        file_name: true,
        file_type: true,
        file_size: true,
        uploaded_at: true,
        parsed_at: true,
        parsing_error: true,
        source: true,
      },
    })

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error('GET /api/profile/resumes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile/resumes
 * Upload and parse a new resume (supports both file upload and text paste)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = uploadResumeSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.flatten() },
        { status: 400 }
      )
    }

    const { method, fileName, fileType, fileSize, s3Key, resumeText } = validatedData.data

    // Method 1: File Upload
    if (method === 'upload') {
      // Step 2: Process file after upload to S3 (check FIRST)
      if (s3Key && fileName && fileType) {
        // Download file from S3
        const fileBuffer = await downloadFile(s3Key)

        // Extract text from file
        const extractedText = await extractTextFromBuffer(fileBuffer, fileType)

        if (!extractedText || extractedText.length < 50) {
          return NextResponse.json(
            { error: 'Could not extract sufficient text from file' },
            { status: 400 }
          )
        }

        // Parse resume with AI
        const parsedResume = await parseResumeText(extractedText)

        // Create ResumeUpload record
        const resumeUpload = await prisma.resumeUpload.create({
          data: {
            user_id: user.id,
            file_name: fileName,
            file_url: s3Key,
            file_type: fileType,
            file_size: fileSize || 0,
            uploaded_at: new Date(),
            parsed_at: new Date(),
            parsed_resume: parsedResume as any,
            source: 'PROFILE',
          },
        })

        // Merge data into structured profile
        const summary = await mergeStructuredDataFromParsedResume(user.id, parsedResume)

        return NextResponse.json({
          success: true,
          resumeUpload: {
            id: resumeUpload.id,
            file_name: resumeUpload.file_name,
            uploaded_at: resumeUpload.uploaded_at,
            parsed_at: resumeUpload.parsed_at,
          },
          summary,
        })
      }
      // Step 1: Generate presigned URL for client-side upload
      else if (fileName && fileType && fileSize) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]
        if (!allowedTypes.includes(fileType)) {
          return NextResponse.json(
            { error: 'Only PDF and DOCX files are supported' },
            { status: 400 }
          )
        }

        // Validate file size (5MB max)
        if (fileSize > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File size must be less than 5MB' },
            { status: 400 }
          )
        }

        // Check for duplicate (same filename and size)
        const existingResume = await prisma.resumeUpload.findFirst({
          where: {
            user_id: user.id,
            file_name: fileName,
            file_size: fileSize,
            deleted_at: null,
          },
        })

        if (existingResume) {
          return NextResponse.json(
            {
              error: 'This resume appears to already be uploaded',
              duplicate: true,
            },
            { status: 400 }
          )
        }

        // Generate S3 key and presigned upload URL
        const key = generateResumeKey(user.id, fileName)
        const uploadUrl = await generateUploadUrl(key, fileType, 300) // 5 minutes

        return NextResponse.json({
          uploadUrl,
          s3Key: key,
          message: 'Upload the file to the provided URL, then call this endpoint again with the s3Key',
        })
      }
      else {
        return NextResponse.json(
          { error: 'Missing required parameters for upload method' },
          { status: 400 }
        )
      }
    }

    // Method 2: Paste Text
    if (method === 'paste') {
      if (!resumeText) {
        return NextResponse.json(
          { error: 'Resume text is required for paste method' },
          { status: 400 }
        )
      }

      // Parse resume with AI
      const parsedResume = await parseResumeText(resumeText)

      // Create ResumeUpload record (no file)
      const resumeUpload = await prisma.resumeUpload.create({
        data: {
          user_id: user.id,
          file_name: 'Pasted Resume',
          file_url: '', // No file for pasted text
          file_type: 'text/plain',
          file_size: resumeText.length,
          uploaded_at: new Date(),
          parsed_at: new Date(),
          parsed_resume: parsedResume as any,
          source: 'PROFILE',
        },
      })

      // Merge data into structured profile
      const summary = await mergeStructuredDataFromParsedResume(user.id, parsedResume)

      return NextResponse.json({
        success: true,
        resumeUpload: {
          id: resumeUpload.id,
          file_name: resumeUpload.file_name,
          uploaded_at: resumeUpload.uploaded_at,
          parsed_at: resumeUpload.parsed_at,
        },
        summary,
      })
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/profile/resumes error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to process resume'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
