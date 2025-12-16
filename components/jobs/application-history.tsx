'use client'

import { useEffect, useState } from 'react'
import { ActivityType } from '@prisma/client'
import {
  FileText,
  Mail,
  Search,
  Building2,
  StickyNote,
  Trash2,
  PlusCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: ActivityType
  metadata: Record<string, any> | null
  created_at: string
}

interface ApplicationHistoryProps {
  applicationId: string
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: React.ElementType
    label: string
    color: string
    getDescription: (metadata: Record<string, any> | null) => string
  }
> = {
  JOB_CREATED: {
    icon: PlusCircle,
    label: 'Job Created',
    color: 'text-accent-teal',
    getDescription: () => 'Job application was created',
  },
  STATUS_CHANGED: {
    icon: RefreshCw,
    label: 'Status Changed',
    color: 'text-accent-orange',
    getDescription: (metadata) =>
      metadata?.from && metadata?.to
        ? `Status changed from ${metadata.from} to ${metadata.to}`
        : 'Status was updated',
  },
  JOB_SCORING_STARTED: {
    icon: Search,
    label: 'Fit Analysis Started',
    color: 'text-secondary/60',
    getDescription: () => 'AI started analyzing job fit',
  },
  JOB_SCORING_COMPLETED: {
    icon: CheckCircle2,
    label: 'Fit Analysis Complete',
    color: 'text-success',
    getDescription: (metadata) =>
      metadata?.fit_bucket
        ? `Fit assessment completed - ${metadata.fit_bucket} match`
        : 'Fit assessment completed',
  },
  RESUME_GENERATED: {
    icon: FileText,
    label: 'Resume Generated',
    color: 'text-accent-teal',
    getDescription: () => 'Tailored resume was generated',
  },
  COVER_LETTER_GENERATED: {
    icon: Mail,
    label: 'Cover Letter Generated',
    color: 'text-accent-teal',
    getDescription: () => 'Tailored cover letter was generated',
  },
  COMPANY_RESEARCH_COMPLETED: {
    icon: Building2,
    label: 'Company Research Complete',
    color: 'text-secondary',
    getDescription: () => 'Company research was completed',
  },
  NOTE_ADDED: {
    icon: StickyNote,
    label: 'Note Added',
    color: 'text-accent-orange',
    getDescription: () => 'A new note was added',
  },
  NOTE_EDITED: {
    icon: StickyNote,
    label: 'Note Edited',
    color: 'text-secondary/60',
    getDescription: () => 'A note was edited',
  },
  DOCUMENT_DELETED: {
    icon: Trash2,
    label: 'Document Deleted',
    color: 'text-error',
    getDescription: (metadata) =>
      metadata?.document_type
        ? `${metadata.document_type.toLowerCase().replace('_', ' ')} was deleted`
        : 'A document was deleted',
  },
}

export function ApplicationHistory({ applicationId }: ApplicationHistoryProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/applications/${applicationId}/timeline`)
        if (!res.ok) {
          throw new Error('Failed to fetch timeline')
        }

        const data = await res.json()
        setActivities(data.activities || [])
      } catch (err) {
        setError('Failed to load activity history')
        console.error('Error fetching timeline:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeline()
  }, [applicationId])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) {
      // Less than a week
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    } else {
      // Show full date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error">{error}</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-xl bg-secondary/5 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="h-8 w-8 text-secondary/40" />
        </div>
        <h3 className="font-lora text-xl font-semibold text-secondary mb-2">
          No activity yet
        </h3>
        <p className="text-secondary/70">
          Activity will appear here as you work with this application
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const config = ACTIVITY_CONFIG[activity.type]
        if (!config) return null

        const Icon = config.icon
        const isLast = index === activities.length - 1

        return (
          <div key={activity.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-secondary/10" />
            )}

            {/* Icon */}
            <div
              className={cn(
                'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white border-2 border-secondary/10 z-10',
                config.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-secondary">{config.label}</p>
                  <p className="text-sm text-secondary/70 mt-0.5">
                    {config.getDescription(activity.metadata)}
                  </p>
                </div>
                <p className="text-xs text-secondary/60 whitespace-nowrap">
                  {formatTimestamp(activity.created_at)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
