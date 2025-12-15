import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { resumeParseFunction } from '@/inngest/functions/resume-parse'
import { jobScoringFunction } from '@/inngest/functions/job-scoring'
import { resumeGenerationFunction } from '@/inngest/functions/resume-generation'
import { coverLetterGenerationFunction } from '@/inngest/functions/cover-letter-generation'
import { companyResearchFunction } from '@/inngest/functions/company-research'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    resumeParseFunction,
    jobScoringFunction,
    resumeGenerationFunction,
    coverLetterGenerationFunction,
    companyResearchFunction,
  ],
})
