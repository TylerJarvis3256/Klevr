'use client'

import { useState, useEffect } from 'react'
import type { Application, AiTask } from '@prisma/client'
import { Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { FitBadge } from './fit-badge'
import { useSSETask } from '@/lib/hooks/use-sse-task'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FitAssessmentProps {
  application: Application
  aiTask: AiTask | null
}

export function FitAssessment({ application, aiTask }: FitAssessmentProps) {
  const router = useRouter()
  const [addingSkill, setAddingSkill] = useState<string | null>(null)
  const [isRescoring, setIsRescoring] = useState(false)

  // Track skills added optimistically (not yet reflected in server data)
  const [optimisticallyAddedSkills, setOptimisticallyAddedSkills] = useState<Set<string>>(new Set())

  // Local state for optimistic UI updates
  const [matchingSkills, setMatchingSkills] = useState<string[]>(application.matching_skills || [])
  const [missingRequiredSkills, setMissingRequiredSkills] = useState<string[]>(
    application.missing_required_skills || []
  )
  const [missingPreferredSkills, setMissingPreferredSkills] = useState<string[]>(
    application.missing_preferred_skills || []
  )
  const [missingSkills, setMissingSkills] = useState<string[]>(application.missing_skills || [])

  // Sync local state when application data updates, preserving optimistic additions
  useEffect(() => {
    // Merge server data with optimistically added skills
    const serverMatching = application.matching_skills || []
    const serverMissingRequired = application.missing_required_skills || []
    const serverMissingPreferred = application.missing_preferred_skills || []
    const serverMissing = application.missing_skills || []

    // Add optimistically added skills to matching, remove from missing
    const mergedMatching = [...new Set([...serverMatching, ...Array.from(optimisticallyAddedSkills)])]
    const mergedMissingRequired = serverMissingRequired.filter(s => !optimisticallyAddedSkills.has(s))
    const mergedMissingPreferred = serverMissingPreferred.filter(s => !optimisticallyAddedSkills.has(s))
    const mergedMissing = serverMissing.filter(s => !optimisticallyAddedSkills.has(s))

    setMatchingSkills(mergedMatching)
    setMissingRequiredSkills(mergedMissingRequired)
    setMissingPreferredSkills(mergedMissingPreferred)
    setMissingSkills(mergedMissing)
  }, [application, optimisticallyAddedSkills])

  // Listen for task completion and refresh when done
  const { status } = useSSETask(
    aiTask?.status === 'PENDING' || aiTask?.status === 'RUNNING' ? aiTask.id : null,
    () => {
      // When task completes successfully, clear optimistic state and refresh
      setOptimisticallyAddedSkills(new Set())
      router.refresh()
    }
  )

  // Handle adding a skill to profile
  async function handleAddSkill(skill: string) {
    setAddingSkill(skill)
    try {
      // Fetch current profile
      const profileRes = await fetch('/api/profile')
      if (!profileRes.ok) throw new Error('Failed to fetch profile')

      const { profile } = await profileRes.json()
      const currentSkills = profile.skills || []

      // Check if skill already exists (case-insensitive)
      const skillExists = currentSkills.some(
        (s: string) => s.toLowerCase() === skill.toLowerCase()
      )

      if (skillExists) {
        toast.info('Skill already in your profile')
        setAddingSkill(null)
        return
      }

      // Add skill to profile
      const updateRes = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: [...currentSkills, skill] }),
      })

      if (!updateRes.ok) throw new Error('Failed to update skills')

      // Track this skill as optimistically added
      setOptimisticallyAddedSkills((prev) => new Set([...prev, skill]))

      // Optimistically update UI - move skill from missing to matching
      setMatchingSkills((prev) => [...prev, skill])
      setMissingRequiredSkills((prev) => prev.filter((s) => s !== skill))
      setMissingPreferredSkills((prev) => prev.filter((s) => s !== skill))
      setMissingSkills((prev) => prev.filter((s) => s !== skill))

      toast.success(`Added "${skill}" to your profile`)
      router.refresh()
    } catch (error) {
      toast.error('Failed to add skill to profile')
    } finally {
      setAddingSkill(null)
    }
  }

  // Handle re-scoring
  async function handleRescore() {
    setIsRescoring(true)
    try {
      const res = await fetch('/api/ai/job-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to re-score')
      }

      // Clear optimistic state - re-score will update server data with actual skills
      setOptimisticallyAddedSkills(new Set())

      toast.success('Re-assessment started. This may take a minute...')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start re-assessment')
    } finally {
      setIsRescoring(false)
    }
  }

  // Show loading state if task is in progress (initial assessment or re-assessment)
  const isAssessing = aiTask?.status === 'PENDING' || aiTask?.status === 'RUNNING'

  if (isAssessing) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Fit Assessment</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-teal mb-4" />
          <p className="text-secondary/70">
            {application.fit_bucket ? 'Re-assessing job fit...' : 'Analyzing job fit...'}
          </p>
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
          {matchingSkills.length > 0 && (
            <div className="bg-white rounded-xl border border-secondary/10 p-6">
              <h3 className="font-lora font-semibold mb-3 flex items-center gap-2 text-secondary">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Matching Skills
              </h3>
              <ul className="space-y-1">
                {matchingSkills.map((skill, i) => {
                  const isOptimistic = optimisticallyAddedSkills.has(skill)
                  return (
                    <li
                      key={i}
                      className="text-sm text-secondary/80 flex items-center gap-2"
                      title={isOptimistic ? 'Added locally - re-assess to update fit score' : undefined}
                    >
                      • {skill}
                      {isOptimistic && (
                        <span className="text-xs text-accent-teal">*</span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {optimisticallyAddedSkills.size > 0 && (
                <p className="text-xs text-secondary/60 mt-3 italic">
                  * Recently added - re-assess to update fit score
                </p>
              )}
            </div>
          )}

          {/* Missing Skills */}
          {(missingRequiredSkills.length > 0 ||
            missingPreferredSkills.length > 0 ||
            missingSkills.length > 0) && (
            <div className="bg-white rounded-xl border border-secondary/10 p-6">
              <h3 className="font-lora font-semibold mb-3 flex items-center gap-2 text-secondary">
                <XCircle className="w-5 h-5 text-orange-600" />
                Skills to Develop
              </h3>
              <div className="space-y-4">
                {/* Required Skills */}
                {missingRequiredSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">Required</h4>
                    <ul className="space-y-2">
                      {missingRequiredSkills.map((skill, i) => (
                        <li key={i} className="flex items-center justify-between text-sm text-secondary/80">
                          <span>• {skill}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddSkill(skill)}
                            disabled={addingSkill === skill}
                            className="h-7 px-2 text-xs"
                          >
                            {addingSkill === skill ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preferred Skills */}
                {missingPreferredSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Preferred</h4>
                    <ul className="space-y-2">
                      {missingPreferredSkills.map((skill, i) => (
                        <li key={i} className="flex items-center justify-between text-sm text-secondary/80">
                          <span>• {skill}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddSkill(skill)}
                            disabled={addingSkill === skill}
                            className="h-7 px-2 text-xs"
                          >
                            {addingSkill === skill ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fallback for old missing_skills field (for existing jobs) */}
                {missingSkills.length > 0 &&
                 missingRequiredSkills.length === 0 &&
                 missingPreferredSkills.length === 0 && (
                  <ul className="space-y-2">
                    {missingSkills.map((skill, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-secondary/80">
                        <span>• {skill}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddSkill(skill)}
                          disabled={addingSkill === skill}
                          className="h-7 px-2 text-xs"
                        >
                          {addingSkill === skill ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Re-assessment Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleRescore}
            disabled={isRescoring}
          >
            {isRescoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Re-assessing...
              </>
            ) : (
              <>
                Re-assess Fit
                {application.score_count > 1 && ' (uses AI credit)'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
