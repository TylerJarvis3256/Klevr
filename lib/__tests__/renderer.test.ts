import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the html-to-pdf module (puppeteer/chromium pipeline)
vi.mock('@/lib/pdf/html-to-pdf', () => ({
  htmlToPdf: vi.fn().mockResolvedValue(Buffer.from('mock-chromium-pdf')),
}))

// Mock the markdown-to-html module
vi.mock('@/lib/pdf/markdown-to-html', () => ({
  markdownToHtml: vi.fn((md: string) => `<html>${md}</html>`),
}))

import { renderResumePDF, renderCoverLetterPDFv2 } from '@/lib/pdf/renderer'
import { markdownToHtml } from '@/lib/pdf/markdown-to-html'
import { htmlToPdf } from '@/lib/pdf/html-to-pdf'

const mockMarkdown = `# John Doe
john@example.com | (555) 123-4567

## EXPERIENCE

**Software Engineer**
*Acme Corp* | Jan 2023 - Present

- Built features
`

describe('renderResumePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts markdown to HTML then to PDF', async () => {
    const buffer = await renderResumePDF(mockMarkdown)

    expect(markdownToHtml).toHaveBeenCalledWith(mockMarkdown)
    expect(htmlToPdf).toHaveBeenCalledWith(`<html>${mockMarkdown}</html>`)
    expect(buffer).toBeInstanceOf(Buffer)
  })

  it('returns a Buffer', async () => {
    const buffer = await renderResumePDF(mockMarkdown)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.toString()).toBe('mock-chromium-pdf')
  })
})

describe('renderCoverLetterPDFv2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts markdown to HTML with cover-letter variant then to PDF', async () => {
    const clMarkdown = '# Jane Doe\njane@test.com\n\nDear Hiring Manager...'
    const buffer = await renderCoverLetterPDFv2(clMarkdown)

    expect(markdownToHtml).toHaveBeenCalledWith(clMarkdown, { variant: 'cover-letter' })
    expect(htmlToPdf).toHaveBeenCalled()
    expect(buffer).toBeInstanceOf(Buffer)
  })

  it('returns a Buffer', async () => {
    const buffer = await renderCoverLetterPDFv2('# Cover Letter')
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.toString()).toBe('mock-chromium-pdf')
  })
})

describe('module exports', () => {
  it('exports renderResumePDF and renderCoverLetterPDFv2', async () => {
    const mod = await import('@/lib/pdf/renderer')
    expect(typeof mod.renderResumePDF).toBe('function')
    expect(typeof mod.renderCoverLetterPDFv2).toBe('function')
  })
})
