import { ApplicationStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

const statusStyles: Record<ApplicationStatus, string> = {
  PLANNED: 'bg-secondary/10 text-secondary border-secondary/20',
  APPLIED: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  INTERVIEW: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  OFFER: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-error/10 text-error border-error/20',
}

const statusLabels: Record<ApplicationStatus, string> = {
  PLANNED: 'Planned',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
