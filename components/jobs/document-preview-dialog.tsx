'use client'

import { useState } from 'react'
import type { GeneratedDocument } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { GeneratedResumeContent } from '@/lib/resume-generator'

interface DocumentPreviewDialogProps {
  document: GeneratedDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!document) return null

  const isCoverLetter = document.type === 'COVER_LETTER'
  const isResume = document.type === 'RESUME'

  const handleCopyText = async () => {
    if (!isCoverLetter) return

    const coverLetterData = document.structured_data as { content: string } | string
    const text = typeof coverLetterData === 'string' ? coverLetterData : coverLetterData.content
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Cover letter copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-lora text-2xl text-secondary">
                Preview: {isCoverLetter ? 'Cover Letter' : 'Resume'}
              </DialogTitle>
              <DialogDescription className="text-sm text-secondary/60 mt-1">
                {document.prompt_version} • {document.model_used}
              </DialogDescription>
            </div>
            {isCoverLetter && (
              <Button
                onClick={handleCopyText}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy as Text
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-6">
          {isCoverLetter && (
            <CoverLetterPreview
              text={
                typeof document.structured_data === 'string'
                  ? document.structured_data
                  : (document.structured_data as { content: string }).content
              }
            />
          )}
          {isResume && (
            <ResumePreview
              content={document.structured_data as unknown as GeneratedResumeContent}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CoverLetterPreview({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <div className="whitespace-pre-wrap font-sans text-secondary leading-relaxed bg-primary/20 rounded-xl p-6 border border-secondary/10">
        {text}
      </div>
    </div>
  )
}

function ResumePreview({ content }: { content: GeneratedResumeContent }) {
  return (
    <div className="space-y-6 font-sans text-secondary">
      {/* Summary */}
      {content.summary && (
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-2">
            Professional Summary
          </h3>
          <p className="text-sm leading-relaxed">{content.summary}</p>
        </div>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">
            Experience
          </h3>
          <div className="space-y-4">
            {content.experience.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-accent-teal pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-secondary">{exp.title}</p>
                    <p className="text-sm text-secondary/70">{exp.company}</p>
                  </div>
                  <p className="text-xs text-secondary/60">{exp.dates}</p>
                </div>
                {exp.location && (
                  <p className="text-xs text-secondary/60 mt-1">{exp.location}</p>
                )}
                <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                  {exp.bullets.map((bullet, bidx) => (
                    <li key={bidx} className="text-secondary/80">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">
            Education
          </h3>
          <div className="space-y-3">
            {content.education.map((edu, idx) => (
              <div key={idx} className="border-l-2 border-accent-orange pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-secondary">{edu.degree}</p>
                    <p className="text-sm text-secondary/70">{edu.school}</p>
                  </div>
                  <p className="text-xs text-secondary/60">{edu.graduation}</p>
                </div>
                {edu.gpa && (
                  <p className="text-xs text-secondary/60 mt-1">GPA: {edu.gpa}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {content.skills && (
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">
            Skills
          </h3>
          <div className="space-y-2">
            {content.skills.technical && content.skills.technical.length > 0 && (
              <div>
                <p className="text-sm font-medium text-secondary/70 mb-1">
                  Technical Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {content.skills.technical.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-accent-teal/10 text-accent-teal rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {content.skills.other && content.skills.other.length > 0 && (
              <div>
                <p className="text-sm font-medium text-secondary/70 mb-1 mt-3">
                  Other Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {content.skills.other.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">
            Projects
          </h3>
          <div className="space-y-3">
            {content.projects.map((proj, idx) => (
              <div key={idx} className="border-l-2 border-accent-orange pl-4">
                <p className="font-semibold text-secondary">{proj.name}</p>
                <p className="text-sm text-secondary/80 mt-1">{proj.description}</p>
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.technologies.map((tech, tidx) => (
                      <span
                        key={tidx}
                        className="px-2 py-0.5 bg-primary text-secondary/70 rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
