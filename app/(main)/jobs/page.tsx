'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JobsTable } from '@/components/jobs/jobs-table'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTableRow } from '@/components/ui/skeleton'
import { Plus, Search, Loader2, Inbox } from 'lucide-react'
import type { Application, Job } from '@prisma/client'

type ApplicationWithJob = Application & { Job: Job }

function JobsListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [fitBucket, setFitBucket] = useState(searchParams.get('fit_bucket') || 'all')
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function fetchJobs() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      const searchValue = searchParams.get('search')
      const statusValue = searchParams.get('status')
      const fitBucketValue = searchParams.get('fit_bucket')

      if (searchValue) params.set('search', searchValue)
      if (statusValue && statusValue !== 'all') params.set('status', statusValue)
      if (fitBucketValue && fitBucketValue !== 'all') params.set('fit_bucket', fitBucketValue)

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')

      const data = await res.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function updateFilters() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (fitBucket !== 'all') params.set('fit_bucket', fitBucket)

    router.push(`/jobs?${params}`)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Jobs</h1>
          <p className="text-secondary/80">Track and manage your job applications</p>
        </div>
        <Link href="/jobs/new">
          <Button className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/60" />
            <Input
              placeholder="Search jobs or companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && updateFilters()}
              className="pl-10"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="APPLIED">Applied</SelectItem>
              <SelectItem value="INTERVIEW">Interview</SelectItem>
              <SelectItem value="OFFER">Offer</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fitBucket} onValueChange={setFitBucket}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Fit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fits</SelectItem>
              <SelectItem value="EXCELLENT">Excellent Fit</SelectItem>
              <SelectItem value="GOOD">Good Fit</SelectItem>
              <SelectItem value="FAIR">Fair Fit</SelectItem>
              <SelectItem value="POOR">Poor Fit</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={updateFilters} className="rounded-full">Apply Filters</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6">
          <div className="space-y-4">
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-12">
          <EmptyState
            icon={Inbox}
            title="No jobs found"
            description="Add your first job to get started tracking your applications."
            action={{
              label: 'Add Your First Job',
              onClick: () => {
                window.location.href = '/jobs/new'
              },
              variant: 'cta',
            }}
          />
        </div>
      ) : (
        <JobsTable applications={applications} onUpdate={fetchJobs} />
      )}
    </div>
  )
}

export default function JobsListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
      </div>
    }>
      <JobsListContent />
    </Suspense>
  )
}
