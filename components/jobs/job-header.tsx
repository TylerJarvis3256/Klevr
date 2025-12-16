'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Job, Application } from '@prisma/client'
import { toast } from 'sonner'
import { EditJobDialog } from './edit-job-dialog'

interface JobHeaderProps {
  job: Job
  application: Application
}

const STATUS_LABELS = {
  PLANNED: 'Planned',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
}

const FIT_COLORS = {
  EXCELLENT: 'bg-status-success/10 text-status-success border-status-success/20',
  GOOD: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  FAIR: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  POOR: 'bg-status-error/10 text-status-error border-status-error/20',
}

export function JobHeader({ job, application }: JobHeaderProps) {
  const router = useRouter()
  const [status, setStatus] = useState(application.status)

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setStatus(newStatus as any)
      toast.success('Status updated successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Job deleted successfully')
      router.push('/jobs')
    } catch (error) {
      toast.error('Failed to delete job')
    }
  }

  return (
    <div className="border-b border-secondary/10 pb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="font-lora text-4xl font-bold text-secondary mb-2">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-secondary/80 mb-4">
            <span className="text-lg font-medium">{job.company}</span>
            {job.location && (
              <>
                <span className="text-secondary/40">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
              </>
            )}
            {job.job_url && (
              <>
                <span className="text-secondary/40">•</span>
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent-teal hover:text-accent-teal/80 transition-colors"
                >
                  View Posting
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {application.fit_bucket && (
              <Badge className={FIT_COLORS[application.fit_bucket]}>
                {application.fit_bucket.charAt(0) + application.fit_bucket.slice(1).toLowerCase()} Fit
              </Badge>
            )}

            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <EditJobDialog
            job={job}
            trigger={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Pencil className="w-4 h-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" onClick={handleDelete} className="rounded-full">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
