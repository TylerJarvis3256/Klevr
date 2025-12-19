import type { Job } from '@prisma/client'
import { AlertCircle, Info } from 'lucide-react'

interface JobDescriptionProps {
  job: Job
}

export function JobDescription({ job }: JobDescriptionProps) {
  const MIN_DESCRIPTION_LENGTH = 300
  const isDescriptionTooShort = job.job_description_raw.length < MIN_DESCRIPTION_LENGTH
  const scrapingFailed = job.scraping_status === 'FAILED'

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Job Description</h2>

      {/* Warning: Scraping Failed */}
      {scrapingFailed && (
        <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900 mb-1">Unable to fetch full job description</p>
              <p className="text-sm text-orange-800">
                We couldn&apos;t scrape the complete job description from the source website.
                The description below is from the original job listing snippet.
                {isDescriptionTooShort && ' This may be too short for a reliable fit assessment.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning: Description Too Short */}
      {!scrapingFailed && isDescriptionTooShort && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Limited job description</p>
              <p className="text-sm text-blue-800">
                This job description is quite brief ({job.job_description_raw.length} characters).
                Fit assessments work best with detailed job descriptions (at least {MIN_DESCRIPTION_LENGTH} characters).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-secondary/80 leading-relaxed">
          {job.job_description_raw}
        </pre>
      </div>
    </div>
  )
}
