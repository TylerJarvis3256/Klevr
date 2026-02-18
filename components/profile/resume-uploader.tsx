'use client'

import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ResumeUploaderProps {
  onSuccess: () => void
}

interface UploadSummary {
  educationAdded: number
  experienceAdded: number
  projectsAdded: number
  bulletsAdded: number
}

export function ResumeUploader({ onSuccess }: ResumeUploaderProps) {
  const [method, setMethod] = useState<'upload' | 'paste'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [summary, setSummary] = useState<UploadSummary | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and DOCX files are supported')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)

    try {
      // Step 1: Get presigned URL
      const step1Response = await fetch('/api/profile/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'upload',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      })

      if (!step1Response.ok) {
        const error = await step1Response.json()
        throw new Error(error.error || 'Failed to get upload URL')
      }

      const { uploadUrl, s3Key } = await step1Response.json()

      // Step 2: Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Step 3: Process uploaded file
      const step3Response = await fetch('/api/profile/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'upload',
          s3Key,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      })

      if (!step3Response.ok) {
        const error = await step3Response.json()
        throw new Error(error.error || 'Failed to process resume')
      }

      const { summary: uploadSummary } = await step3Response.json()

      // Show success modal with summary
      setSummary(uploadSummary)
      setShowSuccessModal(true)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload resume'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handlePasteText = async () => {
    if (!pastedText || pastedText.trim().length < 50) {
      toast.error('Please paste at least 50 characters of resume text')
      return
    }

    setIsUploading(true)

    try {
      const response = await fetch('/api/profile/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'paste',
          resumeText: pastedText,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process resume')
      }

      const { summary: uploadSummary } = await response.json()

      // Show success modal with summary
      setSummary(uploadSummary)
      setShowSuccessModal(true)
      setPastedText('')
    } catch (error) {
      console.error('Paste error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process resume'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    setSummary(null)
    onSuccess() // Refresh resume list
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  return (
    <>
      <div className="space-y-6">
        {/* Method Toggle */}
        <div className="flex gap-2 p-1 bg-secondary/5 rounded-full w-fit">
          <button
            onClick={() => setMethod('upload')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              method === 'upload'
                ? 'bg-accent-teal text-white shadow-sm'
                : 'text-secondary/70 hover:text-secondary'
            }`}
          >
            <Upload className="inline h-4 w-4 mr-2" />
            Upload File
          </button>
          <button
            onClick={() => setMethod('paste')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              method === 'paste'
                ? 'bg-accent-teal text-white shadow-sm'
                : 'text-secondary/70 hover:text-secondary'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Paste Text
          </button>
        </div>

        {/* Upload File Method */}
        {method === 'upload' && (
          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-accent-teal bg-accent-teal/5'
                  : 'border-secondary/20 hover:border-accent-teal/50'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-accent-teal/10 p-4">
                  <Upload className="h-8 w-8 text-accent-teal" />
                </div>
                <div>
                  <p className="font-medium text-secondary mb-1">
                    Drag and drop your resume here
                  </p>
                  <p className="text-sm text-secondary/70">or</p>
                </div>
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    className="bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Browse Files
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-secondary/60">
                  Supports PDF and DOCX (Max 5MB)
                </p>
              </div>
            </div>

            {/* Selected File */}
            {selectedFile && (
              <div className="border border-secondary/10 rounded-2xl p-4 bg-white">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-accent-teal" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-secondary/70">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUploadFile}
              disabled={!selectedFile || isUploading}
              className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white rounded-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Resume...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload and Parse Resume
                </>
              )}
            </Button>
          </div>
        )}

        {/* Paste Text Method */}
        {method === 'paste' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="resume-text" className="text-secondary mb-2 block">
                Paste your resume text below
              </Label>
              <Textarea
                id="resume-text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Copy and paste your resume text here..."
                className="min-h-[300px] resize-none border-secondary/20 rounded-2xl"
                disabled={isUploading}
              />
              <p className="text-xs text-secondary/60 mt-2">
                Minimum 50 characters required
              </p>
            </div>

            {/* Parse Button */}
            <Button
              onClick={handlePasteText}
              disabled={pastedText.trim().length < 50 || isUploading}
              className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white rounded-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Resume...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Parse Resume Text
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-accent-teal/10 p-2">
                <CheckCircle className="h-6 w-6 text-accent-teal" />
              </div>
              <DialogTitle className="text-xl">Resume Parsed Successfully!</DialogTitle>
            </div>
            <DialogDescription>
              Your resume has been processed and added to your profile.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium text-secondary mb-3">
                What was added to your profile:
              </p>
              <div className="space-y-2 text-sm text-secondary/80">
                {summary.educationAdded > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                    <span>
                      Added <strong className="text-secondary">{summary.educationAdded}</strong>{' '}
                      education {summary.educationAdded === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                )}
                {summary.experienceAdded > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                    <span>
                      Added <strong className="text-secondary">{summary.experienceAdded}</strong>{' '}
                      work {summary.experienceAdded === 1 ? 'experience' : 'experiences'}
                    </span>
                  </div>
                )}
                {summary.projectsAdded > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                    <span>
                      Added <strong className="text-secondary">{summary.projectsAdded}</strong>{' '}
                      {summary.projectsAdded === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                )}
                {summary.bulletsAdded > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                    <span>
                      Added <strong className="text-secondary">{summary.bulletsAdded}</strong>{' '}
                      bullet {summary.bulletsAdded === 1 ? 'point' : 'points'}
                    </span>
                  </div>
                )}
                {summary.educationAdded === 0 &&
                  summary.experienceAdded === 0 &&
                  summary.projectsAdded === 0 &&
                  summary.bulletsAdded === 0 && (
                    <div className="flex items-center gap-2 text-secondary/60">
                      <AlertCircle className="h-4 w-4" />
                      <span>No new data was added (duplicates detected)</span>
                    </div>
                  )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleSuccessClose}
              className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white rounded-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
