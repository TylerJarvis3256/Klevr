# Stage 5: Fit Assessment

**Stage:** 5 of 14
**Dependencies:** Stages 2, 3, 4
**Estimated Effort:** Major feature - core "magic moment"

---

## Overview

This stage implements the job fit assessment algorithm that provides the core value proposition - instant analysis of how well a job matches the user's profile. The system calculates a numeric score, maps it to fit buckets (EXCELLENT, GOOD, FAIR, POOR), and generates an AI explanation.

### Goals
- Implement fit scoring algorithm (0-1 scale)
- Map scores to fit buckets with clear thresholds
- Generate AI explanations for fit assessments
- Extract and match skills from job descriptions
- Calculate experience and education alignment
- Score preference matching
- Store results in Application table

---

## 1. Fit Scoring Algorithm

### 1.1 Scoring Components

**Total Score: 0.0 - 1.0**

- **Skills Match:** 0.0 - 0.5 (50% weight)
  - Compare job required skills with user's skills
  - Exact matches, partial matches, missing critical skills

- **Experience/Education Match:** 0.0 - 0.3 (30% weight)
  - Education level and major relevance
  - Years of experience vs required
  - Related project experience

- **Preference Alignment:** 0.0 - 0.2 (20% weight)
  - Job type match (internship, full-time, etc.)
  - Location preference match
  - Industry/domain interest (future enhancement)

### 1.2 Fit Bucket Mapping

```
Score Range → Bucket
0.80 - 1.00 → EXCELLENT
0.60 - 0.79 → GOOD
0.40 - 0.59 → FAIR
0.00 - 0.39 → POOR
```

---

## 2. Job Parsing & Skills Extraction

### 2.1 Job Description Parsing Prompt

**File:** `prompts/scoring/parse-job-v1.md`

```markdown
---
version: 1.0.0
description: Extract structured data from job descriptions
model: gpt-4o-mini-2024-07-18
maxTokens: 1500
---

# Job Description Parser

Extract structured information from the job posting.

## Input
Raw job description text

## Output Format (JSON)
{
  "required_skills": ["Python", "JavaScript", "React"],
  "preferred_skills": ["TypeScript", "AWS", "Docker"],
  "education_required": "Bachelor's degree in Computer Science or related field",
  "experience_required": "2+ years of software development experience",
  "responsibilities": [
    "Design and implement features",
    "Collaborate with cross-functional teams"
  ],
  "qualifications": [
    "Strong problem-solving skills",
    "Excellent communication"
  ],
  "job_type": "FULL_TIME",
  "level": "ENTRY_LEVEL",
  "domain": "Software Engineering"
}

## Instructions
1. Extract technical skills (languages, frameworks, tools)
2. Separate required vs preferred skills
3. Identify education requirements
4. Extract experience requirements
5. Categorize job level: ENTRY_LEVEL, MID_LEVEL, SENIOR
6. Determine job type: INTERNSHIP, FULL_TIME, PART_TIME, CONTRACT
7. Return only valid JSON
```

### 2.2 Job Parser Function

**File:** `lib/job-parser.ts`

```typescript
import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'

export interface ParsedJobDescription {
  required_skills: string[]
  preferred_skills: string[]
  education_required?: string
  experience_required?: string
  responsibilities: string[]
  qualifications: string[]
  job_type?: string
  level?: 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR'
  domain?: string
}

/**
 * Parse job description using AI
 */
export async function parseJobDescription(
  userId: string,
  jobDescription: string
): Promise<ParsedJobDescription> {
  const { content: prompt } = await loadPrompt('scoring', 'parse-job-v1')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: jobDescription },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })
  )

  const content = completion.choices[0].message.content
  return parseOpenAIJson<ParsedJobDescription>(content)
}
```

---

## 3. Skills Matching Algorithm

### 3.1 Skills Matcher

**File:** `lib/skills-matcher.ts`

```typescript
export interface SkillsMatchResult {
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
  match_score: number // 0.0 - 1.0
}

/**
 * Match user skills against job requirements
 */
export function matchSkills(
  userSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = []
): SkillsMatchResult {
  // Normalize skills (lowercase, trim)
  const normalizeSkill = (s: string) => s.toLowerCase().trim()
  const normalizedUserSkills = userSkills.map(normalizeSkill)
  const normalizedRequired = requiredSkills.map(normalizeSkill)
  const normalizedPreferred = preferredSkills.map(normalizeSkill)

  // Find exact matches
  const matching_skills: string[] = []
  const missing_required_skills: string[] = []
  const missing_preferred_skills: string[] = []

  for (const skill of requiredSkills) {
    if (normalizedUserSkills.includes(normalizeSkill(skill))) {
      matching_skills.push(skill)
    } else {
      missing_required_skills.push(skill)
    }
  }

  for (const skill of preferredSkills) {
    if (
      normalizedUserSkills.includes(normalizeSkill(skill)) &&
      !matching_skills.includes(skill)
    ) {
      matching_skills.push(skill)
    } else if (!normalizedUserSkills.includes(normalizeSkill(skill))) {
      missing_preferred_skills.push(skill)
    }
  }

  // Calculate match score
  const totalRequired = requiredSkills.length || 1
  const totalPreferred = preferredSkills.length || 0
  const requiredMatches = requiredSkills.length - missing_required_skills.length
  const preferredMatches = preferredSkills.length - missing_preferred_skills.length

  // Weight: 80% required, 20% preferred
  const requiredScore = requiredMatches / totalRequired
  const preferredScore = totalPreferred > 0 ? preferredMatches / totalPreferred : 1

  const match_score = requiredScore * 0.8 + preferredScore * 0.2

  return {
    matching_skills,
    missing_required_skills,
    missing_preferred_skills,
    match_score,
  }
}
```

---

## 4. Complete Fit Scoring

### 4.1 Fit Scorer

**File:** `lib/fit-scorer.ts`

```typescript
import { FitBucket } from '@prisma/client'
import { ParsedResume } from './resume-parser'
import { ParsedJobDescription } from './job-parser'
import { matchSkills, SkillsMatchResult } from './skills-matcher'

export interface FitScore {
  fit_score: number // 0.0 - 1.0
  fit_bucket: FitBucket
  skills_match: SkillsMatchResult
  experience_score: number
  preference_score: number
  components: {
    skills: number
    experience: number
    preferences: number
  }
}

/**
 * Calculate comprehensive fit score
 */
export function calculateFitScore(
  resume: ParsedResume,
  job: ParsedJobDescription,
  preferences: {
    job_types: string[]
    preferred_locations: string[]
  },
  jobLocation?: string
): FitScore {
  // 1. Skills Match (0.0 - 0.5)
  const allUserSkills = [
    ...(resume.skills.languages || []),
    ...(resume.skills.frameworks || []),
    ...(resume.skills.tools || []),
  ]

  const skillsMatch = matchSkills(
    allUserSkills,
    job.required_skills || [],
    job.preferred_skills || []
  )

  const skillsScore = skillsMatch.match_score * 0.5

  // 2. Experience/Education (0.0 - 0.3)
  let experienceScore = 0.15 // Base score for having any experience

  // Education match
  if (resume.education && resume.education.length > 0) {
    const hasRelevantEducation = resume.education.some(edu =>
      job.education_required
        ? job.education_required.toLowerCase().includes(edu.major?.toLowerCase() || '')
        : true
    )
    if (hasRelevantEducation) experienceScore += 0.05
  }

  // Experience match
  if (resume.experience && resume.experience.length > 0) {
    const hasRelevantExperience = resume.experience.some(exp =>
      job.domain ? exp.title.toLowerCase().includes(job.domain.toLowerCase()) : true
    )
    if (hasRelevantExperience) experienceScore += 0.05
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    experienceScore += 0.05
  }

  experienceScore = Math.min(experienceScore, 0.3)

  // 3. Preference Alignment (0.0 - 0.2)
  let preferenceScore = 0

  // Job type match
  if (job.job_type && preferences.job_types.includes(job.job_type)) {
    preferenceScore += 0.1
  }

  // Location match
  if (jobLocation) {
    const locationMatch = preferences.preferred_locations.some(
      loc =>
        jobLocation.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase() === 'remote'
    )
    if (locationMatch) preferenceScore += 0.1
  }

  // Calculate total score
  const fit_score = skillsScore + experienceScore + preferenceScore

  // Map to fit bucket
  const fit_bucket = mapScoreToBucket(fit_score)

  return {
    fit_score,
    fit_bucket,
    skills_match: skillsMatch,
    experience_score: experienceScore,
    preference_score: preferenceScore,
    components: {
      skills: skillsScore,
      experience: experienceScore,
      preferences: preferenceScore,
    },
  }
}

/**
 * Map numeric score to fit bucket
 */
function mapScoreToBucket(score: number): FitBucket {
  if (score >= 0.8) return FitBucket.EXCELLENT
  if (score >= 0.6) return FitBucket.GOOD
  if (score >= 0.4) return FitBucket.FAIR
  return FitBucket.POOR
}
```

---

## 5. AI Explanation Generation

### 5.1 Explanation Prompt

**File:** `prompts/scoring/explain-fit-v1.md`

```markdown
---
version: 1.0.0
description: Generate human-friendly fit explanation
model: gpt-4o-mini-2024-07-18
maxTokens: 500
---

# Fit Assessment Explainer

Generate a concise, encouraging explanation of job fit.

## Input (JSON)
{
  "fit_bucket": "GOOD",
  "fit_score": 0.72,
  "matching_skills": ["Python", "React"],
  "missing_required_skills": ["TypeScript"],
  "missing_preferred_skills": ["AWS"],
  "job_title": "Software Engineer Intern",
  "user_major": "Computer Science"
}

## Output Format
Plain text explanation (2-4 sentences)

## Instructions
1. Start with a positive statement about the fit
2. Highlight matching skills and qualifications
3. Mention 1-2 key missing skills (if any) without being discouraging
4. End with an actionable suggestion if fit is FAIR or POOR
5. Keep tone encouraging and professional
6. Be specific about skills mentioned

## Examples

**EXCELLENT Fit:**
"This is an excellent match for your profile! Your skills in Python and React align perfectly with the core requirements, and your Computer Science background is a great fit for this Software Engineer Intern role. With your strong foundation, you're well-positioned to excel in this position."

**GOOD Fit:**
"This is a good match for your background. Your experience with Python and React covers most of the required skills for this role. While you'll want to brush up on TypeScript, your solid foundation and relevant projects make you a competitive candidate."

**FAIR Fit:**
"This role could be a decent match with some preparation. You have experience with Python which is valuable here, but learning TypeScript and AWS would significantly strengthen your application. Consider building a small project using these technologies to demonstrate your ability to learn quickly."

**POOR Fit:**
"This role requires skills that don't closely align with your current experience. The position heavily focuses on TypeScript and AWS, which aren't in your current skillset. If you're interested in this type of role, consider taking online courses in these technologies and working on projects to build relevant experience."
```

### 5.2 Explanation Generator

**File:** `lib/fit-explainer.ts`

```typescript
import { openai, MODELS, callOpenAI } from './openai'
import { loadPrompt } from './prompts'
import { FitBucket } from '@prisma/client'

export interface ExplanationInput {
  fit_bucket: FitBucket
  fit_score: number
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
  job_title: string
  user_major?: string
}

/**
 * Generate AI explanation for fit assessment
 */
export async function generateFitExplanation(
  userId: string,
  input: ExplanationInput
): Promise<string> {
  const { content: prompt } = await loadPrompt('scoring', 'explain-fit-v1')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })
  )

  return completion.choices[0].message.content || 'No explanation available.'
}
```

---

## 6. Inngest Function: Job Scoring

### 6.1 Complete Scoring Function

**File:** `inngest/functions/job-scoring.ts`

```typescript
import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { parseJobDescription } from '@/lib/job-parser'
import { calculateFitScore } from '@/lib/fit-scorer'
import { generateFitExplanation } from '@/lib/fit-explainer'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { AiTaskStatus } from '@prisma/client'

export const jobScoringFunction = inngest.createFunction(
  {
    id: 'job-scoring',
    name: 'Job Fit Assessment',
    retries: 2,
  },
  { event: 'job/assess-fit' },
  async ({ event, step }) => {
    const { userId, applicationId } = event.data

    // Verify usage limit
    const canProceed = await checkUsageLimit(userId, 'JOB_SCORING')
    if (!canProceed) {
      throw new Error('Job scoring limit exceeded for this month')
    }

    // Fetch application, job, and profile
    const application = await step.run('fetch-data', async () => {
      return prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          job: true,
          user: {
            include: {
              profile: true,
            },
          },
        },
      })
    })

    if (!application) {
      throw new Error('Application not found')
    }

    const profile = application.user.profile
    if (!profile?.parsed_resume_confirmed_at) {
      throw new Error('User has not confirmed resume')
    }

    // Parse job description
    const parsedJob = await step.run('parse-job', async () => {
      return parseJobDescription(userId, application.job.job_description_raw)
    })

    // Store parsed job
    await step.run('save-parsed-job', async () => {
      await prisma.job.update({
        where: { id: application.job.id },
        data: {
          job_description_parsed: parsedJob as any,
        },
      })
    })

    // Calculate fit score
    const fitScore = await step.run('calculate-fit', async () => {
      return calculateFitScore(
        profile.parsed_resume as any,
        parsedJob,
        {
          job_types: profile.job_types || [],
          preferred_locations: profile.preferred_locations || [],
        },
        application.job.location || undefined
      )
    })

    // Generate explanation
    const explanation = await step.run('generate-explanation', async () => {
      return generateFitExplanation(userId, {
        fit_bucket: fitScore.fit_bucket,
        fit_score: fitScore.fit_score,
        matching_skills: fitScore.skills_match.matching_skills,
        missing_required_skills: fitScore.skills_match.missing_required_skills,
        missing_preferred_skills: fitScore.skills_match.missing_preferred_skills,
        job_title: application.job.title,
        user_major: profile.major || undefined,
      })
    })

    // Save results to application
    await step.run('save-results', async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          fit_bucket: fitScore.fit_bucket,
          fit_score: fitScore.fit_score,
          score_explanation: explanation,
          matching_skills: fitScore.skills_match.matching_skills,
          missing_skills: fitScore.skills_match.missing_required_skills,
        },
      })
    })

    // Increment usage
    await step.run('increment-usage', async () => {
      await incrementUsage(userId, 'JOB_SCORING')
    })

    return {
      applicationId,
      fit_bucket: fitScore.fit_bucket,
      fit_score: fitScore.fit_score,
    }
  }
)
```

---

## 7. UI Components

### 7.1 Fit Badge Component

**File:** `components/jobs/fit-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'
import { FitBucket } from '@prisma/client'
import { cn } from '@/lib/utils'

interface FitBadgeProps {
  fitBucket: FitBucket
  className?: string
}

const FIT_STYLES = {
  EXCELLENT: 'bg-green-100 text-green-800 border-green-200',
  GOOD: 'bg-blue-100 text-blue-800 border-blue-200',
  FAIR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  POOR: 'bg-red-100 text-red-800 border-red-200',
}

const FIT_LABELS = {
  EXCELLENT: 'Excellent Fit',
  GOOD: 'Good Fit',
  FAIR: 'Fair Fit',
  POOR: 'Poor Fit',
}

export function FitBadge({ fitBucket, className }: FitBadgeProps) {
  return (
    <Badge className={cn(FIT_STYLES[fitBucket], 'font-medium', className)}>
      {FIT_LABELS[fitBucket]}
    </Badge>
  )
}
```

### 7.2 Fit Assessment Display

**File:** `components/jobs/fit-assessment.tsx`

```typescript
import { Application } from '@prisma/client'
import { FitBadge } from './fit-badge'
import { Card } from '@/components/ui/card'
import { CheckCircle2, XCircle } from 'lucide-react'

interface FitAssessmentProps {
  application: Application
}

export function FitAssessment({ application }: FitAssessmentProps) {
  if (!application.fit_bucket) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Analyzing fit for this role...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FitBadge fitBucket={application.fit_bucket} />
          <span className="text-sm text-gray-600">
            Score: {Math.round((application.fit_score || 0) * 100)}%
          </span>
        </div>

        <p className="text-gray-700 leading-relaxed">{application.score_explanation}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Matching Skills
          </h3>
          <ul className="space-y-1">
            {application.matching_skills.map((skill, i) => (
              <li key={i} className="text-sm text-gray-700">
                • {skill}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-orange-600" />
            Skills to Develop
          </h3>
          <ul className="space-y-1">
            {application.missing_skills.map((skill, i) => (
              <li key={i} className="text-sm text-gray-700">
                • {skill}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
```

---

## 8. Verification Checklist

- [ ] Job description parsing extracts skills correctly
- [ ] Skills matching algorithm works with various skill formats
- [ ] Fit score calculation includes all components
- [ ] Fit bucket mapping is correct
- [ ] AI explanation is generated and encouraging
- [ ] Inngest function completes successfully
- [ ] Results saved to Application table
- [ ] Usage tracking increments
- [ ] UI displays fit badge and explanation
- [ ] Matching and missing skills shown

---

## 9. Next Steps

Proceed to **Stage 6: Document Generation** to implement resume and cover letter generation with PDF rendering.
