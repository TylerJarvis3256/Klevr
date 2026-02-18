'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

interface MarkdownResumePreviewProps {
  markdown: string
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mb-1 text-black">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-[13pt] font-bold border-b border-black pb-[3px] mb-2 mt-4 uppercase text-black">
      {children}
    </h2>
  ),
  p: ({ children }) => <p className="text-[11pt] leading-[1.4] text-black mb-1">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-black">{children}</strong>,
  em: ({ children }) => <em className="text-[10pt] text-[#444] not-italic">{children}</em>,
  ul: ({ children }) => <ul className="ml-[15px] mb-1 list-none">{children}</ul>,
  li: ({ children }) => (
    <li className="text-[10pt] text-black mt-[2px] before:content-['•'] before:mr-1">{children}</li>
  ),
}

export function MarkdownResumePreview({ markdown }: MarkdownResumePreviewProps) {
  return (
    <div className="bg-white max-w-[8.5in] mx-auto shadow-lg border border-gray-200 p-10 font-sans">
      <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
    </div>
  )
}
