import { Resend } from 'resend'

/**
 * Resend Email Client
 *
 * Configured for transactional emails (saved search notifications, etc.)
 */

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not configured - email sending will be disabled')
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/**
 * Check if Resend is configured and ready to send emails
 */
export function isResendConfigured(): boolean {
  return resend !== null && !!process.env.RESEND_API_KEY
}
