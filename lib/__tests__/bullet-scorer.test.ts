import { describe, it, expect } from 'vitest'
import {
  detectBulletMetrics,
  scoreBulletRelevance,
  rankBullets,
  type BulletInput,
} from '@/lib/bullet-scorer'

// ─── detectBulletMetrics ──────────────────────────────

describe('detectBulletMetrics', () => {
  it('detects percentages', () => {
    const result = detectBulletMetrics('Reduced load time by 40% through caching')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('percentage')
    expect(result.rawMatch).toContain('40%')
  })

  it('detects currency amounts', () => {
    const result = detectBulletMetrics('Generated $50K in annual revenue savings')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('currency')
    expect(result.rawMatch).toContain('$50K')
  })

  it('detects multipliers', () => {
    const result = detectBulletMetrics('Achieved 3x faster build times')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('multiplier')
    expect(result.rawMatch).toContain('3x')
  })

  it('detects time durations', () => {
    const result = detectBulletMetrics('Delivered MVP in 2 weeks ahead of schedule')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('time')
    expect(result.rawMatch).toContain('2 weeks')
  })

  it('detects counts with user-like nouns', () => {
    const result = detectBulletMetrics('Built API serving 10K+ users daily')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('count')
  })

  it('returns no metric for plain text', () => {
    const result = detectBulletMetrics(
      'Collaborated with cross-functional teams on product features'
    )
    expect(result.hasMetric).toBe(false)
    expect(result.metricType).toBeNull()
    expect(result.metricValue).toBeNull()
    expect(result.rawMatch).toBeNull()
  })

  it('detects percentage with decimal', () => {
    const result = detectBulletMetrics('Improved accuracy by 99.5% using ML pipeline')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('percentage')
  })

  it('detects dollar amounts with commas', () => {
    const result = detectBulletMetrics('Saved $10,000 per quarter through automation')
    expect(result.hasMetric).toBe(true)
    expect(result.metricType).toBe('currency')
  })
})

// ─── scoreBulletRelevance ─────────────────────────────

describe('scoreBulletRelevance', () => {
  const competencies = ['API Design', 'Cloud Infrastructure', 'React Development']

  it('scores higher when bullet matches competencies', () => {
    const score = scoreBulletRelevance(
      'Designed and deployed API services on AWS cloud infrastructure',
      competencies
    )
    expect(score).toBeGreaterThanOrEqual(30)
  })

  it('scores lower for unrelated bullets', () => {
    const score = scoreBulletRelevance(
      'Organized team building events and social activities',
      competencies
    )
    expect(score).toBeLessThan(20)
  })

  it('gives metric bonus', () => {
    const withMetric = scoreBulletRelevance('Built API serving 10K+ requests per day', competencies)
    const withoutMetric = scoreBulletRelevance('Built API serving production traffic', competencies)
    expect(withMetric).toBeGreaterThan(withoutMetric)
  })

  it('gives action verb bonus', () => {
    const withVerb = scoreBulletRelevance('Led migration of API to microservices', competencies)
    const withoutVerb = scoreBulletRelevance(
      'Was part of API migration to microservices',
      competencies
    )
    expect(withVerb).toBeGreaterThan(withoutVerb)
  })

  it('caps score at 100', () => {
    const score = scoreBulletRelevance(
      'Led implementation of React API cloud infrastructure design with 50% improvement',
      competencies,
      ['percentage']
    )
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ─── rankBullets ──────────────────────────────────────

describe('rankBullets', () => {
  const competencies = ['Backend Development', 'Database Optimization']

  const bullets: BulletInput[] = [
    { text: 'Organized office supplies', isFavorite: false },
    { text: 'Optimized database queries reducing latency by 40%', isFavorite: false },
    { text: 'Built backend API for user authentication', isFavorite: true },
    { text: 'Attended weekly team meetings', isFavorite: false },
  ]

  it('ranks metric-bearing relevant bullets higher', () => {
    const ranked = rankBullets(bullets, competencies)
    // The optimized database bullet should be near the top
    const dbBullet = ranked.find(b => b.text.includes('Optimized database'))
    expect(dbBullet).toBeDefined()
    expect(ranked.indexOf(dbBullet!)).toBeLessThan(2)
  })

  it('boosts favorite bullets', () => {
    const ranked = rankBullets(bullets, competencies)
    const favBullet = ranked.find(b => b.isFavorite)
    expect(favBullet).toBeDefined()
    expect(ranked.indexOf(favBullet!)).toBeLessThan(2)
  })

  it('limits results to maxBullets', () => {
    const ranked = rankBullets(bullets, competencies, [], 2)
    expect(ranked).toHaveLength(2)
  })

  it('returns all bullets when maxBullets is not specified', () => {
    const ranked = rankBullets(bullets, competencies)
    expect(ranked).toHaveLength(4)
  })

  it('preserves original index', () => {
    const ranked = rankBullets(bullets, competencies)
    for (const bullet of ranked) {
      expect(bullet.text).toBe(bullets[bullet.index].text)
    }
  })

  it('includes metric info in ranked output', () => {
    const ranked = rankBullets(bullets, competencies)
    const dbBullet = ranked.find(b => b.text.includes('40%'))
    expect(dbBullet?.metricInfo.hasMetric).toBe(true)
    expect(dbBullet?.metricInfo.metricType).toBe('percentage')
  })
})
