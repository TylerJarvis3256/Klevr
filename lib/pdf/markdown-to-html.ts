import { marked } from 'marked'

/**
 * Converts resume Markdown into a full HTML document with inline CSS.
 * Styles match MarkdownResumePreview (components/resume/markdown-resume-preview.tsx)
 * so the generated PDF is pixel-perfect identical to the browser preview.
 */
export function markdownToHtml(markdown: string): string {
  const htmlBody = marked.parse(markdown, { async: false }) as string

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
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
</style>
</head>
<body>
${htmlBody}
</body>
</html>`
}
