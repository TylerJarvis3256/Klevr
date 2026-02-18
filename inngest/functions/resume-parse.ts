import { inngest } from '@/lib/inngest'

export const resumeParseFunction = inngest.createFunction(
  {
    id: 'resume-parse',
    name: 'Resume Parsing',
    retries: 2,
  },
  { event: 'resume/parse' },
  async ({ event }) => {
    const { userId, resumeUrl } = event.data
    void userId
    void resumeUrl

    return { success: true }
  }
)
