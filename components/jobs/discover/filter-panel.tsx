'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Briefcase, ArrowDownUp } from 'lucide-react'

interface FilterPanelProps {
  salaryMin: string
  fullTime: boolean
  permanent: boolean
  sortBy: 'date' | 'salary'
  onSalaryMinChange: (value: string) => void
  onFullTimeToggle: (value: boolean) => void
  onPermanentToggle: (value: boolean) => void
  onSortByChange: (value: 'date' | 'salary') => void
}

export function FilterPanel({
  salaryMin,
  fullTime,
  permanent,
  sortBy,
  onSalaryMinChange,
  onFullTimeToggle,
  onPermanentToggle,
  onSortByChange,
}: FilterPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6">
      <h3 className="font-lora text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5" />
        Filters
      </h3>

      <div className="space-y-4">
        {/* Minimum Salary */}
        <div>
          <Label htmlFor="salary-min" className="text-sm font-medium text-secondary mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Minimum Salary
          </Label>
          <Input
            id="salary-min"
            type="number"
            placeholder="e.g., 70000"
            value={salaryMin}
            onChange={(e) => onSalaryMinChange(e.target.value)}
            min="0"
            step="5000"
          />
          <p className="text-xs text-secondary/60 mt-1">Annual salary in USD</p>
        </div>

        {/* Job Type Toggles */}
        <div className="space-y-3 pt-2 border-t border-secondary/10">
          {/* Full-time */}
          <div className="flex items-center justify-between">
            <Label htmlFor="full-time" className="text-sm font-medium text-secondary cursor-pointer">
              Full-time only
            </Label>
            <Switch
              id="full-time"
              checked={fullTime}
              onCheckedChange={onFullTimeToggle}
            />
          </div>

          {/* Permanent */}
          <div className="flex items-center justify-between">
            <Label htmlFor="permanent" className="text-sm font-medium text-secondary cursor-pointer">
              Permanent only
            </Label>
            <Switch
              id="permanent"
              checked={permanent}
              onCheckedChange={onPermanentToggle}
            />
          </div>
        </div>

        {/* Sort By */}
        <div className="pt-2 border-t border-secondary/10">
          <Label htmlFor="sort-by" className="text-sm font-medium text-secondary mb-2 flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" />
            Sort By
          </Label>
          <Select value={sortBy} onValueChange={(value) => onSortByChange(value as 'date' | 'salary')}>
            <SelectTrigger id="sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
