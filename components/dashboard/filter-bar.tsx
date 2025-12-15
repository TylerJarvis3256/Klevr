'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApplicationStatus, FitBucket } from '@prisma/client'
import { useEffect, useState } from 'react'

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [fitFilter, setFitFilter] = useState(searchParams.get('fit') || 'ALL')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()

    if (searchQuery) params.set('search', searchQuery)
    if (fitFilter !== 'ALL') params.set('fit', fitFilter)
    if (statusFilter !== 'ALL') params.set('status', statusFilter)

    const queryString = params.toString()
    const newUrl = queryString ? `/dashboard?${queryString}` : '/dashboard'

    router.push(newUrl, { scroll: false })

    // Persist to localStorage
    localStorage.setItem('dashboard-filters', JSON.stringify({ searchQuery, fitFilter, statusFilter }))
  }, [searchQuery, fitFilter, statusFilter, router])

  // Restore filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard-filters')
      if (saved && !searchParams.toString()) {
        const { searchQuery: savedSearch, fitFilter: savedFit, statusFilter: savedStatus } = JSON.parse(saved)
        if (savedSearch) setSearchQuery(savedSearch)
        if (savedFit) setFitFilter(savedFit)
        if (savedStatus) setStatusFilter(savedStatus)
      }
    } catch (error) {
      console.error('Failed to restore filters:', error)
    }
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
          <Input
            type="text"
            placeholder="Search jobs or companies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Fit Filter */}
        <Select value={fitFilter} onValueChange={setFitFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by fit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Fit Levels</SelectItem>
            <SelectItem value={FitBucket.EXCELLENT}>Excellent Fit</SelectItem>
            <SelectItem value={FitBucket.GOOD}>Good Fit</SelectItem>
            <SelectItem value={FitBucket.FAIR}>Fair Fit</SelectItem>
            <SelectItem value={FitBucket.POOR}>Poor Fit</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active Only</SelectItem>
            <SelectItem value={ApplicationStatus.PLANNED}>Planned</SelectItem>
            <SelectItem value={ApplicationStatus.APPLIED}>Applied</SelectItem>
            <SelectItem value={ApplicationStatus.INTERVIEW}>Interview</SelectItem>
            <SelectItem value={ApplicationStatus.OFFER}>Offer</SelectItem>
            <SelectItem value={ApplicationStatus.REJECTED}>Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
