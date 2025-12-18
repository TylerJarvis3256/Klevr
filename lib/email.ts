import { resend, isResendConfigured } from './resend'

/**
 * Email Helper Functions
 *
 * Provides type-safe email sending for various notification types
 */

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@klevr.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface SavedSearchEmailParams {
  to: string
  searchName: string
  newJobsCount: number
  jobs: Array<{
    title: string
    company: string
    location?: string
  }>
  viewResultsUrl: string
}

/**
 * Send email notification for new saved search results
 */
export async function sendSavedSearchEmail(
  params: SavedSearchEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    console.log('[Email] Resend not configured - skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Simple HTML email (we'll enhance with React Email later if needed)
    const html = generateSavedSearchEmailHtml(params)

    await resend!.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `${params.newJobsCount} new jobs found for "${params.searchName}"`,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send saved search email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate HTML for saved search email
 * (Simple version - can be enhanced with React Email component later)
 */
function generateSavedSearchEmailHtml(params: SavedSearchEmailParams): string {
  const jobsList = params.jobs
    .slice(0, 5)
    .map(
      job => `
      <li style="margin-bottom: 16px;">
        <strong style="color: #282427;">${job.title}</strong> at ${job.company}
        ${job.location ? `<br><span style="color: #666;">${job.location}</span>` : ''}
      </li>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Jobs Found - ${params.searchName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background-color: #EEEBD9; color: #282427;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background-color: #2292A4; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #FFFFFF; font-family: 'Lora', serif; font-size: 28px;">
        Klevr
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px 0; font-family: 'Lora', serif; font-size: 24px; color: #282427;">
        New Jobs Found!
      </h2>

      <p style="margin: 0 0 24px 0; color: #666; line-height: 1.6;">
        We found <strong>${params.newJobsCount} new job${params.newJobsCount === 1 ? '' : 's'}</strong> matching your saved search "<strong>${params.searchName}</strong>".
      </p>

      ${
        params.jobs.length > 0
          ? `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #282427;">
        Top Matches:
      </h3>

      <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #666;">
        ${jobsList}
      </ul>
      `
          : ''
      }

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.viewResultsUrl}"
           style="display: inline-block; background-color: #EE7B30; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; font-size: 16px;">
          View All Jobs
        </a>
      </div>

      <p style="margin: 24px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
        This is an automated notification from your saved search. You can manage your saved searches in the
        <a href="${APP_URL}/jobs/discover" style="color: #2292A4; text-decoration: none;">Discover</a> page.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F5F5F5; padding: 24px; text-align: center; color: #999; font-size: 12px;">
      <p style="margin: 0;">
        © ${new Date().getFullYear()} Klevr. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Test email sending (for development)
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Test Email from Klevr',
      html: '<p>This is a test email from Klevr. Email configuration is working!</p>',
    })

    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send test email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
