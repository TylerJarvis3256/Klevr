# Stage 7: Company Research

**Stage:** 7 of 14
**Dependencies:** Stage 4 (AI Infrastructure)
**Estimated Effort:** Moderate feature

---

## Overview

Implement LLM-only company research summaries. Provides AI-generated company insights, talking points, and suggestions for user research without relying on external APIs.

### Goals
- Create company research prompt (LLM-only, no external data)
- Generate high-level company overview
- Provide talking points for interviews
- Include disclaimer about AI-generated content
- Store research in Application model
- Display research on job detail page

**Note:** V1 uses LLM knowledge only. No web scraping or external company data APIs.

---

## 1. Company Research Prompt

### 1.1 Research Prompt

**File:** `prompts/research/company-v1.md`

```markdown
---
version: 1.0.0
description: Generate company research summary (LLM-only)
model: gpt-4o-mini-2024-07-18
maxTokens: 1000
---

# Company Research Summary Generator

Generate a helpful company overview based on general knowledge.

## Input (JSON)
{
  "company_name": "Google",
  "job_title": "Software Engineering Intern",
  "job_description": "Brief excerpt..."
}

## Output Format (JSON)
{
  "overview": "2-3 sentence high-level company overview",
  "talking_points": [
    "Key fact or talking point for interviews",
    "Another relevant point",
    "Third point"
  ],
  "things_to_research": [
    "Specific thing candidate should research",
    "Another specific area to explore"
  ],
  "culture_notes": "Brief note about company culture (if well-known)"
}

## Instructions
1. **General knowledge only** - use your training data, no real-time web access
2. **Be cautious** - if you're uncertain about specific details, be vague
3. **Focus on evergreen information** - avoid time-sensitive facts
4. **For well-known companies** - provide industry, scale, notable products
5. **For lesser-known companies** - focus on industry context and suggest research
6. **Talking points** - provide 3-5 interview-ready discussion points
7. **Research suggestions** - guide user to verify and deepen knowledge
8. **Culture** - mention if widely known (e.g., "known for innovation")
9. **No fabrication** - if uncertain, acknowledge limitation
10. Return ONLY valid JSON

## Examples

### Example 1: Well-Known Company (Google)
{
  "overview": "Google is a global technology leader specializing in search, cloud computing, and AI. As part of Alphabet Inc., Google operates at massive scale serving billions of users worldwide.",
  "talking_points": [
    "Known for engineering excellence and innovation in AI and machine learning",
    "Strong emphasis on data-driven decision making and scalable systems",
    "Collaborative culture with focus on 'moonshot' thinking and ambitious projects"
  ],
  "things_to_research": [
    "Recent product launches or features in the team's domain",
    "Specific technologies and tools used by the team (from job description)",
    "Google's approach to intern mentorship and growth opportunities"
  ],
  "culture_notes": "Known for innovative, collaborative culture with emphasis on engineering excellence and ambitious thinking."
}

### Example 2: Lesser-Known Company
{
  "overview": "Based on the job description, this appears to be a technology company in the [domain] space. Research their specific products and market position.",
  "talking_points": [
    "Research the company's core products and how they differentiate in the market",
    "Understand the technical challenges in this specific domain",
    "Learn about the company's growth stage and funding (if applicable)"
  ],
  "things_to_research": [
    "Company website, About page, and team backgrounds",
    "Recent news articles or press releases",
    "LinkedIn profiles of current employees to understand team composition",
    "Glassdoor or similar sites for culture insights"
  ],
  "culture_notes": "Research company reviews and employee testimonials to understand work environment."
}
```

---

## 2. Company Research Function

### 2.1 Research Generator

**File:** `lib/company-researcher.ts`

```typescript
import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'

export interface CompanyResearch {
  overview: string
  talking_points: string[]
  things_to_research: string[]
  culture_notes?: string
}

/**
 * Generate company research summary (LLM-only)
 */
export async function generateCompanyResearch(
  userId: string,
  companyName: string,
  jobTitle: string,
  jobDescription: string
): Promise<CompanyResearch> {
  const { content: prompt } = await loadPrompt('research', 'company-v1')

  // Truncate job description to avoid token limits
  const truncatedDescription = jobDescription.substring(0, 500)

  const input = {
    company_name: companyName,
    job_title: jobTitle,
    job_description: truncatedDescription,
  }

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1000,
    })
  )

  return parseOpenAIJson<CompanyResearch>(completion.choices[0].message.content)
}
```

---

## 3. Inngest Function

### 3.1 Company Research Function

**File:** `inngest/functions/company-research.ts`

```typescript
import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateCompanyResearch } from '@/lib/company-researcher'

export const companyResearchFunction = inngest.createFunction(
  {
    id: 'company-research',
    name: 'Company Research Summary',
    retries: 2,
  },
  { event: 'company/research' },
  async ({ event, step }) => {
    const { userId, applicationId } = event.data

    // Fetch application and job
    const application = await step.run('fetch-application', async () => {
      return prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true },
      })
    })

    if (!application) {
      throw new Error('Application not found')
    }

    // Generate research
    const research = await step.run('generate-research', async () => {
      return generateCompanyResearch(
        userId,
        application.job.company,
        application.job.title,
        application.job.job_description_raw
      )
    })

    // Save to application
    await step.run('save-research', async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          company_research: research as any,
        },
      })
    })

    return { success: true }
  }
)
```

---

## 4. API Route

### 4.1 Trigger Company Research

**File:** `/app/api/ai/company-research/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { inngest } from '@/lib/inngest'

const schema = z.object({
  applicationId: z.string(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationId } = schema.parse(body)

    await inngest.send({
      name: 'company/research',
      data: {
        userId: user.id,
        applicationId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

---

## 5. UI Component

### 5.1 Company Research Display

**File:** `components/jobs/company-research.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { Application } from '@prisma/client'

interface CompanyResearchProps {
  application: Application
  company: string
}

export function CompanyResearch({ application, company }: CompanyResearchProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const research = application.company_research as any

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await fetch('/api/ai/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.id }),
      })
      // Poll for updates or use SSE
    } catch (error) {
      console.error('Failed to generate research:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!research) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600 mb-4">
          Get AI-generated insights about {company} to prepare for your application.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Company Insights'
          )}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>AI-Generated Summary:</strong> This information is based on general knowledge
            and may not reflect current details. Always verify facts and research the company
            thoroughly before applying or interviewing.
          </div>
        </div>
      </Card>

      {/* Overview */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3">Company Overview</h3>
        <p className="text-gray-700 leading-relaxed">{research.overview}</p>
      </Card>

      {/* Talking Points */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          Talking Points
          <Badge variant="outline" className="text-xs">
            For Interviews
          </Badge>
        </h3>
        <ul className="space-y-2">
          {research.talking_points?.map((point: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent-teal font-bold">•</span>
              <span className="text-gray-700">{point}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Things to Research */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3">What to Research Next</h3>
        <ul className="space-y-2">
          {research.things_to_research?.map((item: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent-orange font-bold">→</span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Culture Notes */}
      {research.culture_notes && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-3">Culture Notes</h3>
          <p className="text-gray-700">{research.culture_notes}</p>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" onClick={handleGenerate} disabled={isGenerating}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>
    </div>
  )
}
```

---

## 6. Automatic Research Trigger

Optionally trigger company research automatically when job is created or when user views job detail for the first time.

**In job creation API:**
```typescript
// After creating application
await inngest.send({
  name: 'company/research',
  data: {
    userId: user.id,
    applicationId: application.id,
  },
})
```

---

## 7. Verification Checklist

- [ ] Company research prompt generates appropriate content
- [ ] Well-known companies get detailed insights
- [ ] Lesser-known companies get research suggestions
- [ ] Disclaimer prominently displayed in UI
- [ ] Research can be regenerated
- [ ] Research stored in Application.company_research
- [ ] Research displays correctly on job detail page
- [ ] No external API calls made (LLM-only)

---

## 8. Next Steps

Proceed to **Stage 8: Dashboard & Pipeline** to build the main application tracking interface.
