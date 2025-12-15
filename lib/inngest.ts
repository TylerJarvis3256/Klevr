import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'klevr',
  name: 'Klevr Career Assistant',
  // Event key is optional in development (when using Inngest Dev Server)
  // For production, this should be set to your Inngest event key
  eventKey: process.env.INNGEST_EVENT_KEY,
})
