import { Badge } from '@/components/ui/badge'
import { FitBucket } from '@prisma/client'
import { cn } from '@/lib/utils'

interface FitBadgeProps {
  fitBucket: FitBucket
  className?: string
}

const FIT_STYLES = {
  EXCELLENT: 'bg-green-100 text-green-800 border-green-200',
  GOOD: 'bg-blue-100 text-blue-800 border-blue-200',
  FAIR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  POOR: 'bg-red-100 text-red-800 border-red-200',
}

const FIT_LABELS = {
  EXCELLENT: 'Excellent Fit',
  GOOD: 'Good Fit',
  FAIR: 'Fair Fit',
  POOR: 'Poor Fit',
}

export function FitBadge({ fitBucket, className }: FitBadgeProps) {
  return (
    <Badge className={cn(FIT_STYLES[fitBucket], 'font-medium border', className)}>
      {FIT_LABELS[fitBucket]}
    </Badge>
  )
}
