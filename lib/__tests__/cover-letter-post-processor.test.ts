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

  describe('vague metric detection', () => {
    it('replaces "significant reduction" with exact metric', () => {
      const result = postProcessCoverLetter(
        ['This resulted in significant reduction in processing time.'],
        { metricsToFeature: ['~15 minutes'] }
      )
      expect(result.paragraphs[0]).toContain('~15 minutes')
      expect(result.paragraphs[0]).not.toMatch(/\bsignificant\b/i)
      expect(result.fixes).toContain('Replaced vague qualifier with exact metric from profile')
    })

    it('passes through clean text that already contains metrics', () => {
      const text = 'This resulted in a ~15 minutes reduction in processing time.'
      const result = postProcessCoverLetter([text], { metricsToFeature: ['~15 minutes'] })
      expect(result.paragraphs[0]).toBe(text)
    })

    it('handles case where no metrics are available', () => {
      const text = 'This resulted in significant reduction in processing time.'
      const result = postProcessCoverLetter([text])
      // No metrics provided, so vague qualifier stays
      expect(result.paragraphs[0]).toContain('significant')
    })

    it('replaces "substantial improvement" with metric', () => {
      const result = postProcessCoverLetter(
        ['The project delivered substantial improvement in response time.'],
        { metricsToFeature: ['40%'] }
      )
      expect(result.paragraphs[0]).toContain('40%')
      expect(result.paragraphs[0]).not.toMatch(/\bsubstantial\b/i)
    })

    it('does not replace when all metrics are already present', () => {
      const text = 'The project reduced time by 40% and saved ~15 minutes per task.'
      const result = postProcessCoverLetter([text], {
        metricsToFeature: ['40%', '~15 minutes'],
      })
      expect(result.paragraphs[0]).toBe(text)
    })
  })

  describe('hyphen sentence break detection', () => {
    it('splits "clause - clause" into two sentences', () => {
      const result = postProcessCoverLetter([
        'I built a system that scales well - this experience taught me a lot about distributed systems.',
      ])
      expect(result.paragraphs[0]).not.toContain(' - this')
      expect(result.paragraphs[0]).toContain('. This')
      expect(result.fixes).toContain('Replaced hyphen sentence break with period')
    })

    it('preserves short phrases like "Next.js - a React framework"', () => {
      const text = 'Next.js - a React framework for production.'
      const result = postProcessCoverLetter([text])
      // "Next.js" is only 1 word on the left, should preserve
      expect(result.paragraphs[0]).toContain(' - ')
    })

    it('preserves hyphens where right side does not start with a clause starter', () => {
      const text = 'I used several technologies - Python, TypeScript, and Go - to build the system.'
      const result = postProcessCoverLetter([text])
      // "Python" is not a clause starter word
      expect(result.paragraphs[0]).toContain(' - Python')
    })

    it('splits when both sides are clearly independent clauses', () => {
      const result = postProcessCoverLetter([
        'I shipped the feature on time - the team was able to hit the quarterly goal.',
      ])
      expect(result.paragraphs[0]).toContain('. The')
      expect(result.paragraphs[0]).not.toContain(' - the team')
    })

    it('preserves hyphens in short left contexts', () => {
      const text = 'CI/CD - the backbone of modern development workflows.'
      const result = postProcessCoverLetter([text])
      // Left side has fewer than 4 words
      expect(result.paragraphs[0]).toContain(' - ')
    })

    it('splits when right side starts with an expanded clause starter like "each"', () => {
      const result = postProcessCoverLetter([
        'I built a notification system for the team - each member received real-time alerts.',
      ])
      expect(result.paragraphs[0]).toContain('. Each')
      expect(result.paragraphs[0]).not.toContain(' - each')
    })

    it('splits when right side starts with a capitalized non-acronym word', () => {
      const result = postProcessCoverLetter([
        'I refactored the deployment pipeline completely - Running the new pipeline confirmed the fix was stable.',
      ])
      expect(result.paragraphs[0]).toContain('. Running')
      expect(result.paragraphs[0]).not.toContain(' - Running')
    })

    it('preserves hyphens when right side starts with an acronym like API', () => {
      const text =
        'I built the authentication layer - API keys were rotated and the system was tested.'
      const result = postProcessCoverLetter([text])
      // "API" is all-caps (acronym), should NOT trigger capitalized heuristic
      // but it's not in CLAUSE_STARTERS either, so it should be preserved
      expect(result.paragraphs[0]).toContain(' - API')
    })

    it('splits with a 3-word right side clause', () => {
      const result = postProcessCoverLetter([
        'I redesigned the entire scheduling workflow - it worked well.',
      ])
      expect(result.paragraphs[0]).toContain('. It')
      expect(result.paragraphs[0]).not.toContain(' - it')
    })
  })

  describe('dropped metric injection', () => {
    it('injects a missing metric next to a vague qualifier', () => {
      const result = postProcessCoverLetter(
        ['The project delivered a notable impact on team productivity.'],
        { metricsToFeature: ['~15 minutes'] }
      )
      // fixVagueMetrics should replace "notable impact" with "~15 minutes impact"
      // but if the qualifier doesn't match the exact pattern, fixDroppedMetrics catches it
      expect(result.paragraphs[0]).toContain('~15 minutes')
    })

    it('does not inject when all metrics are already present', () => {
      const text = 'The project saved ~15 minutes per task and cut costs by 40%.'
      const result = postProcessCoverLetter([text], {
        metricsToFeature: ['~15 minutes', '40%'],
      })
      expect(result.paragraphs[0]).toBe(text)
    })
  })

  describe('rhythm cap (30% I/My ceiling)', () => {
    it('rewrites excess I/My starters to stay under 30%', () => {
      // 8 sentences, 5 start with I -> 62.5%, need to get to <=30% (max 2)
      const result = postProcessCoverLetter([
        'I built the API. I deployed it to AWS. The system handled 10K requests.',
        'I designed the frontend. I optimized the database. My role was critical.',
        'The team shipped on time. I led the integration effort.',
      ])
      // Count I/My starters in result
      const allText = result.paragraphs.join(' ')
      const sentences = allText.split(/(?<=[.!?])\s+/).filter(s => s.length > 0)
      const imyCount = sentences.filter(s => /^(I\s|My\s)/.test(s)).length
      expect(imyCount / sentences.length).toBeLessThanOrEqual(0.35) // Allow slight float tolerance
    })

    it('never rewrites opening sentence (para 0, sent 0) even if it starts with I', () => {
      const result = postProcessCoverLetter([
        'I built the API. I deployed it. I designed the UI. I optimized queries.',
        'The team was great. I led the effort. I shipped it. I tested everything.',
      ])
      // First sentence of first paragraph must remain unchanged
      const firstSentence = result.paragraphs[0].split(/(?<=[.!?])\s+/)[0]
      expect(firstSentence).toBe('I built the API.')
    })

    it('counts "My experience..." in I/My tally', () => {
      const result = postProcessCoverLetter([
        'My experience spans many years. My background is strong. My role was key. My work was impactful.',
        'The system was robust. The code was clean. The tests passed. The deploy succeeded.',
      ])
      const allText = result.paragraphs.join(' ')
      const sentences = allText.split(/(?<=[.!?])\s+/).filter(s => s.length > 0)
      const imyCount = sentences.filter(s => /^(I\s|My\s)/.test(s)).length
      expect(imyCount / sentences.length).toBeLessThanOrEqual(0.35)
    })

    it('passes through clean text below 30%', () => {
      const result = postProcessCoverLetter([
        'The system handled 10K requests. I built the API. Building tools is my focus. The team shipped on time.',
      ])
      // 1/4 = 25%, under threshold
      expect(result.fixes.filter(f => f.includes('I/My cap'))).toHaveLength(0)
    })

    it('passes through very short doc with 1 I-start', () => {
      const result = postProcessCoverLetter([
        'I built the API. The system worked. Testing was thorough. The deploy succeeded.',
      ])
      // 1/4 = 25%, under threshold
      expect(result.fixes.filter(f => f.includes('I/My cap'))).toHaveLength(0)
    })
  })

  describe('mantra slogan detection', () => {
    it('detects "Analyze, Automate, Accelerate" and removes containing sentence', () => {
      const result = postProcessCoverLetter([
        'My approach is simple: Analyze, Automate, Accelerate. The system handled 10K requests.',
      ])
      expect(result.paragraphs[0]).not.toContain('Analyze, Automate, Accelerate')
      expect(result.paragraphs[0]).toContain('10K requests')
      expect(result.fixes).toContain('Removed mantra-style slogan or triadic rhetoric')
    })

    it('detects "Build, Ship, and Lead" variant', () => {
      const result = postProcessCoverLetter([
        'My motto: Build, Ship, and Lead. I built a REST API serving 5K users.',
      ])
      expect(result.paragraphs[0]).not.toContain('Build, Ship, and Lead')
      expect(result.paragraphs[0]).toContain('REST API')
    })

    it('detects "I build, I ship, I lead" pattern', () => {
      const result = postProcessCoverLetter([
        'I build, I ship, I lead. The team delivered on time.',
      ])
      expect(result.paragraphs[0]).not.toContain('I build, I ship, I lead')
      expect(result.paragraphs[0]).toContain('team delivered')
    })

    it('does NOT flag "Python, TypeScript, and Go" in longer context', () => {
      const text = 'I used Python, TypeScript, and Go to build microservices that served 10K users.'
      const result = postProcessCoverLetter([text])
      // These are lowercase-starting in context, not a triadic slogan
      expect(result.paragraphs[0]).toContain('Python, TypeScript, and Go')
    })

    it('removes three consecutive short parallel sentences with same start word', () => {
      const result = postProcessCoverLetter([
        'Build fast. Build smart. Build well. The system handled 10K requests.',
      ])
      expect(result.paragraphs[0]).not.toContain('Build fast.')
      expect(result.paragraphs[0]).not.toContain('Build smart.')
      expect(result.paragraphs[0]).not.toContain('Build well.')
      expect(result.paragraphs[0]).toContain('10K requests')
    })
  })

  describe('expanded AI cliche detection', () => {
    it('removes "As a dedicated student, I am applying..."', () => {
      const result = postProcessCoverLetter([
        'As a dedicated student, I am applying for this role. I built a REST API serving 5K users.',
      ])
      expect(result.paragraphs[0]).not.toContain('dedicated student')
      expect(result.paragraphs[0]).toContain('REST API')
    })

    it('removes "My skills make me a great fit for this role."', () => {
      const result = postProcessCoverLetter([
        'My skills make me a great fit for this role. I built microservices at scale.',
      ])
      expect(result.paragraphs[0]).not.toContain('skills make me')
      expect(result.paragraphs[0]).toContain('microservices')
    })

    it('removes "I am writing to apply for the position."', () => {
      const result = postProcessCoverLetter([
        'I am writing to apply for the position. The team shipped features on time.',
      ])
      expect(result.paragraphs[0]).not.toContain('writing to apply')
      expect(result.paragraphs[0]).toContain('shipped features')
    })

    it('removes "In today\'s fast-paced world"', () => {
      const result = postProcessCoverLetter([
        "In today's fast-paced world, I am applying for this role. I built a REST API serving 5K users.",
      ])
      expect(result.paragraphs[0]).not.toContain('fast-paced world')
      expect(result.paragraphs[0]).toContain('REST API')
    })

    it('removes "Look no further"', () => {
      const result = postProcessCoverLetter([
        'Look no further for your next hire. I built microservices at scale.',
      ])
      expect(result.paragraphs[0]).not.toContain('Look no further')
      expect(result.paragraphs[0]).toContain('microservices')
    })

    it('removes "I am the ideal candidate"', () => {
      const result = postProcessCoverLetter([
        'I am the ideal candidate for this role. I shipped 3 production features last quarter.',
      ])
      expect(result.paragraphs[0]).not.toContain('ideal candidate')
      expect(result.paragraphs[0]).toContain('shipped 3 production features')
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
