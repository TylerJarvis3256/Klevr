'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className,
}: MultiSelectProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter((v) => v !== value))
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((value) => {
            const option = options.find((opt) => opt.value === value)
            if (!option) return null

            return (
              <div
                key={value}
                className="inline-flex items-center gap-1 bg-primary text-secondary px-3 py-1 rounded-full text-sm font-medium"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => handleRemove(value)}
                  className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={cn(
                'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                isSelected
                  ? 'border-accent-teal bg-accent-teal/10 text-accent-teal'
                  : 'border-secondary/20 bg-white text-secondary hover:border-accent-teal/50'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-secondary/60">{placeholder}</p>
      )}
    </div>
  )
}
