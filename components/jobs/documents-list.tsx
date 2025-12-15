'use client'

import { useState } from 'react'
import type { GeneratedDocument, AiTask } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DocumentPreviewDialog } from './document-preview-dialog'
import { useSSETask } from '@/lib/hooks/use-sse-task'

interface DocumentsListProps {
  documents: GeneratedDocument[]
  applicationId: string
  documentTasks: AiTask[]
}

export function DocumentsList({
  documents,
  applicationId,
  documentTasks,
}: DocumentsListProps) {
  const router = useRouter()
  const [generatingResume, setGeneratingResume] = useState(false)
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState<GeneratedDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Find in-progress resume and cover letter generation tasks
  const resumeTask = documentTasks.find(
    task =>
      task.type === 'RESUME_GENERATION' &&
      (task.status === 'PENDING' || task.status === 'RUNNING')
  )
  const coverLetterTask = documentTasks.find(
    task =>
      task.type === 'COVER_LETTER_GENERATION' &&
      (task.status === 'PENDING' || task.status === 'RUNNING')
  )

  // Listen for resume generation completion
  useSSETask(resumeTask?.id || null, () => {
    router.refresh()
    toast.success('Resume generated successfully!')
  })

  // Listen for cover letter generation completion
  useSSETask(coverLetterTask?.id || null, () => {
    router.refresh()
    toast.success('Cover letter generated successfully!')
  })

  const handleGenerateResume = async () => {
    setGeneratingResume(true)
    try {
      const response = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate resume')
      }

      toast.success('Resume generation started! This may take 30-60 seconds.')

      // Wait a bit then refresh to show the new task
      setTimeout(() => {
        router.refresh()
        setGeneratingResume(false)
      }, 2000)
    } catch (error: any) {
      toast.error(error.message)
      setGeneratingResume(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    setGeneratingCoverLetter(true)
    try {
      const response = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate cover letter')
      }

      toast.success('Cover letter generation started! This may take 30-60 seconds.')

      // Wait a bit then refresh to show the new task
      setTimeout(() => {
        router.refresh()
        setGeneratingCoverLetter(false)
      }, 2000)
    } catch (error: any) {
      toast.error(error.message)
      setGeneratingCoverLetter(false)
    }
  }

  const handleDownload = async (documentId: string) => {
    setDownloadingId(documentId)
    try {
      const response = await fetch(`/api/documents/${documentId}/download`)

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const { url } = await response.json()

      // Open download in new window
      window.open(url, '_blank')

      toast.success('Download started')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = (document: GeneratedDocument) => {
    setPreviewDocument(document)
    setPreviewOpen(true)
  }

  const resumeDocs = documents.filter(d => d.type === 'RESUME')
  const coverLetterDocs = documents.filter(d => d.type === 'COVER_LETTER')

  // Check if tasks are in progress
  const isGeneratingResume = !!resumeTask || generatingResume
  const isGeneratingCoverLetter = !!coverLetterTask || generatingCoverLetter

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-lora text-2xl font-semibold text-secondary">Documents</h2>
        <div className="flex gap-3">
          <Button
            onClick={handleGenerateResume}
            disabled={isGeneratingResume}
            variant="default"
            size="sm"
          >
            {isGeneratingResume ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Resume
              </>
            )}
          </Button>
          <Button
            onClick={handleGenerateCoverLetter}
            disabled={isGeneratingCoverLetter}
            variant="default"
            size="sm"
          >
            {isGeneratingCoverLetter ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Resumes Section */}
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">Resumes</h3>
          {isGeneratingResume && resumeDocs.length === 0 ? (
            <div className="text-center py-8 border border-accent-teal/30 rounded-xl bg-accent-teal/5">
              <Loader2 className="h-8 w-8 text-accent-teal mx-auto mb-2 animate-spin" />
              <p className="text-sm text-secondary/70 font-medium">Generating resume...</p>
              <p className="text-xs text-secondary/50 mt-1">
                This may take 30-60 seconds
              </p>
            </div>
          ) : resumeDocs.length === 0 ? (
            <div className="text-center py-8 border border-secondary/10 rounded-xl bg-primary/20">
              <FileText className="h-8 w-8 text-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-secondary/60">No resumes generated yet</p>
              <p className="text-xs text-secondary/50 mt-1">
                Click "Generate Resume" to create a tailored resume for this job
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumeDocs.map(doc => (
                <div
                  key={doc.id}
                  className="border border-secondary/10 rounded-xl p-4 flex items-center justify-between hover:bg-primary/20 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent-teal" />
                      <p className="font-medium text-secondary">Tailored Resume</p>
                    </div>
                    <p className="text-sm text-secondary/60 mt-1">
                      Generated {formatDate(doc.created_at)}
                    </p>
                    <p className="text-xs text-secondary/50 mt-1">
                      {doc.prompt_version} • {doc.model_used}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePreview(doc)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => handleDownload(doc.id)}
                      disabled={downloadingId === doc.id}
                      variant="outline"
                      size="sm"
                    >
                      {downloadingId === doc.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cover Letters Section */}
        <div>
          <h3 className="font-lora font-semibold text-lg text-secondary mb-3">Cover Letters</h3>
          {isGeneratingCoverLetter && coverLetterDocs.length === 0 ? (
            <div className="text-center py-8 border border-accent-orange/30 rounded-xl bg-accent-orange/5">
              <Loader2 className="h-8 w-8 text-accent-orange mx-auto mb-2 animate-spin" />
              <p className="text-sm text-secondary/70 font-medium">Generating cover letter...</p>
              <p className="text-xs text-secondary/50 mt-1">
                This may take 30-60 seconds
              </p>
            </div>
          ) : coverLetterDocs.length === 0 ? (
            <div className="text-center py-8 border border-secondary/10 rounded-xl bg-primary/20">
              <FileText className="h-8 w-8 text-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-secondary/60">No cover letters generated yet</p>
              <p className="text-xs text-secondary/50 mt-1">
                Click "Generate Cover Letter" to create a tailored cover letter
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coverLetterDocs.map(doc => (
                <div
                  key={doc.id}
                  className="border border-secondary/10 rounded-xl p-4 flex items-center justify-between hover:bg-primary/20 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent-orange" />
                      <p className="font-medium text-secondary">Tailored Cover Letter</p>
                    </div>
                    <p className="text-sm text-secondary/60 mt-1">
                      Generated {formatDate(doc.created_at)}
                    </p>
                    <p className="text-xs text-secondary/50 mt-1">
                      {doc.prompt_version} • {doc.model_used}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePreview(doc)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => handleDownload(doc.id)}
                      disabled={downloadingId === doc.id}
                      variant="outline"
                      size="sm"
                    >
                      {downloadingId === doc.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Note */}
      <div className="mt-6 pt-6 border-t border-secondary/10">
        <p className="text-xs text-secondary/60 text-center">
          Monthly limits: 30 resumes, 30 cover letters • Documents are stored for 90 days
        </p>
      </div>

      {/* Preview Dialog */}
      <DocumentPreviewDialog
        document={previewDocument}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
