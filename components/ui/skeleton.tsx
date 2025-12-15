import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-secondary/10',
        className
      )}
      aria-hidden="true"
    />
  )
}

// Common skeleton patterns for reuse

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function SkeletonApplicationCard() {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-secondary/10">
      <Skeleton className="h-5 w-1/4" />
      <Skeleton className="h-5 w-1/6" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-5 w-32" />
    </div>
  )
}
