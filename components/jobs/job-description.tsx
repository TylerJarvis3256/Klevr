import type { Job } from '@prisma/client'

interface JobDescriptionProps {
  job: Job
}

export function JobDescription({ job }: JobDescriptionProps) {
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Job Description</h2>

      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-secondary/80 leading-relaxed">
          {job.job_description_raw}
        </pre>
      </div>
    </div>
  )
}
