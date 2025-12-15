'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LocationInputProps {
  value: string[]
  onChange: (locations: string[]) => void
  className?: string
}

export function LocationInput({ value, onChange, className }: LocationInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  const handleRemove = (location: string) => {
    onChange(value.filter((loc) => loc !== location))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Input field */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., San Francisco, CA or Remote"
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Location chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((location) => (
            <div
              key={location}
              className="inline-flex items-center gap-1 bg-primary text-secondary px-3 py-1.5 rounded-full text-sm font-medium"
            >
              {location}
              <button
                type="button"
                onClick={() => handleRemove(location)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-sm text-secondary/70">Add at least one location</p>
      )}
    </div>
  )
}
