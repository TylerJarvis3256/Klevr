import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-input border bg-white px-4 py-3 text-sm',
          'placeholder:text-secondary/60',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-status-error focus:border-status-error focus:ring-red-100'
            : 'border-secondary/30 focus:border-accent-teal focus:ring-accent-teal/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
