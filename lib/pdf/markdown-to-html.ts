import { marked } from 'marked'

export interface MarkdownToHtmlOptions {
  variant?: 'resume' | 'cover-letter'
}

const RESUME_CSS = `
  @page {
    size: A4;
    margin: 40px;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #000;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 4px;
    color: #000;
  }

  h2 {
    font-size: 13pt;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
    margin-bottom: 8px;
    margin-top: 16px;
    text-transform: uppercase;
    color: #000;
  }

  /* Remove top margin on first h2 after h1's contact line */
  h1 + p + h2 {
    margin-top: 12px;
  }

  p {
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    margin-bottom: 4px;
  }

  strong {
    font-weight: bold;
    color: #000;
  }

  em {
    font-size: 10pt;
    color: #444;
    font-style: normal;
  }

  ul {
    margin-left: 15px;
    margin-bottom: 4px;
    list-style: none;
    padding: 0;
  }

  li {
    font-size: 10pt;
    color: #000;
    margin-top: 2px;
  }

  li::before {
    content: '\\2022';
    margin-right: 4px;
  }
`

const COVER_LETTER_CSS = `
  @page {
    size: A4;
    margin: 40px;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #000;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 4px;
    color: #000;
  }

  h2 {
    font-size: 13pt;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
    margin-bottom: 8px;
    margin-top: 16px;
    text-transform: uppercase;
    color: #000;
  }

  p {
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
    margin-bottom: 10px;
    text-align: justify;
  }

  /* Contact line after name - no justify */
  h1 + p {
    text-align: left;
    margin-bottom: 4px;
  }

  strong {
    font-weight: bold;
    color: #000;
  }

  em {
    font-size: 10pt;
    color: #444;
    font-style: normal;
  }
`

/**
 * Converts Markdown into a full HTML document with inline CSS.
 * Supports both resume and cover letter variants.
 */
export function markdownToHtml(markdown: string, options?: MarkdownToHtmlOptions): string {
  // Strip any raw HTML tags to prevent XSS/SSRF via injected content
  const sanitizedMarkdown = markdown.replace(/<[^>]*>/g, '')
  const htmlBody = marked.parse(sanitizedMarkdown, { async: false }) as string
  const css = options?.variant === 'cover-letter' ? COVER_LETTER_CSS : RESUME_CSS

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${css}
</style>
</head>
<body>
${htmlBody}
</body>
</html>`
}
