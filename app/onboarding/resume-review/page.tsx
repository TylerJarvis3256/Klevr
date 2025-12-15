'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { ResumeEditor } from '@/components/profile/resume-editor'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ParsedResume } from '@/lib/resume-parser'

export default function OnboardingResumeReviewPage() {
  const router = useRouter()
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          throw new Error('Failed to load profile')
        }

        const data = await res.json()
        if (data.profile?.parsed_resume) {
          setParsedResume(data.profile.parsed_resume)
        }
      } catch (error) {
        toast.error('Failed to load resume. Please go back and parse again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleConfirm(data: ParsedResume) {
    try {
      const res = await fetch('/api/resume/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_resume: data }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to confirm resume')
      }

      toast.success('Resume confirmed! Welcome to Klevr.')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to confirm resume. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
          </div>
          <OnboardingStepper currentStep={4} totalSteps={4} />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="container max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
        </div>

        <OnboardingStepper currentStep={4} totalSteps={4} />

        <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
          <div className="mb-6">
            <h1 className="font-lora text-3xl font-bold mb-2 text-secondary">
              {parsedResume ? 'Review your resume' : 'Fill in your resume'}
            </h1>
            <p className="text-base text-secondary/80">
              {parsedResume
                ? 'Review and edit the AI-parsed information. This will be used to generate tailored resumes.'
                : 'Fill in your resume information manually. This will be used to generate tailored resumes for each job application.'}
            </p>
          </div>

          <ResumeEditor
            initialData={parsedResume}
            onSubmit={handleConfirm}
            submitLabel="Confirm & Get Started"
          />

          <div className="mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push('/onboarding/resume-upload')}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
