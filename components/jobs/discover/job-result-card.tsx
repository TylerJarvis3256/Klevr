'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Loader2, Check, Building2, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import type { AdzunaJob } from '@/lib/adzuna'

interface JobResultCardProps {
  job: AdzunaJob
  onSave?: (job: AdzunaJob) => Promise<{ jobId: string }>
  isSaved?: boolean
}

export function JobResultCard({ job, onSave, isSaved = false }: JobResultCardProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(isSaved)
  const router = useRouter()

  const handleSave = async () => {
    if (saved || !onSave) return

    setIsSaving(true)
    try {
      const result = await onSave(job)
      setSaved(true)

      // Show success toast with action to view job
      toast.success('Job saved to pipeline', {
        description: 'Click to view job details and fit assessment',
        action: {
          label: 'View Job',
          onClick: () => router.push(`/jobs/${result.jobId}`),
        },
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to save job')
    } finally {
      setIsSaving(false)
    }
  }

  // Format salary range
  const salaryDisplay = job.salary_min && job.salary_max
    ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max / 1000)}k`
    : job.salary_min
      ? `$${Math.round(job.salary_min / 1000)}k+`
      : null

  // Format contract type
  const contractDisplay = [job.contract_time, job.contract_type]
    .filter(Boolean)
    .join(' • ')

  // Format created date
  const createdDate = new Date(job.created)
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true })

  // Truncate description to ~200 characters
  const truncatedDescription = job.description.length > 200
    ? job.description.substring(0, 200).trim() + '...'
    : job.description

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-4 sm:p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-lora text-lg sm:text-xl font-semibold text-secondary mb-2 line-clamp-2">
            {job.title}
          </h3>

          <div className="flex items-center gap-2 text-secondary/80 mb-2">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">{job.company.display_name}</span>
          </div>

          {job.location && (
            <div className="flex items-center gap-2 text-secondary/70 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{job.location.display_name}</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex-shrink-0">
          {saved ? (
            <Button disabled size="sm" className="rounded-full w-full sm:w-auto">
              <Check className="h-4 w-4 mr-2" />
              Saved
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="rounded-full w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Saving</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Save to Pipeline</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {salaryDisplay && (
          <Badge variant="outline" className="bg-accent-teal/5 text-accent-teal border-accent-teal/20">
            <DollarSign className="h-3 w-3 mr-1" />
            {salaryDisplay}
            {job.salary_is_predicted === 1 && (
              <span className="text-xs ml-1">(est.)</span>
            )}
          </Badge>
        )}

        {contractDisplay && (
          <Badge variant="outline" className="bg-secondary/5 text-secondary/80 border-secondary/20">
            <Briefcase className="h-3 w-3 mr-1" />
            {contractDisplay}
          </Badge>
        )}

        <Badge variant="outline" className="bg-secondary/5 text-secondary/70 border-secondary/20">
          <Calendar className="h-3 w-3 mr-1" />
          {timeAgo}
        </Badge>

        {job.category && (
          <Badge variant="outline" className="bg-primary/60 text-secondary/80 border-secondary/20">
            {job.category.label}
          </Badge>
        )}
      </div>

      {/* Description Snippet */}
      <p className="text-sm text-secondary/80 mb-4 line-clamp-3">
        {/* Strip HTML tags from description */}
        {truncatedDescription.replace(/<[^>]*>/g, '')}
      </p>

      {/* View on Adzuna Link */}
      <Link
        href={job.redirect_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-accent-teal hover:text-accent-teal/80 font-medium transition-colors"
      >
        View full details on Adzuna
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  )
}
