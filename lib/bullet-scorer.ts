/**
 * Pure-logic bullet scoring module.
 * No AI dependency — uses regex patterns and heuristic scoring
 * to detect metrics, score relevance, and rank bullets.
 */

export type MetricType = 'percentage' | 'currency' | 'count' | 'time' | 'multiplier'

export interface BulletMetricInfo {
  hasMetric: boolean
  metricType: MetricType | null
  metricValue: string | null
  rawMatch: string | null
}

export interface RankedBullet {
  index: number
  text: string
  score: number
  isFavorite: boolean
  metricInfo: BulletMetricInfo
}

// ─── Metric Detection ─────────────────────────────────

const METRIC_PATTERNS: Array<{ type: MetricType; pattern: RegExp }> = [
  // Percentages: 20%, 150%, etc.
  { type: 'percentage', pattern: /\b(\d{1,3}(?:\.\d+)?)\s*%/ },
  // Currency: $50K, $1.2M, $500, $10,000
  { type: 'currency', pattern: /\$\s*(\d[\d,]*(?:\.\d+)?)\s*[KkMmBb]?/ },
  // Multipliers: 3x, 10x faster, 2x improvement
  { type: 'multiplier', pattern: /\b(\d+(?:\.\d+)?)\s*[xX]\b/ },
  // Time: 2 weeks, 3 months, 50% faster
  { type: 'time', pattern: /\b(\d+(?:\.\d+)?)\s*(?:weeks?|months?|days?|hours?|minutes?)\b/i },
  // Counts: 10K+, 500 users, 1,000 requests, 10M+
  {
    type: 'count',
    pattern:
      /\b(\d[\d,]*(?:\.\d+)?)\s*[KkMmBb]?\+?\s*(?:users?|requests?|customers?|transactions?|records?|endpoints?|features?|components?|tests?|clients?|people|employees|team\s*members?|engineers?|developers?|projects?|repositories|repos|apps?|services?|APIs?|pages?|queries?|calls?|downloads?|installs?|views?|visitors?|sessions?|orders?|items?|products?|lines?)/i,
  },
]

/**
 * Detect whether a bullet point contains quantified metrics.
 */
export function detectBulletMetrics(text: string): BulletMetricInfo {
  for (const { type, pattern } of METRIC_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return {
        hasMetric: true,
        metricType: type,
        metricValue: match[1] || match[0],
        rawMatch: match[0],
      }
    }
  }

  return { hasMetric: false, metricType: null, metricValue: null, rawMatch: null }
}

// ─── Relevance Scoring ────────────────────────────────

/**
 * Score a bullet's relevance to the job based on competency overlap
 * and metric type match. Returns 0–100.
 */
export function scoreBulletRelevance(
  text: string,
  coreCompetencies: string[],
  metricPriorities: string[] = []
): number {
  const lowerText = text.toLowerCase()
  let score = 0

  // Competency overlap: each matched competency adds up to 15 points (max 60)
  let competencyMatches = 0
  for (const comp of coreCompetencies) {
    const terms = comp.toLowerCase().split(/\s+/)
    const matched = terms.some(term => term.length > 2 && lowerText.includes(term))
    if (matched) {
      competencyMatches++
    }
  }
  score += Math.min(competencyMatches * 15, 60)

  // Metric bonus: bullets with metrics get a boost
  const metricInfo = detectBulletMetrics(text)
  if (metricInfo.hasMetric) {
    score += 20

    // Extra bonus if metric type matches a priority
    if (metricInfo.metricType && metricPriorities.length > 0) {
      const metricTypeStr = metricInfo.metricType.toLowerCase()
      const priorityMatch = metricPriorities.some(
        p => p.toLowerCase().includes(metricTypeStr) || metricTypeStr.includes(p.toLowerCase())
      )
      if (priorityMatch) {
        score += 10
      }
    }
  }

  // Action verb boost: strong verbs at start
  const strongVerbs = [
    'led',
    'built',
    'designed',
    'architected',
    'implemented',
    'developed',
    'optimized',
    'reduced',
    'increased',
    'automated',
    'launched',
    'deployed',
    'migrated',
    'scaled',
    'created',
    'engineered',
    'spearheaded',
  ]
  const firstWord = lowerText.trim().split(/\s+/)[0]
  if (strongVerbs.includes(firstWord)) {
    score += 10
  }

  return Math.min(score, 100)
}

// ─── Bullet Ranking ───────────────────────────────────

export interface BulletInput {
  text: string
  isFavorite?: boolean
}

/**
 * Rank bullets by composite score: relevance + metric presence + favorite status.
 * Returns top N bullets sorted by score descending.
 */
export function rankBullets(
  bullets: BulletInput[],
  coreCompetencies: string[],
  metricPriorities: string[] = [],
  maxBullets?: number
): RankedBullet[] {
  const scored = bullets.map((bullet, index) => {
    const metricInfo = detectBulletMetrics(bullet.text)
    let score = scoreBulletRelevance(bullet.text, coreCompetencies, metricPriorities)

    // Favorite bonus: always prioritized
    if (bullet.isFavorite) {
      score += 25
    }

    return {
      index,
      text: bullet.text,
      score: Math.min(score, 100),
      isFavorite: bullet.isFavorite || false,
      metricInfo,
    }
  })

  // Sort by score descending, then by original index for stability
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.index - b.index
  })

  if (maxBullets !== undefined && maxBullets >= 0) {
    return scored.slice(0, maxBullets)
  }

  return scored
}
