'use client'

import { useState } from 'react'
import { FileText, Download, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface ResumeUpload {
  id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
  parsed_at: string | null
  parsing_error: string | null
  source: string
}

interface ResumeListProps {
  resumes: ResumeUpload[]
  onDelete: (id: string) => Promise<void>
  onDownload: (id: string) => Promise<void>
  isLoading?: boolean
}

export function ResumeList({ resumes, onDelete, onDownload, isLoading }: ResumeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDelete = async (id: string, fileName: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
      toast.success(`${fileName} deleted successfully`)
    } catch (error) {
      toast.error('Failed to delete resume')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (id: string) => {
    setDownloadingId(id)
    try {
      await onDownload(id)
    } catch (error) {
      toast.error('Failed to download resume')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i]
  }

  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return 'PDF'
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX'
    if (mimeType === 'text/plain') return 'Text'
    return 'File'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-secondary/20 rounded-2xl bg-primary/20">
        <FileText className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
        <h3 className="font-lora text-lg font-semibold text-secondary mb-2">
          No resumes uploaded yet
        </h3>
        <p className="text-sm text-secondary/70 mb-4">
          Upload your first resume to build your profile
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {resumes.map((resume) => (
        <div
          key={resume.id}
          className="border border-secondary/10 rounded-2xl p-4 bg-white hover:border-accent-teal/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* File Icon */}
            <div className="flex-shrink-0 mt-1">
              <FileText className="h-5 w-5 text-accent-teal" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* File name */}
              <h4 className="font-medium text-secondary truncate mb-1">
                {resume.file_name}
              </h4>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-secondary/70 mb-2">
                <span>
                  Uploaded {formatDistanceToNow(new Date(resume.uploaded_at), { addSuffix: true })}
                </span>
                <span className="text-secondary/40">•</span>
                <span>{formatFileSize(resume.file_size)}</span>
                <span className="text-secondary/40">•</span>
                <span>{getFileTypeLabel(resume.file_type)}</span>
              </div>

              {/* Status Badge */}
              <div>
                {resume.parsing_error ? (
                  <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    <span>Parsing failed</span>
                  </div>
                ) : resume.parsed_at ? (
                  <div className="inline-flex items-center gap-1.5 bg-accent-teal/10 text-accent-teal text-xs px-2 py-1 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    <span>Parsed successfully</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-secondary/10 text-secondary/70 text-xs px-2 py-1 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {resume.parsing_error && (
                <p className="text-xs text-red-600 mt-2">
                  {resume.parsing_error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Download Button */}
              {resume.file_type !== 'text/plain' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(resume.id)}
                  disabled={downloadingId === resume.id}
                  className="h-8 px-2 text-accent-teal hover:bg-accent-teal/10"
                >
                  {downloadingId === resume.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Delete Button with Confirmation Dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === resume.id}
                    className="h-8 px-2 text-red-600 hover:bg-red-50"
                  >
                    {deletingId === resume.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{resume.file_name}"?
                      <br />
                      <br />
                      <strong>Note:</strong> This will only remove the file reference.
                      Your profile data (education, experience, projects) will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(resume.id, resume.file_name)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Resume
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
