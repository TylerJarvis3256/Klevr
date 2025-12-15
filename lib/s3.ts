import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const S3_BUCKET = process.env.AWS_S3_BUCKET!

// File size limits
export const FILE_SIZE_LIMITS = {
  RESUME: 5 * 1024 * 1024, // 5 MB
  GENERATED_DOCUMENT: 10 * 1024 * 1024, // 10 MB
}

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  RESUME: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
  GENERATED: [
    'application/pdf',
  ],
}

/**
 * Generate a presigned URL for uploading a file
 */
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Upload a buffer directly to S3 (for generated documents)
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Generate a unique S3 key for a resume file
 */
export function generateResumeKey(userId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `resumes/${userId}/${timestamp}-${sanitized}`
}

/**
 * Generate a unique S3 key for a generated document
 */
export function generateDocumentKey(
  applicationId: string,
  type: 'resume' | 'cover-letter',
  timestamp: number = Date.now()
): string {
  return `documents/${applicationId}/${type}-${timestamp}.pdf`
}
