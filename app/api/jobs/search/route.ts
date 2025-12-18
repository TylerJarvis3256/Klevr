import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { searchAdzunaJobs } from '@/lib/adzuna'
import { getCachedSearchResults, setCachedSearchResults } from '@/lib/adzuna-cache'
import { logActivity } from '@/lib/activity-log'
import type { AdzunaSearchParams } from '@/lib/adzuna'

/**
 * GET /api/jobs/search
 *
 * Search for jobs using Adzuna API with caching
 * Query params match AdzunaSearchParams interface
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Build search parameters
    const params: AdzunaSearchParams = {
      what: searchParams.get('what') || undefined,
      what_exclude: searchParams.get('what_exclude') || undefined,
      where: searchParams.get('where') || undefined,
      salary_min: searchParams.get('salary_min')
        ? parseInt(searchParams.get('salary_min')!)
        : undefined,
      full_time: searchParams.get('full_time') === '1' ? 1 : undefined,
      permanent: searchParams.get('permanent') === '1' ? 1 : undefined,
      results_per_page: searchParams.get('results_per_page')
        ? parseInt(searchParams.get('results_per_page')!)
        : 10,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!)
        : 1,
      sort_by: (searchParams.get('sort_by') as 'date' | 'salary') || 'date',
    }

    // Check cache first
    const cached = await getCachedSearchResults(params)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Call Adzuna API
    const results = await searchAdzunaJobs(params)

    // Cache results (15 minutes for interactive searches)
    await setCachedSearchResults(params, results)

    // Log search activity (non-blocking)
    logActivity({
      user_id: user.id,
      type: 'SEARCH_PERFORMED',
      metadata: {
        keywords: params.what,
        location: params.where,
        filters: {
          salary_min: params.salary_min,
          full_time: params.full_time,
          permanent: params.permanent,
        },
        results_count: results.count,
      },
    }).catch(err => console.error('Failed to log search activity:', err))

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error searching jobs:', error)

    // Return user-friendly error messages
    if (error.message.includes('Rate limit exceeded')) {
      return NextResponse.json(
        { error: 'Search rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      )
    }

    if (error.message.includes('Adzuna API')) {
      return NextResponse.json(
        { error: 'Job search service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search jobs. Please try again.' },
      { status: 500 }
    )
  }
}
