import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateUploadUrl, generateResumeKey } from '@/lib/s3'
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '@/lib/s3'
import { importParsedResume } from '@/lib/resume-import'

const resumeUploadSchema = z.object({
  method: z.enum(['upload', 'paste']),
  // Upload method fields
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  s3Key: z.string().optional(),
  // Paste method fields
  resumeText: z.string().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumes = await prisma.resumeUpload.findMany({
      where: { user_id: user.id, deleted_at: null },
      orderBy: { uploaded_at: 'desc' },
    })

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = resumeUploadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { method, fileName, fileType, fileSize, s3Key, resumeText } = parsed.data

    if (method === 'upload') {
      if (s3Key) {
        // Step 2: File already uploaded to S3, process it
        if (!fileName || !fileType) {
          return NextResponse.json({ error: 'fileName and fileType required' }, { status: 400 })
        }

        // Download from S3 and extract text
        const { downloadFile } = await import('@/lib/s3')
        const fileBuffer = await downloadFile(s3Key)

        const { extractTextFromBuffer } = await import('@/lib/file-extractor')
        const extractedText = await extractTextFromBuffer(fileBuffer, fileType)

        if (!extractedText || extractedText.length < 50) {
          return NextResponse.json(
            { error: 'Could not extract sufficient text from file' },
            { status: 400 }
          )
        }

        // Parse resume text
        const { parseResumeText } = await import('@/lib/resume-parser')
        const parsedResume = await parseResumeText(extractedText)

        // Create ResumeUpload record
        await prisma.resumeUpload.create({
          data: {
            user_id: user.id,
            file_name: fileName,
            file_type: fileType,
            file_size: fileSize || 0,
            storage_url: s3Key,
            source: 'upload',
            parsed_at: new Date(),
            parsed_resume: parsedResume as object,
          },
        })

        // Import parsed data into structured records
        const summary = await importParsedResume(user.id, parsedResume)

        return NextResponse.json({ summary })
      } else {
        // Step 1: Generate presigned upload URL
        if (!fileName || !fileType) {
          return NextResponse.json(
            { error: 'fileName and fileType required for upload' },
            { status: 400 }
          )
        }

        if (!ALLOWED_MIME_TYPES.RESUME.includes(fileType)) {
          return NextResponse.json(
            { error: 'Only PDF and DOCX files are supported' },
            { status: 400 }
          )
        }

        if (fileSize && fileSize > FILE_SIZE_LIMITS.RESUME) {
          return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
        }

        const key = generateResumeKey(user.id, fileName)
        const uploadUrl = await generateUploadUrl(key, fileType, 300)

        return NextResponse.json({ uploadUrl, s3Key: key })
      }
    } else {
      // Paste flow
      if (!resumeText || resumeText.trim().length < 50) {
        return NextResponse.json(
          { error: 'Please paste at least 50 characters of resume text' },
          { status: 400 }
        )
      }

      // Parse resume text
      const { parseResumeText } = await import('@/lib/resume-parser')
      const parsedResume = await parseResumeText(resumeText)

      // Create ResumeUpload record
      await prisma.resumeUpload.create({
        data: {
          user_id: user.id,
          file_name: 'pasted-resume.txt',
          file_type: 'text/plain',
          file_size: Buffer.byteLength(resumeText, 'utf-8'),
          source: 'paste',
          parsed_at: new Date(),
          parsed_resume: parsedResume as object,
        },
      })

      // Import parsed data into structured records
      const summary = await importParsedResume(user.id, parsedResume)

      return NextResponse.json({ summary })
    }
  } catch (error) {
    console.error('Error processing resume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process resume' },
      { status: 500 }
    )
  }
}
