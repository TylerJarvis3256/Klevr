import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Extract text from a PDF buffer (server-side)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Convert Buffer to Uint8Array for unpdf
    const uint8Array = new Uint8Array(buffer)

    // Load PDF document
    const pdf = await getDocumentProxy(uint8Array)

    // Extract text with merged pages
    const { text } = await extractText(pdf, { mergePages: true })

    // Validate extracted text
    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract sufficient text from PDF')
    }

    return text.trim()
  } catch (error) {
    // Provide helpful error message for scanned PDFs or extraction failures
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      'Failed to extract text from PDF. This might be a scanned PDF (image-based) or the PDF may be corrupted. ' +
        'Please try:\n' +
        '1. Copy text from your PDF and use "Paste Text" option\n' +
        '2. Save your resume as DOCX format\n' +
        '3. Convert to text-based PDF using Adobe Acrobat\n\n' +
        `Technical details: ${errorMessage}`
    )
  }
}

/**
 * Extract text from a DOCX buffer (server-side)
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}

/**
 * Extract text from a file buffer based on content type
 * @param buffer - File buffer
 * @param contentType - MIME type of the file
 * @returns Extracted text content
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (contentType === 'application/pdf') {
    return extractTextFromPDF(buffer)
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDOCX(buffer)
  } else {
    throw new Error(
      `Unsupported file type: ${contentType}. Please upload a PDF or DOCX file, or paste text directly.`
    )
  }
}
