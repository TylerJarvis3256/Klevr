'use client'

import type { Application, AiTask } from '@prisma/client'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { FitBadge } from './fit-badge'
import { useSSETask } from '@/lib/hooks/use-sse-task'
import { useRouter } from 'next/navigation'

interface FitAssessmentProps {
  application: Application
  aiTask: AiTask | null
}

export function FitAssessment({ application, aiTask }: FitAssessmentProps) {
  const router = useRouter()

  // Listen for task completion and refresh when done
  const { status } = useSSETask(
    aiTask?.status === 'PENDING' || aiTask?.status === 'RUNNING' ? aiTask.id : null,
    () => {
      // When task completes successfully, refresh the page data
      router.refresh()
    }
  )

  // Show loading state if task is in progress
  if (!application.fit_bucket && (aiTask?.status === 'PENDING' || aiTask?.status === 'RUNNING')) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Fit Assessment</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-teal mb-4" />
          <p className="text-secondary/70">Analyzing job fit...</p>
          <p className="text-sm text-secondary/60 mt-2">
            {status === 'RUNNING' ? 'Processing your resume...' : 'Starting analysis...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if task failed
  if (aiTask?.status === 'FAILED' && !application.fit_bucket) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Fit Assessment</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-8 w-8 text-red-600 mb-4" />
          <p className="text-secondary/70">Failed to analyze job fit</p>
          <p className="text-sm text-secondary/60 mt-2">{aiTask.error_message}</p>
        </div>
      </div>
    )
  }

  // Show placeholder if no fit data and no task
  if (!application.fit_bucket) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Fit Assessment</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-secondary/70">No fit assessment available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Fit Assessment</h2>

      <div className="space-y-6">
        {/* Fit Badge and Score */}
        <div className="bg-primary/30 rounded-xl border border-secondary/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FitBadge fitBucket={application.fit_bucket} />
            <span className="text-sm text-secondary/80 font-medium">
              Score: {Math.round((application.fit_score || 0) * 100)}%
            </span>
          </div>

          <p className="text-secondary/80 leading-relaxed">{application.score_explanation}</p>
        </div>

        {/* Matching and Missing Skills */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Matching Skills */}
          {application.matching_skills && application.matching_skills.length > 0 && (
            <div className="bg-white rounded-xl border border-secondary/10 p-6">
              <h3 className="font-lora font-semibold mb-3 flex items-center gap-2 text-secondary">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Matching Skills
              </h3>
              <ul className="space-y-1">
                {application.matching_skills.map((skill, i) => (
                  <li key={i} className="text-sm text-secondary/80">
                    • {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills to Develop */}
          {application.missing_skills && application.missing_skills.length > 0 && (
            <div className="bg-white rounded-xl border border-secondary/10 p-6">
              <h3 className="font-lora font-semibold mb-3 flex items-center gap-2 text-secondary">
                <XCircle className="w-5 h-5 text-orange-600" />
                Skills to Develop
              </h3>
              <ul className="space-y-1">
                {application.missing_skills.map((skill, i) => (
                  <li key={i} className="text-sm text-secondary/80">
                    • {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
