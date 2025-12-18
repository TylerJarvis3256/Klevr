import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/saved-searches/[id]/results
 *
 * Fetch latest SavedSearchRun results for a saved search
 * Returns the run metadata and the job IDs found
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership of saved search
    const savedSearch = await prisma.savedSearch.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (!savedSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Get latest run
    const latestRun = await prisma.savedSearchRun.findFirst({
      where: {
        saved_search_id: id,
      },
      orderBy: {
        ran_at: 'desc',
      },
    })

    if (!latestRun) {
      return NextResponse.json({
        run: null,
        jobs: [],
        message: 'This search has not been run yet',
      })
    }

    // If run was successful and has job IDs, fetch those jobs from Adzuna
    // For now, just return the run metadata
    // In Phase 6, this will trigger a fresh search or return cached results
    return NextResponse.json({
      run: latestRun,
      jobIds: latestRun.adzuna_job_ids,
      newJobsCount: latestRun.new_jobs_count,
      totalJobsFound: latestRun.total_jobs_found,
    })
  } catch (error) {
    console.error('Error fetching saved search results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
