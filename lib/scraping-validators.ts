/**
 * Scraping Content Validation
 *
 * Validates scraped job description quality using 4 criteria:
 * 1. Minimum length (300 chars)
 * 2. No error patterns (access denied, 404, captcha)
 * 3. Meaningful improvement over snippet (>20%)
 * 4. Contains job keywords (responsibilities, requirements, etc.)
 */

/** Common error patterns that indicate scraping failed */
const ERROR_PATTERNS = [
  /access denied/i,
  /unauthorized/i,
  /forbidden/i,
  /404/i,
  /not found/i,
  /page not found/i,
  /captcha/i,
  /robot/i,
  /bot detection/i,
  /please enable javascript/i,
  /javascript is required/i,
  /cookies required/i,
  /blocked/i,
  /unavailable/i,
  /temporarily unavailable/i,
  /service unavailable/i,
  /error/i,
  /something went wrong/i,
]

/** Keywords that should appear in valid job descriptions */
const JOB_DESCRIPTION_KEYWORDS = [
  'responsibilities',
  'requirements',
  'qualifications',
  'skills',
  'experience',
  'education',
  'apply',
  'position',
  'role',
  'job',
  'opportunity',
  'benefits',
  'salary',
  'compensation',
  'location',
  'team',
  'company',
  'about',
  'description',
  'duties',
]

/**
 * Clean scraped text by normalizing whitespace and removing noise
 * Removes JavaScript, JSON-LD, navigation elements, and excessive whitespace
 */
export function cleanScrapedText(text: string): string {
  let cleaned = text

  // Remove script content (JavaScript code blocks)
  cleaned = cleaned.replace(/window\.addEventListener.*?\}\);?/gs, '')
  cleaned = cleaned.replace(/\$\.ajax\({[^}]*}\);?/g, '')
  cleaned = cleaned.replace(/var\s+\w+\s*=\s*["'][^"']*["'];?/g, '')
  cleaned = cleaned.replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, '')

  // Remove JSON-LD structured data blocks
  cleaned = cleaned.replace(/\{\s*"@context"[\s\S]*?\}\s*\]/g, '')
  cleaned = cleaned.replace(/\{\s*"@type"[\s\S]*?\}/g, '')
  cleaned = cleaned.replace(/\[?\s*\{\s*"jobLocation"[\s\S]*?\}\s*\]?/g, '')

  // Remove common headers/labels at the start and duplicates
  cleaned = cleaned.replace(/^Job Description\s*/i, '')
  cleaned = cleaned.replace(/Job DescriptionJob Description/gi, '')

  // Remove tracking codes
  cleaned = cleaned.replace(/#LI-[A-Z0-9]+/gi, '')
  cleaned = cleaned.replace(/#[A-Z0-9]+-[A-Z0-9]+/gi, '')

  // Remove job board names and metadata
  cleaned = cleaned.replace(/\bSourceStack\b/gi, '')
  cleaned = cleaned.replace(/\bZipRecruiter\b/gi, '')
  cleaned = cleaned.replace(/\bDirect Employers\b/gi, '')
  cleaned = cleaned.replace(/\bContract\b\s*\n\s*\bFull time\b/gi, '')

  // Remove common navigation/UI text patterns
  cleaned = cleaned.replace(/❮\s*back to last search/gi, '')
  cleaned = cleaned.replace(/Back to last search/gi, '')
  cleaned = cleaned.replace(/Apply for this job/gi, '')
  cleaned = cleaned.replace(/Create alert/gi, '')
  cleaned = cleaned.replace(/Receive similar jobs by email/gi, '')
  cleaned = cleaned.replace(/No thanks,?\s*take me to the job/gi, '')
  cleaned = cleaned.replace(/By creating an alert.*?Cookie Use\./gi, '')
  cleaned = cleaned.replace(/Stats for this job/gi, '')
  cleaned = cleaned.replace(/Salary comparison:?/gi, '')
  cleaned = cleaned.replace(/Popular searches/gi, '')
  cleaned = cleaned.replace(/for all:/gi, '')

  // Remove only "ESTIMATED" labels (keep the actual salary info)
  cleaned = cleaned.replace(/ESTIMATED:\s*/gi, '')
  cleaned = cleaned.replace(/The number of jobs in each salary range/gi, '')

  // Remove salary chart labels
  cleaned = cleaned.replace(
    /This job\s*Nationalaverage\s*IT Jobsaverage\s*Californiaaverage/gi,
    ''
  )

  // Remove "NEW" badges
  cleaned = cleaned.replace(/\bNEW\b/g, '')

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '')

  // Split concatenated markdown headers (e.g. "**Title****Header:**")
  // This happens when HTML elements are adjacent with no whitespace
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(\*\*[A-Z][^*]+:\*\*)/g, '$1\n\n$2')

  // Also split when non-colon headers are concatenated
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(\*\*(?:What|About|Overview|Summary|Description|Requirements|Qualifications|Responsibilities|Duties|Skills|Experience|Benefits|Compensation)[^*]*\*\*)/gi, '$1\n\n$2')

  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n')

  // Remove excessive whitespace within lines
  cleaned = cleaned.replace(/[ \t]+/g, ' ')

  // Reduce excessive newlines but keep some spacing
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  // Split into lines
  const lines = cleaned.split('\n').map(line => line.trim())

  // Remove trailing metadata sections (Location, Job Function, etc.)
  let endIndex = lines.length
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    // Remove markdown formatting for detection
    const cleanLine = line.replace(/\*\*/g, '').trim()

    // Stop at common end-of-content markers
    if (
      /^Location$/i.test(cleanLine) ||
      /^Job Function$/i.test(cleanLine) ||
      /^Position Type$/i.test(cleanLine) ||
      /^Pay Basis$/i.test(cleanLine) ||
      /^Full Time\/Part Time$/i.test(cleanLine) ||
      /^More Information:/i.test(cleanLine) ||
      /^Need Help\??:?$/i.test(cleanLine) ||
      /^Salaries$/i.test(cleanLine) ||
      /^\d{5}$/.test(cleanLine) || // ZIP codes
      /^Full time\/Part time$/i.test(cleanLine) ||
      // Common footer patterns
      /^For technical assistance/i.test(cleanLine) ||
      /^If you are an individual with a disability/i.test(cleanLine) ||
      /Equal Opportunity Employer/i.test(cleanLine)
    ) {
      endIndex = i
      break
    }
  }

  // Keep only up to the end of actual content
  const contentLines = lines.slice(0, endIndex)

  // Remove duplicate consecutive lines
  const dedupedLines: string[] = []
  let prevLine = ''
  for (const line of contentLines) {
    if (line !== prevLine || line === '') {
      // Keep blank lines for spacing
      dedupedLines.push(line)
    }
    prevLine = line
  }

  const finalLines = dedupedLines

  // Helper function to detect section headers
  const isSectionHeader = (line: string): boolean => {
    // Skip empty lines
    if (!line || line.length < 3) return false

    // Remove markdown formatting for detection
    const cleanLine = line.replace(/\*\*/g, '').trim()

    // Pattern 1: Lines ending with colon (e.g., "Requirements:", "Duties:", "REQUIREMENTS:")
    if (/^[A-Z][^:]{2,}:$/.test(cleanLine)) return true

    // Pattern 2: Lines starting with common header keywords (case-insensitive)
    const headerKeywords = [
      'About',
      'Overview',
      'Summary',
      'Description',
      'Responsibilities',
      'Requirements',
      'Qualifications',
      'Desired',
      'Preferred',
      'Nice to Have',
      'Bonus',
      'Extra Credit',
      'Benefits',
      'Compensation',
      'What You',
      'What We',
      'Who You',
      'Skills',
      'Education',
      'Experience',
      'Projects',
      'Role',
      'Position',
      'Team',
      'Company',
      'Culture',
      'Why',
      'How',
      'Key',
      'Core',
      'Essential',
      'Other',
      'Duties',
    ]
    const lowerCleanLine = cleanLine.toLowerCase()
    if (headerKeywords.some(keyword => lowerCleanLine.startsWith(keyword.toLowerCase()))) {
      // Make sure it's a short header line, not a full sentence
      return cleanLine.length < 80 && !cleanLine.endsWith('.')
    }

    // Pattern 3: ALL CAPS single word or short phrase (common format)
    const words = cleanLine.split(/\s+/)
    if (words.length >= 1 && words.length <= 3 && cleanLine.length >= 4) {
      // Check if all words are ALL CAPS
      const allCaps = words.every(w => w.length > 0 && w === w.toUpperCase() && /^[A-Z]+$/.test(w))
      if (allCaps) return true
    }

    // Pattern 4: Title Case lines (most words capitalized)
    if (words.length >= 2 && words.length <= 8) {
      const capitalizedWords = words.filter(
        w => w.length > 0 && /^[A-Z]/.test(w)
      )
      // If >60% of words are capitalized, likely a header
      if (capitalizedWords.length / words.length > 0.6) {
        return true
      }
    }

    return false
  }

  // Helper function to detect major section headers (need extra spacing)
  const isMajorSection = (line: string): boolean => {
    const cleanLine = line.replace(/\*\*/g, '').trim()
    const lowerCleanLine = cleanLine.toLowerCase()
    const majorSections = [
      'Overview',
      'Responsibilities',
      'Requirements',
      'Qualifications',
      'About',
      'Description',
      'Summary',
      'Benefits',
      'Compensation',
      'Experience',
      'Skills',
    ]
    return majorSections.some(section => lowerCleanLine.startsWith(section.toLowerCase()))
  }

  // Helper function to detect salary/compensation paragraphs
  const isSalaryParagraph = (line: string): boolean => {
    return (
      /base pay range|salary range|compensation/i.test(line) ||
      /\$[\d,]+ ?- ?\$[\d,]+ per (month|year|hour)/i.test(line) ||
      /USD \$[\d,]+ ?- ?\$[\d,]+/i.test(line)
    )
  }

  // Add blank lines before section headers and after them for better readability
  const formattedLines: string[] = []
  let inSalarySection = false
  let foundFirstContent = false

  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i]
    const prevLine = i > 0 ? finalLines[i - 1] : ''
    const nextLine = i < finalLines.length - 1 ? finalLines[i + 1] : ''

    // Skip initial metadata lines (job title, company, location) before first content
    if (!foundFirstContent) {
      // Skip everything until we hit a markdown header or section header
      const isMarkdownHeader = /^\*\*/.test(line)
      const isLikelySectionStart = isSectionHeader(line)

      // Keep skipping until we find actual content (markdown or section header)
      if (!isMarkdownHeader && !isLikelySectionStart) {
        continue // Skip this line
      }

      // Found first real content
      foundFirstContent = true
    }

    // Check if this is a salary paragraph
    const isSalaryLine = isSalaryParagraph(line)

    // Add extra spacing before salary section starts
    if (isSalaryLine && !inSalarySection) {
      if (prevLine !== '' && formattedLines.length > 0) {
        formattedLines.push('')
        formattedLines.push('')
      }
      inSalarySection = true
    }

    // If this is a section header
    if (isSectionHeader(line)) {
      // Major sections get extra spacing (2 blank lines before)
      if (isMajorSection(line)) {
        if (prevLine !== '' && formattedLines.length > 0) {
          formattedLines.push('')
          formattedLines.push('')
        }
      } else {
        // Regular sections get normal spacing (1 blank line before)
        if (prevLine !== '' && formattedLines.length > 0) {
          formattedLines.push('')
        }
      }

      formattedLines.push(line)

      // Add blank line after section header if next line isn't empty
      if (nextLine !== '' && !isSectionHeader(nextLine)) {
        formattedLines.push('')
      }
    } else {
      formattedLines.push(line)
    }

    // Add spacing after salary section ends
    if (inSalarySection && !isSalaryLine && !isSalaryParagraph(nextLine)) {
      if (line !== '' && nextLine !== '') {
        formattedLines.push('')
      }
      inSalarySection = false
    }
  }

  // Remove empty lines at start and end
  while (formattedLines.length > 0 && formattedLines[0] === '') {
    formattedLines.shift()
  }
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
    formattedLines.pop()
  }

  // Join with proper spacing
  let result = formattedLines.join('\n')

  // Ensure section headers have proper spacing
  // Add blank line before markdown headers if missing
  result = result.replace(/([^\n])\n(\*\*[A-Z])/g, '$1\n\n$2')

  // Add blank line after markdown headers if missing
  result = result.replace(/(\*\*[^*]+\*\*)\n([^\n*])/g, '$1\n\n$2')

  // Ensure max 3 consecutive newlines (2 blank lines)
  result = result.replace(/\n{4,}/g, '\n\n\n')

  // Ensure at least one blank line before common section patterns
  result = result.replace(/([^\n])\n((?:Requirements|Duties|Qualifications|Experience|Skills|Benefits|Compensation):)/g, '$1\n\n$2')

  return result.trim()
}

/**
 * Calculate improvement percentage between scraped content and snippet
 */
function calculateImprovement(scrapedText: string, snippet: string): number {
  const scrapedLength = scrapedText.length
  const snippetLength = snippet.length

  if (snippetLength === 0) return 100

  const improvement = ((scrapedLength - snippetLength) / snippetLength) * 100
  return Math.max(0, improvement)
}

/**
 * Check if text contains error patterns
 */
function hasErrorPatterns(text: string): boolean {
  return ERROR_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Check if text contains job description keywords
 * Returns true if at least 3 keywords are found
 */
function hasJobKeywords(text: string): boolean {
  const lowerText = text.toLowerCase()
  const matchCount = JOB_DESCRIPTION_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword)
  ).length

  return matchCount >= 3
}

/**
 * Validate scraped content quality using 4 criteria
 *
 * @param scrapedText - The scraped job description text
 * @param originalSnippet - The original Adzuna snippet for comparison
 * @returns Object with validation result and reason if invalid
 */
export function isScrapedContentValid(
  scrapedText: string,
  originalSnippet: string
): { valid: boolean; reason?: string } {
  const cleanedText = cleanScrapedText(scrapedText)

  // Criterion 1: Minimum length (300 chars)
  if (cleanedText.length < 300) {
    return {
      valid: false,
      reason: `Content too short (${cleanedText.length} chars, minimum 300)`,
    }
  }

  // Criterion 2: No error patterns
  if (hasErrorPatterns(cleanedText)) {
    return {
      valid: false,
      reason: 'Content contains error patterns (access denied, 404, etc.)',
    }
  }

  // Criterion 3: Meaningful improvement over snippet (>20%)
  const improvement = calculateImprovement(cleanedText, originalSnippet)
  if (improvement < 20) {
    return {
      valid: false,
      reason: `Insufficient improvement over snippet (${improvement.toFixed(1)}%, minimum 20%)`,
    }
  }

  // Criterion 4: Contains job keywords
  if (!hasJobKeywords(cleanedText)) {
    return {
      valid: false,
      reason: 'Content does not contain sufficient job description keywords',
    }
  }

  return { valid: true }
}
