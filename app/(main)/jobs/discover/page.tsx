'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchBar } from '@/components/jobs/discover/search-bar'
import { FilterPanel } from '@/components/jobs/discover/filter-panel'
import { JobResultCard } from '@/components/jobs/discover/job-result-card'
import { AdzunaAttribution } from '@/components/jobs/discover/adzuna-attribution'
import { SavedSearchesDropdown } from '@/components/jobs/discover/saved-searches-dropdown'
import { Loader2, Search as SearchIcon, AlertCircle, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import type { AdzunaJob, AdzunaSearchResponse } from '@/lib/adzuna'

function DiscoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Search state
  const [keywords, setKeywords] = useState(searchParams.get('what') || '')
  const [location, setLocation] = useState(searchParams.get('where') || '')
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get('remote') === 'true')
  const [salaryMin, setSalaryMin] = useState(searchParams.get('salary_min') || '')
  const [fullTime, setFullTime] = useState(searchParams.get('full_time') === '1')
  const [permanent, setPermanent] = useState(searchParams.get('permanent') === '1')
  const [sortBy, setSortBy] = useState<'date' | 'salary'>(
    (searchParams.get('sort_by') as 'date' | 'salary') || 'date'
  )
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  // Results state
  const [results, setResults] = useState<AdzunaSearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  // Fetch results when URL params change
  useEffect(() => {
    const hasSearchCriteria = keywords || location || remoteOnly || salaryMin || fullTime || permanent
    if (hasSearchCriteria) {
      fetchJobs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function fetchJobs() {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()

      // Build search query with remote keyword strategy
      let whatQuery = keywords.trim()
      if (remoteOnly && !whatQuery.toLowerCase().includes('remote')) {
        whatQuery = whatQuery ? `${whatQuery} remote` : 'remote'
      }
      if (whatQuery) params.set('what', whatQuery)

      if (location) params.set('where', location)
      if (salaryMin) params.set('salary_min', salaryMin)
      if (fullTime) params.set('full_time', '1')
      if (permanent) params.set('permanent', '1')
      if (sortBy) params.set('sort_by', sortBy)
      params.set('page', page.toString())
      params.set('results_per_page', '10')

      const res = await fetch(`/api/jobs/search?${params}`)

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to search jobs')
      }

      const data = await res.json()
      setResults(data)

      // Check which jobs are already saved
      if (data.results?.length > 0) {
        await checkSavedJobs(data.results)
      }
    } catch (error: any) {
      console.error('Error searching jobs:', error)
      setError(error.message)
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function checkSavedJobs(jobs: AdzunaJob[]) {
    try {
      const adzunaIds = jobs.map(job => job.id)
      const res = await fetch('/api/jobs/check-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adzunaIds }),
      })

      if (res.ok) {
        const data = await res.json()
        setSavedJobIds(new Set(data.savedIds || []))
      }
    } catch (error) {
      console.error('Error checking saved jobs:', error)
      // Non-critical - don't show error to user
    }
  }

  function updateURL() {
    const params = new URLSearchParams()

    if (keywords) params.set('what', keywords)
    if (location) params.set('where', location)
    if (remoteOnly) params.set('remote', 'true')
    if (salaryMin) params.set('salary_min', salaryMin)
    if (fullTime) params.set('full_time', '1')
    if (permanent) params.set('permanent', '1')
    if (sortBy !== 'date') params.set('sort_by', sortBy)
    if (page > 1) params.set('page', page.toString())

    router.push(`/jobs/discover?${params}`)
  }

  function handleSearch() {
    setPage(1) // Reset to page 1 on new search
    updateURL()
  }

  function handleClear() {
    setKeywords('')
    setLocation('')
    setRemoteOnly(false)
    setSalaryMin('')
    setFullTime(false)
    setPermanent(false)
    setSortBy('date')
    setPage(1)
    setResults(null)
    router.push('/jobs/discover')
  }

  function handleLoadSavedSearch(config: any) {
    setKeywords(config.what || '')
    setLocation(config.where || '')
    setSalaryMin(config.salary_min?.toString() || '')
    setFullTime(config.full_time === 1)
    setPermanent(config.permanent === 1)
    setSortBy(config.sort_by || 'date')
    setPage(1)

    // Trigger search with new params
    setTimeout(updateURL, 0)
  }

  function handleSaveSearch() {
    // TODO Phase 4: Open save search modal
    toast.info('Save search feature coming in Phase 4')
  }

  async function handleSaveJob(job: AdzunaJob) {
    const res = await fetch('/api/jobs/from-adzuna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adzuna_id: job.id,
        title: job.title,
        company: job.company.display_name,
        location: job.location.display_name,
        job_url: job.redirect_url,
        job_description_raw: job.description,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        contract_type: job.contract_type,
        contract_time: job.contract_time,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to save job')
    }

    // Add to saved set
    setSavedJobIds(prev => new Set([...prev, job.id]))
  }

  function handlePreviousPage() {
    if (page > 1) {
      setPage(page - 1)
      setTimeout(updateURL, 0)
    }
  }

  function handleNextPage() {
    setPage(page + 1)
    setTimeout(updateURL, 0)
  }

  const hasSearchCriteria = keywords || location || remoteOnly || salaryMin || fullTime || permanent
  const totalPages = results ? Math.ceil(results.count / 10) : 0

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Discover Jobs</h1>
          <p className="text-secondary/80">Search and save jobs from thousands of listings</p>
        </div>

        <div className="flex items-center gap-3">
          <SavedSearchesDropdown
            onLoadSearch={handleLoadSavedSearch}
            onNewSearch={handleSaveSearch}
          />

          {hasSearchCriteria && (
            <Button
              onClick={handleSaveSearch}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Save Search
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          keywords={keywords}
          location={location}
          remoteOnly={remoteOnly}
          onKeywordsChange={setKeywords}
          onLocationChange={setLocation}
          onRemoteToggle={setRemoteOnly}
          onSearch={handleSearch}
          onClear={handleClear}
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters */}
        <aside className="lg:col-span-1">
          <FilterPanel
            salaryMin={salaryMin}
            fullTime={fullTime}
            permanent={permanent}
            sortBy={sortBy}
            onSalaryMinChange={setSalaryMin}
            onFullTimeToggle={setFullTime}
            onPermanentToggle={setPermanent}
            onSortByChange={setSortBy}
          />
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          {/* Adzuna Attribution */}
          {results && results.results.length > 0 && (
            <div className="mb-4">
              <AdzunaAttribution />
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-accent-teal mb-4" />
              <p className="text-secondary/70">Searching for jobs...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-white rounded-2xl border border-status-error/20 shadow-card p-12">
              <EmptyState
                icon={AlertCircle}
                title="Search failed"
                description={error}
                action={{
                  label: 'Try Again',
                  onClick: fetchJobs,
                  variant: 'cta',
                }}
              />
            </div>
          )}

          {/* Empty State - No Search Yet */}
          {!results && !isLoading && !error && (
            <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-12">
              <EmptyState
                icon={SearchIcon}
                title="Start your job search"
                description="Enter keywords, location, or use filters to discover thousands of job opportunities."
              />
            </div>
          )}

          {/* Empty State - No Results */}
          {results && results.results.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-12">
              <EmptyState
                icon={SearchIcon}
                title="No jobs found"
                description="Try adjusting your search criteria or filters to see more results."
                action={{
                  label: 'Clear Filters',
                  onClick: handleClear,
                  variant: 'outline',
                }}
              />
            </div>
          )}

          {/* Results List */}
          {results && results.results.length > 0 && !isLoading && (
            <>
              {/* Results Summary */}
              <div className="mb-4">
                <p className="text-sm text-secondary/70">
                  Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, results.count)} of {results.count.toLocaleString()} jobs
                </p>
              </div>

              {/* Job Cards */}
              <div className="space-y-4 mb-6">
                {results.results.map((job) => (
                  <JobResultCard
                    key={job.id}
                    job={job}
                    onSave={handleSaveJob}
                    isSaved={savedJobIds.has(job.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-secondary/10 shadow-card p-4">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <span className="text-sm text-secondary/70">
                    Page {page} of {totalPages}
                  </span>

                  <Button
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
}
