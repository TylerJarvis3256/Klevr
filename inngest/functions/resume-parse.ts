import { inngest } from '@/lib/inngest'

// TODO: This function should be implemented as part of resume parsing
// For now, it's a placeholder. The actual resume parsing happens in the API route
export const resumeParseFunction = inngest.createFunction(
  {
    id: 'resume-parse',
    name: 'Resume Parsing',
    retries: 2,
  },
  { event: 'resume/parse' },
  async ({ event }) => {
    const { userId, resumeUrl } = event.data
    console.log('Resume parsing triggered (currently handled in API)', { userId, resumeUrl })

    // NOTE: Resume parsing is currently done synchronously in the API route
    // This function exists for potential async processing in the future

    return { success: true }
  }
)
