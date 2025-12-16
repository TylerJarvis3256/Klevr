'use client'

import { useState } from 'react'
import type { Application, AiTask } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSSETask } from '@/lib/hooks/use-sse-task'

interface CompanyResearchProps {
  application: Application
  company: string
  researchTask?: AiTask | null
}

interface CompanyResearch {
  overview: string
  talking_points: string[]
  things_to_research: string[]
  culture_notes?: string
}

export function CompanyResearch({ application, company, researchTask }: CompanyResearchProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  // Listen for research task completion via SSE
  useSSETask(researchTask?.id || null, () => {
    router.refresh()
    toast.success('Company research generated successfully!')
  })

  const research = application.company_research as CompanyResearch | null
  const isResearchInProgress = !!researchTask || isGenerating

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate company research')
      }

      toast.success('Company research started! This may take 10-20 seconds.')

      // Wait a bit then refresh to show the new task
      setTimeout(() => {
        router.refresh()
        setIsGenerating(false)
      }, 2000)
    } catch (error: any) {
      toast.error(error.message)
      setIsGenerating(false)
    }
  }

  // Loading state
  if (isResearchInProgress && !research) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="text-center py-12 border border-accent-teal/30 rounded-xl bg-accent-teal/5">
          <Loader2 className="h-8 w-8 text-accent-teal mx-auto mb-2 animate-spin" />
          <p className="text-sm text-secondary/70 font-medium">Generating company research...</p>
          <p className="text-xs text-secondary/50 mt-1">This may take 10-20 seconds</p>
        </div>
      </div>
    )
  }

  // Empty state - no research yet
  if (!research) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="text-center py-12">
          <h3 className="font-lora text-xl font-semibold text-secondary mb-2">
            Company Research
          </h3>
          <p className="text-secondary/70 mb-6">
            Get AI-generated insights about {company} to prepare for your application.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating} variant="default" size="lg">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Company Insights'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Display research
  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-warning/10 rounded-2xl border border-warning/20 p-4">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-secondary/80">
            <strong className="font-semibold text-secondary">AI-Generated Summary:</strong> This
            information is based on general knowledge and may not reflect current details. Always
            verify facts and research the company thoroughly before applying or interviewing.
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h3 className="font-lora text-xl font-semibold text-secondary mb-4">Company Overview</h3>
        <p className="text-secondary/80 leading-relaxed">{research.overview}</p>
      </div>

      {/* Talking Points */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-lora text-xl font-semibold text-secondary">Talking Points</h3>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20">
            <span className="text-xs font-semibold text-accent-teal">For Interviews</span>
          </span>
        </div>
        <ul className="space-y-3">
          {research.talking_points?.map((point: string, i: number) => (
            <li key={i} className="flex gap-3">
              <span className="text-accent-teal font-bold text-lg leading-none mt-1">•</span>
              <span className="text-secondary/80 leading-relaxed flex-1">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Things to Research */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h3 className="font-lora text-xl font-semibold text-secondary mb-4">
          What to Research Next
        </h3>
        <ul className="space-y-3">
          {research.things_to_research?.map((item: string, i: number) => (
            <li key={i} className="flex gap-3">
              <span className="text-accent-orange font-bold text-lg leading-none mt-1">→</span>
              <span className="text-secondary/80 leading-relaxed flex-1">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Culture Notes */}
      {research.culture_notes && (
        <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <h3 className="font-lora text-xl font-semibold text-secondary mb-4">Culture Notes</h3>
          <p className="text-secondary/80 leading-relaxed">{research.culture_notes}</p>
        </div>
      )}

      {/* Regenerate button */}
      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm" className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate Research
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
