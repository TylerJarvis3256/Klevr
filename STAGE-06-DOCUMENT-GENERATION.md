# Stage 6: Document Generation

**Stage:** 6 of 14
**Dependencies:** Stages 2, 3, 4
**Estimated Effort:** Major feature implementation

---

## Overview

Implement AI-powered resume and cover letter generation with PDF rendering. Uses OpenAI to create tailored content based on job descriptions and user profiles, then renders professional PDFs using @react-pdf/renderer.

### Goals
- Build resume generation prompts and logic
- Build cover letter generation prompts
- Implement PDF templates (Classic ATS, Modern ATS)
- Create PDF generation pipeline
- Set up S3 storage for generated documents
- Implement monthly usage limits (30 resumes, 30 cover letters)
- Track prompt versions for all generations

---

## 1. Resume Generation

### 1.1 Resume Generation Prompt

**File:** `prompts/resume/generate-v1.md`

```markdown
---
version: 1.0.0
description: Generate tailored resume content
model: gpt-4o-2024-05-13
maxTokens: 3000
---

# Tailored Resume Generator

Generate a tailored resume optimized for a specific job posting.

## Input (JSON)
{
  "user_resume": { /* ParsedResume structure */ },
  "job": { /* Job and parsed job description */ },
  "preferences": { /* User preferences */ }
}

## Output Format (JSON)
{
  "summary": "Brief professional summary (2-3 sentences)",
  "experience": [
    {
      "title": "Position Title",
      "company": "Company Name",
      "location": "City, State",
      "dates": "Month Year - Month Year",
      "bullets": [
        "Tailored achievement emphasizing relevant skills",
        "Quantified result related to job requirements"
      ]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "school": "University Name",
      "graduation": "May 2025",
      "gpa": "3.8"
    }
  ],
  "skills": {
    "technical": ["Python", "React", "AWS"],
    "other": ["Team Leadership", "Agile"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description emphasizing relevant technologies",
      "technologies": ["React", "Node.js"]
    }
  ]
}

## Instructions
1. **Tailor experience bullets** to highlight skills matching the job requirements
2. **Reorder and emphasize** relevant experiences first
3. **Add quantified results** where possible (% improvements, scale, impact)
4. **Match keywords** from job description naturally
5. **Highlight relevant coursework** and projects
6. **Keep professional tone** - no exaggeration
7. **Skills section** should prioritize job-required skills
8. **Summary** should position candidate for THIS specific role
9. Return ONLY valid JSON
```

### 1.2 Resume Generator Function

**File:** `lib/resume-generator.ts`

```typescript
import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'
import type { ParsedResume } from './resume-parser'
import type { Job } from '@prisma/client'

export interface GeneratedResumeContent {
  summary: string
  experience: Array<{
    title: string
    company: string
    location?: string
    dates: string
    bullets: string[]
  }>
  education: Array<{
    degree: string
    school: string
    graduation: string
    gpa?: string
  }>
  skills: {
    technical: string[]
    other: string[]
  }
  projects: Array<{
    name: string
    description: string
    technologies: string[]
  }>
}

export async function generateResumeContent(
  userId: string,
  userResume: ParsedResume,
  job: Job,
  jobParsed: any
): Promise<GeneratedResumeContent> {
  const { content: prompt, metadata } = await loadPrompt('resume', 'generate-v1')

  const input = {
    user_resume: userResume,
    job: {
      title: job.title,
      company: job.company,
      description: jobParsed,
    },
  }

  const completion = await callOpenAI(
    userId,
    () =>
      openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 45000 } // 45 seconds for resume generation
  )

  return parseOpenAIJson<GeneratedResumeContent>(completion.choices[0].message.content)
}
```

---

## 2. Cover Letter Generation

### 2.1 Cover Letter Prompt

**File:** `prompts/cover-letter/generate-v1.md`

```markdown
---
version: 1.0.0
description: Generate tailored cover letter
model: gpt-4o-2024-05-13
maxTokens: 1500
---

# Tailored Cover Letter Generator

Generate a professional, personalized cover letter.

## Input (JSON)
{
  "user_name": "Full Name",
  "user_resume": { /* ParsedResume */ },
  "job": {
    "title": "Job Title",
    "company": "Company Name",
    "description": "..."
  }
}

## Output Format (Plain Text)
[Formatted cover letter with proper structure]

## Structure
1. **Opening Paragraph**
   - Express enthusiasm for the specific role
   - Briefly state why you're a strong fit

2. **Body Paragraph 1 (Skills & Experience)**
   - Highlight 2-3 relevant experiences
   - Connect to job requirements
   - Use specific examples

3. **Body Paragraph 2 (Motivation & Fit)**
   - Explain interest in company/role
   - Show knowledge of company
   - Emphasize cultural fit

4. **Closing Paragraph**
   - Reiterate interest
   - Call to action (interview request)
   - Professional close

## Guidelines
- Length: 250-350 words (3-4 paragraphs)
- Tone: Professional, enthusiastic, confident
- Use "I" statements but focus on value to employer
- Be specific - no generic phrases
- Match energy to company culture (formal vs startup)
- No fabrication - use only provided experience
- Natural keyword integration
```

### 2.2 Cover Letter Generator

**File:** `lib/cover-letter-generator.ts`

```typescript
import { openai, MODELS, callOpenAI } from './openai'
import { loadPrompt } from './prompts'
import type { ParsedResume } from './resume-parser'
import type { Job } from '@prisma/client'

export async function generateCoverLetterContent(
  userId: string,
  userName: string,
  userResume: ParsedResume,
  job: Job
): Promise<string> {
  const { content: prompt, metadata } = await loadPrompt('cover-letter', 'generate-v1')

  const input = {
    user_name: userName,
    user_resume: userResume,
    job: {
      title: job.title,
      company: job.company,
      description: job.job_description_raw,
    },
  }

  const completion = await callOpenAI(
    userId,
    () =>
      openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0.8,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 30000 }
  )

  return completion.choices[0].message.content || ''
}
```

---

## 3. PDF Generation with @react-pdf/renderer

### 3.1 Classic ATS Template

**File:** `lib/pdf/templates/classic-ats.tsx`

```typescript
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { GeneratedResumeContent } from '@/lib/resume-generator'

// Register fonts (optional - use web-safe fonts for ATS)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contact: {
    fontSize: 10,
    color: '#444',
    marginBottom: 10,
  },
  summary: {
    fontSize: 11,
    marginBottom: 15,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1pt solid #000',
    paddingBottom: 3,
  },
  experienceItem: {
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  company: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  dates: {
    fontSize: 9,
    color: '#666',
  },
  bullet: {
    fontSize: 10,
    marginLeft: 15,
    marginTop: 2,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skill: {
    fontSize: 10,
    marginRight: 10,
    marginBottom: 3,
  },
})

interface ClassicATSResumeProps {
  content: GeneratedResumeContent
  userInfo: {
    name: string
    email: string
    phone?: string
    location?: string
  }
}

export function ClassicATSResume({ content, userInfo }: ClassicATSResumeProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{userInfo.name}</Text>
          <Text style={styles.contact}>
            {userInfo.email}
            {userInfo.phone && ` • ${userInfo.phone}`}
            {userInfo.location && ` • ${userInfo.location}`}
          </Text>
        </View>

        {/* Summary */}
        {content.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
            <Text style={styles.summary}>{content.summary}</Text>
          </View>
        )}

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EDUCATION</Text>
          {content.education.map((edu, i) => (
            <View key={i} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{edu.degree}</Text>
              <Text style={styles.company}>
                {edu.school} • {edu.graduation}
                {edu.gpa && ` • GPA: ${edu.gpa}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXPERIENCE</Text>
          {content.experience.map((exp, i) => (
            <View key={i} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.company}>
                {exp.company}
                {exp.location && ` • ${exp.location}`}
              </Text>
              <Text style={styles.dates}>{exp.dates}</Text>
              {exp.bullets.map((bullet, j) => (
                <Text key={j} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Projects */}
        {content.projects && content.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            {content.projects.map((project, i) => (
              <View key={i} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{project.name}</Text>
                <Text style={styles.bullet}>• {project.description}</Text>
                <Text style={styles.bullet}>
                  • Technologies: {project.technologies.join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SKILLS</Text>
          <View style={styles.skillsGrid}>
            {content.skills.technical.map((skill, i) => (
              <Text key={i} style={styles.skill}>
                {skill}
              </Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )
}
```

### 3.2 PDF Renderer Utility

**File:** `lib/pdf/renderer.ts`

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { ClassicATSResume } from './templates/classic-ats'
import type { GeneratedResumeContent } from '@/lib/resume-generator'

export async function renderResumePDF(
  content: GeneratedResumeContent,
  userInfo: {
    name: string
    email: string
    phone?: string
    location?: string
  },
  template: 'classic-ats' | 'modern-ats' = 'classic-ats'
): Promise<Buffer> {
  const Component =
    template === 'classic-ats' ? ClassicATSResume : ClassicATSResume // Add Modern template later

  const doc = Component({ content, userInfo })
  return renderToBuffer(doc)
}

export async function renderCoverLetterPDF(
  content: string,
  userInfo: {
    name: string
    email: string
    phone?: string
  },
  jobInfo: {
    title: string
    company: string
  }
): Promise<Buffer> {
  // Simple cover letter PDF template
  const { Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

  const styles = StyleSheet.create({
    page: { padding: 60, fontSize: 11, lineHeight: 1.6 },
    header: { marginBottom: 30 },
    name: { fontSize: 16, fontWeight: 'bold' },
    contact: { fontSize: 10, color: '#666', marginTop: 5 },
    date: { marginBottom: 20, fontSize: 10 },
    body: { fontSize: 11, textAlign: 'justify' },
    paragraph: { marginBottom: 12 },
  })

  const CoverLetterDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{userInfo.name}</Text>
          <Text style={styles.contact}>
            {userInfo.email}
            {userInfo.phone && ` • ${userInfo.phone}`}
          </Text>
        </View>

        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>

        <Text style={styles.body}>
          Hiring Manager
          {'\n'}
          {jobInfo.company}
          {'\n\n'}
        </Text>

        <Text style={styles.body}>{content}</Text>

        <Text style={styles.body}>
          {'\n\n'}
          Sincerely,
          {'\n'}
          {userInfo.name}
        </Text>
      </Page>
    </Document>
  )

  return renderToBuffer(CoverLetterDoc)
}
```

---

## 4. S3 Upload for Generated Documents

**File:** `lib/s3.ts` (add these functions)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!

/**
 * Upload PDF buffer to S3
 */
export async function uploadDocumentToS3(
  buffer: Buffer,
  key: string,
  contentType = 'application/pdf'
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)
}

/**
 * Generate S3 key for generated document
 */
export function generateDocumentKey(
  userId: string,
  applicationId: string,
  type: 'resume' | 'cover-letter'
): string {
  const timestamp = Date.now()
  return `generated-documents/${userId}/${applicationId}/${type}-${timestamp}.pdf`
}
```

---

## 5. Inngest Functions

### 5.1 Resume Generation Function

**File:** `inngest/functions/resume-generation.ts`

```typescript
import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateResumeContent } from '@/lib/resume-generator'
import { renderResumePDF } from '@/lib/pdf/renderer'
import { uploadDocumentToS3, generateDocumentKey } from '@/lib/s3'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { DocumentType } from '@prisma/client'

export const resumeGenerationFunction = inngest.createFunction(
  {
    id: 'resume-generation',
    name: 'Generate Tailored Resume',
    retries: 2,
  },
  { event: 'resume/generate' },
  async ({ event, step }) => {
    const { userId, applicationId } = event.data

    // Check usage limit
    const canProceed = await checkUsageLimit(userId, 'RESUME_GENERATION')
    if (!canProceed) {
      throw new Error('Resume generation limit exceeded')
    }

    // Fetch data
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

    if (!application?.user.profile?.parsed_resume) {
      throw new Error('User profile or resume not found')
    }

    // Generate content
    const content = await step.run('generate-content', async () => {
      return generateResumeContent(
        userId,
        application.user.profile!.parsed_resume as any,
        application.job,
        application.job.job_description_parsed || {}
      )
    })

    // Render PDF
    const pdfBuffer = await step.run('render-pdf', async () => {
      return renderResumePDF(content, {
        name: application.user.profile!.full_name || 'Your Name',
        email: application.user.email,
        phone: (application.user.profile!.parsed_resume as any)?.personal?.phone,
        location: (application.user.profile!.parsed_resume as any)?.personal?.location,
      })
    })

    // Upload to S3
    const key = await step.run('upload-to-s3', async () => {
      const documentKey = generateDocumentKey(userId, applicationId, 'resume')
      await uploadDocumentToS3(pdfBuffer, documentKey)
      return documentKey
    })

    // Save document record
    const document = await step.run('save-document', async () => {
      return prisma.generatedDocument.create({
        data: {
          application_id: applicationId,
          type: DocumentType.RESUME,
          storage_url: key,
          structured_data: content as any,
          prompt_version: 'resume-v1.0.0',
          model_used: 'gpt-4o-2024-05-13',
        },
      })
    })

    // Increment usage
    await step.run('increment-usage', async () => {
      await incrementUsage(userId, 'RESUME_GENERATION')
    })

    return { documentId: document.id }
  }
)
```

### 5.2 Cover Letter Generation Function

**File:** `inngest/functions/cover-letter-generation.ts`

```typescript
import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateCoverLetterContent } from '@/lib/cover-letter-generator'
import { renderCoverLetterPDF } from '@/lib/pdf/renderer'
import { uploadDocumentToS3, generateDocumentKey } from '@/lib/s3'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { DocumentType } from '@prisma/client'

export const coverLetterGenerationFunction = inngest.createFunction(
  {
    id: 'cover-letter-generation',
    name: 'Generate Tailored Cover Letter',
    retries: 2,
  },
  { event: 'cover-letter/generate' },
  async ({ event, step }) => {
    const { userId, applicationId } = event.data

    const canProceed = await checkUsageLimit(userId, 'COVER_LETTER_GENERATION')
    if (!canProceed) {
      throw new Error('Cover letter generation limit exceeded')
    }

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

    if (!application?.user.profile?.parsed_resume) {
      throw new Error('User profile or resume not found')
    }

    const content = await step.run('generate-content', async () => {
      return generateCoverLetterContent(
        userId,
        application.user.profile!.full_name || 'Your Name',
        application.user.profile!.parsed_resume as any,
        application.job
      )
    })

    const pdfBuffer = await step.run('render-pdf', async () => {
      return renderCoverLetterPDF(
        content,
        {
          name: application.user.profile!.full_name || 'Your Name',
          email: application.user.email,
          phone: (application.user.profile!.parsed_resume as any)?.personal?.phone,
        },
        {
          title: application.job.title,
          company: application.job.company,
        }
      )
    })

    const key = await step.run('upload-to-s3', async () => {
      const documentKey = generateDocumentKey(userId, applicationId, 'cover-letter')
      await uploadDocumentToS3(pdfBuffer, documentKey)
      return documentKey
    })

    const document = await step.run('save-document', async () => {
      return prisma.generatedDocument.create({
        data: {
          application_id: applicationId,
          type: DocumentType.COVER_LETTER,
          storage_url: key,
          structured_data: { content } as any,
          prompt_version: 'cover-letter-v1.0.0',
          model_used: 'gpt-4o-2024-05-13',
        },
      })
    })

    await step.run('increment-usage', async () => {
      await incrementUsage(userId, 'COVER_LETTER_GENERATION')
    })

    return { documentId: document.id }
  }
)
```

---

## 6. API Routes

### 6.1 Trigger Resume Generation

**File:** `/app/api/ai/resume/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'

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

    const taskId = await createAiTask({
      userId: user.id,
      type: 'RESUME_GENERATION',
      applicationId,
      data: {},
    })

    return NextResponse.json({ taskId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

**Similar route for cover letters:** `/app/api/ai/cover-letter/route.ts`

---

## 7. Verification Checklist

- [ ] Resume content generation works
- [ ] Cover letter content generation works
- [ ] PDF templates render correctly
- [ ] PDFs uploaded to S3
- [ ] Document records created with prompt version
- [ ] Usage limits enforced
- [ ] Usage tracking increments
- [ ] SSE updates work for generation status
- [ ] Generated documents appear in UI
- [ ] Download links work

---

## 8. Next Steps

Proceed to **Stage 7: Company Research** for LLM-based company insights.
