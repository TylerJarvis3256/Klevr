/**
 * Job Board CSS Selectors
 *
 * Domain-specific selectors for extracting job descriptions from popular job boards.
 * Uses a fallback strategy for unknown boards.
 */

export interface JobBoardConfig {
  /** Domain pattern to match (e.g., 'linkedin.com') */
  domain: string
  /** CSS selectors to try in order (first match wins) */
  selectors: string[]
  /** Optional selector to wait for before extracting */
  waitForSelector?: string
  /** Selectors for elements to remove (nav, footer, etc.) */
  removeSelectors?: string[]
}

export const JOB_BOARD_CONFIGS: JobBoardConfig[] = [
  {
    domain: 'adzuna.com',
    selectors: [
      '[class*="description"]',
      '.job-description',
      'main',
      'article',
    ],
    removeSelectors: [
      '.nav',
      '.footer',
      '.header',
      '.similar-jobs',
      '.salary-comparison',
      '[class*="similar"]',
      '[class*="stats"]',
      '[class*="breadcrumb"]',
    ],
  },
  {
    domain: 'linkedin.com',
    selectors: [
      '.description__text',
      '.show-more-less-html__markup',
      '.jobs-description__content',
      '.jobs-box__html-content',
    ],
    waitForSelector: '.description__text',
    removeSelectors: ['.nav', '.footer', '.jobs-apply-button'],
  },
  {
    domain: 'indeed.com',
    selectors: [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '.jobsearch-JobComponent-description',
      '.job-description',
    ],
    waitForSelector: '#jobDescriptionText',
    removeSelectors: ['.nav', '.footer'],
  },
  {
    domain: 'glassdoor.com',
    selectors: [
      '.jobDescriptionContent',
      '.desc',
      '[class*="JobDetails_jobDescription"]',
      '[data-test="job-description"]',
    ],
    waitForSelector: '.jobDescriptionContent',
    removeSelectors: ['.header', '.footer'],
  },
  {
    domain: 'lever.co',
    selectors: [
      '.posting-description',
      '.content-wrapper',
      '[class*="posting-content"]',
    ],
    waitForSelector: '.posting-description',
    removeSelectors: ['.header', '.footer'],
  },
  {
    domain: 'greenhouse.io',
    selectors: ['#content', '.content', '[class*="job-post"]'],
    waitForSelector: '#content',
    removeSelectors: ['.header', '.footer'],
  },
  {
    domain: 'myworkdayjobs.com',
    selectors: [
      '[data-automation-id="jobPostingDescription"]',
      '.job-description',
      '[class*="Job_Description"]',
    ],
    waitForSelector: '[data-automation-id="jobPostingDescription"]',
    removeSelectors: ['.header', '.footer'],
  },
  {
    domain: 'ziprecruiter.com',
    selectors: [
      '.jobDescriptionSection',
      '.job_description',
      '[class*="JobDescription"]',
    ],
    waitForSelector: '.jobDescriptionSection',
    removeSelectors: ['.header', '.footer'],
  },
]

/**
 * Fallback selectors for unknown job boards
 * Uses heuristics to find job description content
 */
export const FALLBACK_SELECTORS: string[] = [
  // Common class names
  '[class*="job-description"]',
  '[class*="jobDescription"]',
  '[class*="description"]',
  '[class*="job-details"]',
  '[class*="jobDetails"]',
  '[class*="posting"]',
  '[class*="job-content"]',
  '[class*="jobContent"]',

  // Common IDs
  '#job-description',
  '#jobDescription',
  '#description',
  '#job-details',
  '#jobDetails',

  // Common data attributes
  '[data-test*="description"]',
  '[data-testid*="description"]',
  '[data-automation-id*="description"]',

  // Semantic HTML
  'article',
  'main',
  '[role="main"]',

  // Generic containers (last resort)
  '.content',
  '#content',
  'main > div',
]

/**
 * Get job board configuration for a given URL
 * Returns board-specific config or fallback selectors
 */
export function getJobBoardConfig(url: string): {
  selectors: string[]
  waitForSelector?: string
  removeSelectors?: string[]
} {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Find matching board config
    const config = JOB_BOARD_CONFIGS.find(c => hostname.includes(c.domain))

    if (config) {
      return {
        selectors: config.selectors,
        waitForSelector: config.waitForSelector,
        removeSelectors: config.removeSelectors,
      }
    }

    // Return fallback selectors for unknown boards
    return {
      selectors: FALLBACK_SELECTORS,
      waitForSelector: undefined,
      removeSelectors: ['.nav', '.navigation', '.header', '.footer'],
    }
  } catch (error) {
    // Invalid URL - return fallback
    return {
      selectors: FALLBACK_SELECTORS,
      waitForSelector: undefined,
      removeSelectors: ['.nav', '.navigation', '.header', '.footer'],
    }
  }
}
