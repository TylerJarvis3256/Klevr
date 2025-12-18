'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  keywords: string
  location: string
  remoteOnly: boolean
  onKeywordsChange: (value: string) => void
  onLocationChange: (value: string) => void
  onRemoteToggle: (value: boolean) => void
  onSearch: () => void
  onClear: () => void
}

export function SearchBar({
  keywords,
  location,
  remoteOnly,
  onKeywordsChange,
  onLocationChange,
  onRemoteToggle,
  onSearch,
  onClear,
}: SearchBarProps) {
  const hasFilters = keywords || location || remoteOnly

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6">
      <div className="flex flex-col gap-4">
        {/* Keywords & Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Keywords */}
          <div className="flex-1">
            <Label htmlFor="keywords" className="text-sm font-medium text-secondary mb-2 block">
              Keywords
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/60" />
              <Input
                id="keywords"
                placeholder="Job title, skills, company..."
                value={keywords}
                onChange={(e) => onKeywordsChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="pl-10"
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex-1">
            <Label htmlFor="location" className="text-sm font-medium text-secondary mb-2 block">
              Location
            </Label>
            <Input
              id="location"
              placeholder="City, state, or zip code"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
        </div>

        {/* Remote Toggle & Actions Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Remote Only Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="remote"
              checked={remoteOnly}
              onCheckedChange={onRemoteToggle}
            />
            <Label
              htmlFor="remote"
              className="text-sm font-medium text-secondary cursor-pointer"
            >
              Remote jobs only
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Button
              onClick={onSearch}
              size="sm"
              className="rounded-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Jobs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
