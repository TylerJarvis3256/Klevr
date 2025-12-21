'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParsedResume } from '@/lib/resume-parser'

interface ResumeUpdaterProps {
  onResumeUpdated: () => void
}

export function ResumeUpdater({ onResumeUpdated }: ResumeUpdaterProps) {
  const [method, setMethod] = useState<'upload' | 'paste'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null)
  const [pastedText, setPastedText] = useState('')

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Validate file type (only DOCX for now - PDF has technical issues)
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setError('Only DOCX files are supported. For PDF resumes, please use the "Paste Text" option.')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleUploadResume = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Get presigned upload URL
      const initResponse = await fetch('/api/resume/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'upload',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      })

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload')
      }

      const { uploadUrl, key } = await initResponse.json()

      // Step 2: Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Step 3: Server extracts text and parses resume
      const parseResponse = await fetch('/api/resume/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      })

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json()
        throw new Error(errorData.error || 'Failed to parse resume')
      }

      const { parsedResume: parsed } = await parseResponse.json()
      setParsedResume(parsed)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePasteResume = async () => {
    if (!pastedText.trim()) {
      setError('Please paste your resume text')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/resume/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'paste',
          resumeText: pastedText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to parse resume')
      }

      const { parsedResume: parsed } = await response.json()
      setParsedResume(parsed)
    } catch (err) {
      console.error('Paste error:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmResume = async () => {
    if (!parsedResume) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/resume/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedResume,
          shouldMigrate: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update resume')
      }

      // Success - notify parent to refresh
      onResumeUpdated()

      // Reset state
      setParsedResume(null)
      setSelectedFile(null)
      setPastedText('')
    } catch (err) {
      console.error('Confirm error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update resume')
    } finally {
      setIsProcessing(false)
    }
  }

  if (parsedResume) {
    // Show preview/confirmation
    return (
      <div className="border border-accent-teal/30 rounded-2xl p-6 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle className="h-5 w-5 text-accent-teal flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-lora font-semibold text-lg">Resume Parsed Successfully</h3>
            <p className="text-sm text-secondary/70 mt-1">
              Review the extracted information below. Click "Confirm & Update" to save.
            </p>
          </div>
        </div>

        <div className="bg-primary/30 rounded-lg p-4 text-sm space-y-3 mb-4">
          <div>
            <span className="font-medium">Name:</span> {parsedResume.personal?.name || 'Not found'}
          </div>
          <div>
            <span className="font-medium">Email:</span> {parsedResume.personal?.email || 'Not found'}
          </div>
          <div>
            <span className="font-medium">Education:</span> {parsedResume.education?.length || 0} entries
          </div>
          <div>
            <span className="font-medium">Experience:</span> {parsedResume.experience?.length || 0} positions
          </div>
          <div>
            <span className="font-medium">Projects:</span> {parsedResume.projects?.length || 0} projects
          </div>
          <div>
            <span className="font-medium">Skills:</span>{' '}
            {[
              ...(parsedResume.skills?.languages || []),
              ...(parsedResume.skills?.frameworks || []),
              ...(parsedResume.skills?.tools || []),
            ].length}{' '}
            skills
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConfirmResume}
            disabled={isProcessing}
            className="bg-accent-teal hover:bg-accent-teal/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Confirm & Update Profile'
            )}
          </Button>
          <Button variant="outline" onClick={() => setParsedResume(null)} disabled={isProcessing}>
            Cancel
          </Button>
        </div>

        <p className="text-xs text-secondary/60 mt-3">
          Note: This will update your Education, Experience, Projects, and Skills sections with the parsed data.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-secondary/20 rounded-2xl p-6 bg-white">
      <h3 className="font-lora font-semibold text-lg mb-4">Update Resume</h3>

      {/* Method selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={method === 'upload' ? 'default' : 'outline'}
          onClick={() => setMethod('upload')}
          size="sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <Button variant={method === 'paste' ? 'default' : 'outline'} onClick={() => setMethod('paste')} size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Paste Text
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {method === 'upload' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Resume File (DOCX only)</label>
            <input
              type="file"
              accept=".docx"
              onChange={handleFileSelect}
              className="block w-full text-sm text-secondary/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-teal/10 file:text-accent-teal hover:file:bg-accent-teal/20"
            />
            <p className="text-xs text-secondary/60 mt-2">
              For PDF resumes, use "Paste Text" option below
            </p>
          </div>

          {selectedFile && (
            <div className="bg-primary/30 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-secondary/60 text-xs mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.split('/')[1].toUpperCase()}
              </p>
            </div>
          )}

          <Button
            onClick={handleUploadResume}
            disabled={!selectedFile || isProcessing}
            className="bg-accent-orange hover:bg-accent-orange/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Upload & Parse Resume'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Paste Resume Text</label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-secondary/20 rounded-lg text-sm"
              placeholder="Paste your resume text here..."
            />
          </div>

          <Button
            onClick={handlePasteResume}
            disabled={!pastedText.trim() || isProcessing}
            className="bg-accent-orange hover:bg-accent-orange/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Parse Resume Text'
            )}
          </Button>
        </div>
      )}

      <p className="text-xs text-secondary/60 mt-4">
        Updating your resume will re-parse your experience, education, projects, and skills. Your manually added data
        will be replaced with the parsed information.
      </p>
    </div>
  )
}
