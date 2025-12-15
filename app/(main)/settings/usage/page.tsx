'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, FileText, Mail, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UsageData {
  usage: {
    fitAssessments: {
      current: number
      limit: number
      percentage: number
    }
    resumes: {
      current: number
      limit: number
      percentage: number
    }
    coverLetters: {
      current: number
      limit: number
      percentage: number
    }
  }
  month: string
  resetDate: string
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  async function fetchUsage() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/settings/usage')
      if (!res.ok) throw new Error('Failed to fetch usage')
      const usageData = await res.json()
      setData(usageData)
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <p className="text-center text-secondary/70">Failed to load usage data</p>
      </div>
    )
  }

  const usageItems = [
    {
      name: 'Job Assessments',
      icon: TrendingUp,
      ...data.usage.fitAssessments,
      color: 'accent-teal',
    },
    {
      name: 'Resume Generations',
      icon: FileText,
      ...data.usage.resumes,
      color: 'accent-orange',
    },
    {
      name: 'Cover Letter Generations',
      icon: Mail,
      ...data.usage.coverLetters,
      color: 'accent-teal',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-2">
          AI Usage Dashboard
        </h2>
        <p className="text-secondary/70 mb-4">
          Track your monthly AI feature usage. Limits reset on the 1st of each month.
        </p>
        <div className="flex items-center gap-2 text-sm text-secondary/60">
          <span>Current month: {data.month}</span>
          <span>•</span>
          <span>Resets: {formatDate(data.resetDate)}</span>
        </div>
      </div>

      {/* Usage Cards */}
      <div className="space-y-4">
        {usageItems.map((item) => {
          const Icon = item.icon
          const isNearLimit = item.percentage >= 80
          const isAtLimit = item.percentage >= 100

          return (
            <div
              key={item.name}
              className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    `bg-${item.color}/10`
                  )}>
                    <Icon className={cn("h-6 w-6", `text-${item.color}`)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary">{item.name}</h3>
                    <p className="text-sm text-secondary/60">
                      {item.current} / {item.limit} used
                    </p>
                  </div>
                </div>

                {isNearLimit && (
                  <div
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold',
                      isAtLimit
                        ? 'bg-status-error/10 text-status-error'
                        : 'bg-warning/10 text-warning'
                    )}
                  >
                    {isAtLimit ? 'Limit Reached' : 'Near Limit'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary/70">{item.percentage}% used</span>
                  <span className="font-medium text-secondary">
                    {item.limit - item.current} remaining
                  </span>
                </div>
                <Progress
                  value={item.percentage}
                  className={cn(
                    "h-3",
                    isAtLimit && "bg-status-error/10",
                    isNearLimit && !isAtLimit && "bg-warning/10"
                  )}
                />
              </div>

              {isNearLimit && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-warning/5 border border-warning/20">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    {isAtLimit
                      ? 'You have reached your monthly limit for this feature. Your limit will reset on the 1st of next month.'
                      : 'You are approaching your monthly limit for this feature.'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Card */}
      <div className="bg-accent-teal/5 rounded-2xl border border-accent-teal/20 p-6">
        <h3 className="font-semibold text-secondary mb-2">About Usage Limits</h3>
        <p className="text-sm text-secondary/70 leading-relaxed">
          AI usage limits help ensure fair access to our AI-powered features for all users. Limits
          reset automatically on the 1st day of each month. If you need higher limits, please
          contact support.
        </p>
      </div>
    </div>
  )
}
