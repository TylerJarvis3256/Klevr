'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { FileUpload } from '@/components/forms/file-upload'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function OnboardingResumeUploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file')

  async function handleFileUpload(file: File) {
    setIsUploading(true)
    try {
      // Step 1: Get presigned URL
      const urlRes = await fetch('/api/upload/resume-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      })

      if (!urlRes.ok) {
        const error = await urlRes.json()
        throw new Error(error.error || 'Failed to get upload URL')
      }

      const { uploadUrl, key } = await urlRes.json()

      // Step 2: Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      // Step 3: Confirm upload
      const confirmRes = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          filename: file.name,
        }),
      })

      if (!confirmRes.ok) {
        throw new Error('Failed to confirm upload')
      }

      toast.success('Resume uploaded successfully!')
      // Redirect to review page to manually fill in resume
      router.push('/onboarding/resume-review')
    } catch (error) {
      toast.error('Failed to upload resume. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleParseResume() {
    if (!resumeText.trim() || resumeText.trim().length < 50) {
      toast.error('Please paste your resume text (at least 50 characters)')
      return
    }

    setIsParsing(true)
    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to parse resume')
      }

      toast.success('Resume parsed successfully!')
      router.push('/onboarding/resume-review')
    } catch (error) {
      toast.error('Failed to parse resume. Please try again.')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="container max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
        </div>

        <OnboardingStepper currentStep={3} totalSteps={4} />

        <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
          <h1 className="font-lora text-3xl font-bold mb-2 text-secondary">Upload your resume</h1>
          <p className="text-base text-secondary/80 mb-2">
            Upload your resume file or paste the text for AI-powered parsing.
          </p>
          <p className="text-sm text-secondary/70 mb-8">
            You can also skip this step and fill in your information manually in the next step.
          </p>

        {uploadMode === 'file' ? (
          <div className="space-y-6">
            <FileUpload
              accept=".pdf,.docx"
              maxSize={5 * 1024 * 1024}
              onUpload={handleFileUpload}
              isUploading={isUploading}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/95 text-secondary/70">Or paste your resume text</span>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => setUploadMode('text')}
              className="w-full"
            >
              Paste Resume Text Instead
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Resume Text</label>
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                className="min-h-[300px]"
              />
              <p className="text-sm text-secondary/70 mt-2">
                Paste the text content of your resume for AI parsing
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setUploadMode('file')}
                disabled={isParsing}
              >
                Upload File Instead
              </Button>
              <Button
                onClick={handleParseResume}
                disabled={isParsing || !resumeText.trim()}
                className="flex-1"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse Resume'
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-4 pt-8">
          <Button
            variant="secondary"
            onClick={() => router.push('/onboarding/preferences')}
            disabled={isUploading || isParsing}
          >
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/resume-review')}
            disabled={isUploading || isParsing}
          >
            Skip & Continue
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
