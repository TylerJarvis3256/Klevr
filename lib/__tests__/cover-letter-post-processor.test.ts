import { describe, it, expect } from 'vitest'
import { postProcessCoverLetter } from '@/lib/cover-letter-post-processor'

describe('postProcessCoverLetter', () => {
  describe('em/en dash removal', () => {
    it('replaces em dashes with spaced hyphens', () => {
      const result = postProcessCoverLetter(['I built a system\u2014one that scaled to 10K users.'])
      expect(result.paragraphs[0]).not.toContain('\u2014')
      expect(result.paragraphs[0]).toContain(' - ')
      expect(result.fixes).toContain('Replaced em/en dashes with hyphens')
    })

    it('replaces en dashes with spaced hyphens', () => {
      const result = postProcessCoverLetter(['The project ran from Jan\u2013March.'])
      expect(result.paragraphs[0]).not.toContain('\u2013')
      expect(result.paragraphs[0]).toContain(' - ')
    })
  })

  describe('AI cliche removal', () => {
    it('removes sentences containing AI cliches', () => {
      const result = postProcessCoverLetter([
        'I am excited to apply for this role. I built a REST API serving 5K users.',
      ])
      expect(result.paragraphs[0]).not.toContain('excited to')
      expect(result.paragraphs[0]).toContain('REST API')
    })

    it('removes "proven track record"', () => {
      const result = postProcessCoverLetter([
        'I have a proven track record of delivering software. My team shipped 3 features.',
      ])
      expect(result.paragraphs[0]).not.toContain('proven track record')
      expect(result.paragraphs[0]).toContain('shipped 3 features')
    })

    it('removes "hit the ground running"', () => {
      const result = postProcessCoverLetter([
        'I can hit the ground running at your company. My experience includes building APIs.',
      ])
      expect(result.paragraphs[0]).not.toContain('hit the ground running')
    })

    it('keeps all text if every sentence contains a cliche', () => {
      const result = postProcessCoverLetter([
        'I am excited to apply. I am passionate about this role.',
      ])
      // Should keep original since filtering would remove everything
      expect(result.paragraphs[0].length).toBeGreaterThan(0)
    })
  })

  describe('flowery adjective removal', () => {
    it('removes "innovative"', () => {
      const result = postProcessCoverLetter(['I built an innovative solution for data processing.'])
      expect(result.paragraphs[0]).not.toMatch(/\binnovative\b/i)
      expect(result.paragraphs[0]).toContain('solution for data processing')
    })

    it('removes "revolutionary"', () => {
      const result = postProcessCoverLetter(['My revolutionary approach reduced latency by 40%.'])
      expect(result.paragraphs[0]).not.toMatch(/\brevolutionary\b/i)
      expect(result.paragraphs[0]).toContain('reduced latency by 40%')
    })

    it('removes "game-changing"', () => {
      const result = postProcessCoverLetter(['This was a game-changing experience.'])
      expect(result.paragraphs[0]).not.toContain('game-changing')
    })
  })

  describe('consecutive "I" sentence starts', () => {
    it('restructures the second of two consecutive I-starting sentences', () => {
      const result = postProcessCoverLetter(['I built a REST API. I developed the frontend.'])
      const sentences = result.paragraphs[0].split(/(?<=[.!?])\s+/)
      // The second sentence should not start with "I"
      if (sentences.length >= 2) {
        expect(sentences[1]).not.toMatch(/^I\s/)
      }
    })

    it('leaves non-consecutive I starts alone', () => {
      const result = postProcessCoverLetter([
        'I built an API. The system scaled well. I then optimized the database.',
      ])
      expect(result.paragraphs[0]).toContain('I built an API')
      expect(result.paragraphs[0]).toContain('I then optimized')
    })
  })

  describe('passive closing replacement', () => {
    it('replaces "hope to hear from you"', () => {
      const result = postProcessCoverLetter(['I built great things. I hope to hear from you soon.'])
      expect(result.paragraphs[0]).not.toContain('hope to hear')
      expect(result.paragraphs[0]).toContain('contribute')
      expect(result.fixes).toContain('Replaced passive closing with call-to-value')
    })

    it('replaces "look forward to hearing"', () => {
      const result = postProcessCoverLetter([
        'My skills are relevant. I look forward to hearing from you.',
      ])
      expect(result.paragraphs[0]).not.toContain('look forward to hearing')
    })
  })

  describe('bracket removal', () => {
    it('removes [Your Name] brackets', () => {
      const result = postProcessCoverLetter(['Sincerely, [Your Name]'])
      expect(result.paragraphs[0]).not.toContain('[')
      expect(result.paragraphs[0]).not.toContain(']')
    })

    it('removes [Company] brackets', () => {
      const result = postProcessCoverLetter([
        'I want to join [Company Name] because of their mission.',
      ])
      expect(result.paragraphs[0]).not.toContain('[Company Name]')
    })
  })

  describe('AI meta-language removal', () => {
    it('removes sentences containing "as an AI"', () => {
      const result = postProcessCoverLetter([
        'As an AI, I generated this letter. My experience includes 5 years of Python.',
      ])
      expect(result.paragraphs[0]).not.toContain('As an AI')
      expect(result.paragraphs[0]).toContain('Python')
    })
  })

  describe('multiple paragraphs', () => {
    it('processes each paragraph independently', () => {
      const result = postProcessCoverLetter([
        'I built an innovative system\u2014scaling to 10K users.',
        'I am excited to apply. I have great skills.',
      ])
      expect(result.paragraphs).toHaveLength(2)
      expect(result.paragraphs[0]).not.toContain('\u2014')
      expect(result.paragraphs[0]).not.toMatch(/\binnovative\b/i)
    })
  })

  describe('deduplicates fixes', () => {
    it('returns unique fix messages', () => {
      const result = postProcessCoverLetter([
        'I built an innovative\u2014system.',
        'The revolutionary\u2014approach worked.',
      ])
      // "Replaced em/en dashes with hyphens" should appear only once
      const dashFixes = result.fixes.filter(f => f.includes('em/en dashes'))
      expect(dashFixes).toHaveLength(1)
    })
  })

  describe('clean text passes through', () => {
    it('does not modify clean text', () => {
      const clean = 'I built a REST API that served 10K users and reduced latency by 40%.'
      const result = postProcessCoverLetter([clean])
      expect(result.paragraphs[0]).toBe(clean)
      expect(result.fixes).toHaveLength(0)
    })
  })
})
