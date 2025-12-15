import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'cta' | 'default' | 'outline'
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="h-16 w-16 rounded-xl bg-secondary/5 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-secondary/40" aria-hidden="true" />
      </div>
      <h3 className="font-lora text-xl font-semibold text-secondary mb-2">
        {title}
      </h3>
      <p className="text-secondary/70 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'cta'}
          className="rounded-full"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
