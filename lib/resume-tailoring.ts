import type { StructuredProfileData } from './resume-generator'

/**
 * Calculate estimated word count for resume content.
 * Used by V3 engine for pre-estimation of one-page feasibility.
 */
export function estimateContentWordCount(profileData: StructuredProfileData): number {
  let wordCount = 0

  // Header + Summary: ~80 words
  wordCount += 80

  // Education: ~30 words per entry
  wordCount += profileData.education.length * 30

  // Experience: ~15 words per bullet, ~10 words for job/company/dates
  profileData.experiences.forEach(exp => {
    wordCount += 10 // Job title, company, dates
    wordCount += exp.bullets.length * 15
  })

  // Projects: ~40 words per project
  wordCount += profileData.projects.length * 40

  // Skills: ~60 words total (accounts for 4-category format)
  wordCount += 60

  return wordCount
}

/**
 * Check if content will fit on one page.
 * Returns true if estimated word count <= 500.
 */
export function willFitOnOnePage(profileData: StructuredProfileData): boolean {
  const wordCount = estimateContentWordCount(profileData)
  return wordCount <= 500
}
