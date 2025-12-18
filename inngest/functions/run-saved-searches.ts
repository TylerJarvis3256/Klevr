import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { searchAdzunaJobs } from '@/lib/adzuna'
import { calculateNextRunAt } from '@/lib/saved-searches'
import { sendSavedSearchEmail } from '@/lib/email'

// Type for saved search query config
interface SavedSearchQueryConfig {
  what?: string
  what_exclude?: string
  where?: string
  salary_min?: number
  full_time?: 0 | 1
  permanent?: 0 | 1
  results_per_page?: number
  sort_by?: 'date' | 'salary'
}

// Result types for saved search runs
interface SavedSearchSuccessResult {
  searchId: string
  searchName: string
  totalJobs: number
  newJobs: number
  notificationSent: boolean
}

interface SavedSearchErrorResult {
  searchId: string
  searchName: string
  error: string
}

type SavedSearchResult = SavedSearchSuccessResult | SavedSearchErrorResult

// Type guard to check if result is error
function isErrorResult(result: SavedSearchResult): result is SavedSearchErrorResult {
  return 'error' in result
}

/**
 * Scheduled job to run saved searches
 *
 * Schedule: Every hour at :00
 * - Finds saved searches that need to run (next_run_at <= now)
 * - Executes Adzuna search for each
 * - Deduplicates results against previous runs
 * - Creates notifications for new jobs
 * - Sends emails if enabled
 * - Updates next_run_at for next execution
 */
export const runSavedSearches = inngest.createFunction(
  {
    id: 'run-saved-searches',
    name: 'Run Saved Searches',
  },
  { cron: '0 * * * *' }, // Every hour at :00
  async ({ step, logger }) => {
    // Find all saved searches that need to run
    const searchesToRun = await step.run('find-searches-to-run', async () => {
      const now = new Date()
      return await prisma.savedSearch.findMany({
        where: {
          active: true,
          next_run_at: {
            lte: now,
          },
        },
        include: {
          User: {
            select: {
              email: true,
            },
          },
        },
      })
    })

    logger.info(`Found ${searchesToRun.length} saved searches to run`)

    if (searchesToRun.length === 0) {
      return { message: 'No saved searches to run', searchesProcessed: 0 }
    }

    // Process each saved search
    const results = await Promise.all(
      searchesToRun.map(search =>
        step.run(`run-search-${search.id}`, async () => {
          try {
            // Cast query_config to proper type
            const queryConfig = search.query_config as SavedSearchQueryConfig | null
            if (!queryConfig) {
              throw new Error('Query config is null')
            }

            // Execute Adzuna search
            const adzunaResults = await searchAdzunaJobs({
              what: queryConfig.what,
              what_exclude: queryConfig.what_exclude,
              where: queryConfig.where,
              salary_min: queryConfig.salary_min,
              full_time: queryConfig.full_time,
              permanent: queryConfig.permanent,
              results_per_page: 50, // Get more results for saved searches
              page: 1,
              sort_by: queryConfig.sort_by || 'date',
            })

            // Get job IDs from this run
            const currentJobIds = adzunaResults.results.map(job => job.id)

            // Get previous run to check for duplicates
            const previousRun = await prisma.savedSearchRun.findFirst({
              where: {
                saved_search_id: search.id,
              },
              orderBy: {
                ran_at: 'desc',
              },
            })

            // Deduplicate: find jobs not in previous run
            const previousJobIds = previousRun?.adzuna_job_ids || []
            const newJobIds = currentJobIds.filter(id => !previousJobIds.includes(id))

            logger.info(
              `Search "${search.name}": Found ${adzunaResults.count} total jobs, ${newJobIds.length} new`
            )

            // Create SavedSearchRun record
            const searchRun = await prisma.savedSearchRun.create({
              data: {
                saved_search_id: search.id,
                new_jobs_count: newJobIds.length,
                total_jobs_found: adzunaResults.count,
                adzuna_job_ids: currentJobIds,
                status: 'SUCCESS',
              },
            })

            // Calculate next run time
            const nextRunAt = calculateNextRunAt({
              frequency: search.frequency,
              scheduleTime: '08:00', // Default time, should be stored in SavedSearch
              dayOfWeek: undefined, // Should be stored in SavedSearch
              dayOfMonth: undefined, // Should be stored in SavedSearch
              timezone: search.user_timezone || 'America/New_York',
            })

            // Update saved search
            await prisma.savedSearch.update({
              where: { id: search.id },
              data: {
                last_run_at: new Date(),
                next_run_at: nextRunAt,
              },
            })

            // If new jobs found, create notification and send email
            if (newJobIds.length > 0) {
              // Create in-app notification
              if (search.notify_in_app) {
                await prisma.notification.create({
                  data: {
                    user_id: search.user_id,
                    type: 'SAVED_SEARCH_NEW_JOBS',
                    title: `${newJobIds.length} new jobs for "${search.name}"`,
                    body: `We found ${newJobIds.length} new job${newJobIds.length === 1 ? '' : 's'} matching your saved search.`,
                    link_url: `/jobs/discover?searchRunId=${searchRun.id}`,
                    metadata: {
                      saved_search_id: search.id,
                      new_jobs_count: newJobIds.length,
                      search_run_id: searchRun.id,
                    },
                  },
                })
              }

              // Send email notification
              if (search.notify_email && search.User?.email) {
                const topJobs = adzunaResults.results
                  .filter(job => newJobIds.includes(job.id))
                  .slice(0, 5)
                  .map(job => ({
                    title: job.title,
                    company: job.company.display_name,
                    location: job.location.display_name,
                  }))

                await sendSavedSearchEmail({
                  to: search.User.email,
                  searchName: search.name,
                  newJobsCount: newJobIds.length,
                  jobs: topJobs,
                  viewResultsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/discover?searchRunId=${searchRun.id}`,
                })
              }
            }

            return {
              searchId: search.id,
              searchName: search.name,
              totalJobs: adzunaResults.count,
              newJobs: newJobIds.length,
              notificationSent: newJobIds.length > 0,
            }
          } catch (error) {
            logger.error(`Error running search "${search.name}":`, error)

            // Log failed run
            await prisma.savedSearchRun.create({
              data: {
                saved_search_id: search.id,
                new_jobs_count: 0,
                total_jobs_found: 0,
                adzuna_job_ids: [],
                status: 'FAILED',
                error_message: error instanceof Error ? error.message : 'Unknown error',
              },
            })

            return {
              searchId: search.id,
              searchName: search.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )
    )

    const successCount = results.filter(r => !isErrorResult(r)).length
    const failureCount = results.filter(r => isErrorResult(r)).length
    const totalNewJobs = results.reduce((sum, r) => {
      return sum + (isErrorResult(r) ? 0 : r.newJobs)
    }, 0)

    return {
      message: 'Saved searches processed',
      searchesProcessed: searchesToRun.length,
      successCount,
      failureCount,
      totalNewJobs,
      results,
    }
  }
)
