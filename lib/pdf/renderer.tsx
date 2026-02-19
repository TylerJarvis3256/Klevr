import { markdownToHtml } from './markdown-to-html'
import { htmlToPdf } from './html-to-pdf'

/**
 * Render a resume PDF from markdown (V3 pipeline).
 * Converts markdown -> HTML -> PDF via headless Chromium.
 */
export async function renderResumePDF(markdown: string): Promise<Buffer> {
  const html = markdownToHtml(markdown)
  return htmlToPdf(html)
}

/**
 * Render a cover letter PDF from markdown (V2 pipeline).
 * Uses the same markdown -> HTML -> PDF pipeline as resumes,
 * with an optional cover-letter CSS variant.
 */
export async function renderCoverLetterPDFv2(markdown: string): Promise<Buffer> {
  const html = markdownToHtml(markdown, { variant: 'cover-letter' })
  return htmlToPdf(html)
}
