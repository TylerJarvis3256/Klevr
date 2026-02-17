import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the html-to-pdf module (puppeteer/chromium pipeline)
vi.mock('@/lib/pdf/html-to-pdf', () => ({
  htmlToPdf: vi.fn().mockResolvedValue(Buffer.from('mock-chromium-pdf')),
}))

// Mock the markdown-to-html module
vi.mock('@/lib/pdf/markdown-to-html', () => ({
  markdownToHtml: vi.fn((md: string) => `<html>${md}</html>`),
}))

// Mock @react-pdf/renderer for cover letter tests
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-cover-letter-pdf')),
  Document: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Page: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Text: vi.fn(({ children }: { children: React.ReactNode }) => children),
  View: vi.fn(({ children }: { children: React.ReactNode }) => children),
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}))

import { renderResumePDF, renderCoverLetterPDF } from '@/lib/pdf/renderer'
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

describe('renderCoverLetterPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a Buffer', async () => {
    const buffer = await renderCoverLetterPDF(
      'Dear Hiring Manager, I am writing to apply...',
      { name: 'Test User', email: 'test@example.com' },
      { title: 'Software Engineer', company: 'Acme Corp' }
    )
    expect(buffer).toBeInstanceOf(Buffer)
  })
})

describe('module exports', () => {
  it('exports renderResumePDF and renderCoverLetterPDF', async () => {
    const mod = await import('@/lib/pdf/renderer')
    expect(typeof mod.renderResumePDF).toBe('function')
    expect(typeof mod.renderCoverLetterPDF).toBe('function')
  })

  it('does not export legacy renderResumeWithProvider', async () => {
    const mod = await import('@/lib/pdf/renderer')
    expect(Object.keys(mod)).not.toContain('renderResumeWithProvider')
  })
})
