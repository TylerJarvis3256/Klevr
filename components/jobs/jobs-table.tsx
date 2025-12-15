import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { FitBadge } from './fit-badge'
import Link from 'next/link'
import type { Application, Job } from '@prisma/client'

interface JobsTableProps {
  applications: (Application & { Job: Job })[]
}

const STATUS_COLORS = {
  PLANNED: 'bg-secondary/10 text-secondary border-secondary/20',
  APPLIED: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  INTERVIEW: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  OFFER: 'bg-status-success/10 text-status-success border-status-success/20',
  REJECTED: 'bg-status-error/10 text-status-error border-status-error/20',
}

export function JobsTable({ applications }: JobsTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-primary/30 border-b border-secondary/10">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">Job Title</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">Company</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">Fit</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">Updated</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr
                key={app.id}
                className="border-b border-secondary/10 last:border-0 hover:bg-primary/20 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/jobs/${app.Job.id}`}
                    className="text-accent-teal hover:text-accent-teal/80 font-medium transition-colors"
                  >
                    {app.Job.title}
                  </Link>
                </td>
                <td className="px-6 py-4 text-secondary/80">{app.Job.company}</td>
                <td className="px-6 py-4">
                  <Badge className={STATUS_COLORS[app.status]}>
                    {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {app.fit_bucket ? (
                    <FitBadge fitBucket={app.fit_bucket} />
                  ) : (
                    <span className="text-sm text-secondary/60">Analyzing...</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-secondary/70">
                  {formatDate(app.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
