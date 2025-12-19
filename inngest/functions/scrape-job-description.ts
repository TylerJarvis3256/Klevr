import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { scrapeJobDescription } from '@/lib/crawlee-scraper'

/**
 * Inngest Function: Scrape Job Description
 *
 * Scrapes full job description from Adzuna redirect URL
 * before AI fit scoring runs.
 *
 * Flow:
 * 1. Mark scraping in progress
 * 2. Fetch job details
 * 3. Scrape job description (CheerioCrawler → PlaywrightCrawler)
 * 4. Update job with scraped content or keep snippet
 * 5. Trigger job scoring (always, even if scraping failed)
 */
export const scrapeJobDescriptionFunction = inngest.createFunction(
  {
    id: 'scrape-job-description',
    name: 'Scrape Job Description',
    retries: 1, // Best-effort, don't retry too many times
  },
  { event: 'job/scrape-description' },
  async ({ event, step }) => {
    const { jobId, userId, applicationId } = event.data

    // Step 1: Mark scraping in progress
    await step.run('mark-in-progress', async () => {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          scraping_status: 'IN_PROGRESS',
          scraping_attempted_at: new Date(),
        },
      })
    })

    try {
      // Step 2: Fetch job details
      const job = await step.run('fetch-job', async () => {
        return prisma.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            job_url: true,
            job_description_raw: true,
          },
        })
      })

      if (!job) {
        throw new Error('Job not found')
      }

      if (!job.job_url) {
        throw new Error('Job has no URL to scrape')
      }

      // Step 3: Scrape job description
      const scrapeResult = await step.run('scrape-content', async () => {
        return scrapeJobDescription(job.job_url!, job.job_description_raw)
      })

      // Step 4: Update job with scrape results
      const finalDescription = await step.run('update-job', async () => {
        if (scrapeResult.success && scrapeResult.description) {
          // Success - update with full description
          await prisma.job.update({
            where: { id: jobId },
            data: {
              job_description_raw: scrapeResult.description,
              scraping_status: 'SUCCESS',
              scraping_completed_at: new Date(),
              scraping_method: scrapeResult.method,
              final_source_url: scrapeResult.finalUrl,
            },
          })
          return scrapeResult.description
        } else {
          // Failed - keep original snippet
          await prisma.job.update({
            where: { id: jobId },
            data: {
              scraping_status: 'FAILED',
              scraping_completed_at: new Date(),
              scraping_error: scrapeResult.error || 'Unknown error',
              final_source_url: scrapeResult.finalUrl,
            },
          })
          return job.job_description_raw
        }
      })

      // Step 5: Trigger job scoring ONLY if description is long enough
      const MIN_DESCRIPTION_LENGTH = 300
      const shouldScore = finalDescription.length >= MIN_DESCRIPTION_LENGTH

      if (shouldScore) {
        await step.run('trigger-scoring', async () => {
          await inngest.send({
            name: 'job/assess-fit',
            data: {
              userId,
              applicationId,
              // Don't provide taskId - let job-scoring create it
            },
          })
        })
      } else {
        console.log(
          `[Scraper] Skipping job scoring for job ${jobId} - description too short (${finalDescription.length} chars, minimum ${MIN_DESCRIPTION_LENGTH})`
        )
      }

      return {
        jobId,
        success: scrapeResult.success,
        method: scrapeResult.method,
        error: scrapeResult.error,
      }
    } catch (error) {
      // Mark failure and check if we should still trigger scoring
      const job = await step.run('mark-failure', async () => {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            scraping_status: 'FAILED',
            scraping_completed_at: new Date(),
            scraping_error:
              error instanceof Error ? error.message : 'Unknown error',
          },
        })

        // Fetch job to get original snippet
        return prisma.job.findUnique({
          where: { id: jobId },
          select: { job_description_raw: true },
        })
      })

      // Only trigger scoring if snippet is long enough
      const MIN_DESCRIPTION_LENGTH = 300
      const shouldScore =
        job && job.job_description_raw.length >= MIN_DESCRIPTION_LENGTH

      if (shouldScore) {
        await step.run('trigger-scoring-after-error', async () => {
          await inngest.send({
            name: 'job/assess-fit',
            data: {
              userId,
              applicationId,
            },
          })
        })
      } else {
        console.log(
          `[Scraper] Skipping job scoring after error for job ${jobId} - description too short`
        )
      }

      throw error
    }
  }
)
