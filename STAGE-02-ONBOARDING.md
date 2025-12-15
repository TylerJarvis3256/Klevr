# Stage 2: User Profile & Onboarding

**Stage:** 2 of 14
**Dependencies:** Stage 1 (Foundation & Setup)
**Estimated Effort:** Major feature implementation

---

## Overview

This stage implements the complete user onboarding experience, including profile setup, resume upload, AI-powered resume parsing, and the critical resume review/confirmation flow.

### Goals

- Create 4-step guided onboarding flow
- Implement resume file upload to S3
- Build AI-powered resume parsing with OpenAI
- Create editable resume review interface
- Implement profile management page
- Ensure resume confirmation is required before AI features

---

## 1. Onboarding Flow Architecture

### 1.1 Flow Diagram

```
Signup/Login (Auth0)
    ↓
Step 1: Basics (name, school, major, grad year)
    ↓
Step 2: Preferences (job types, locations)
    ↓
Step 3: Resume Upload (PDF/DOCX or paste text)
    ↓
Step 4: Resume Review (AI-parsed, editable, must confirm)
    ↓
Dashboard (redirect to /dashboard)
```

### 1.2 Stepper Component Requirements

- Visual progress indicator (1/4, 2/4, 3/4, 4/4)
- "Back" and "Next" navigation
- Auto-save on each step (optional but nice)
- Cannot skip steps in sequence
- Completion state saved in `Profile` table

---

## 2. Database Migrations

### 2.1 Add Onboarding Tracking to Profile

The `Profile` model from Stage 1 already includes:

- `parsed_resume_confirmed_at` - Critical field for resume confirmation
- `resume_file_url` - S3 key for uploaded resume
- `resume_file_name` - Original filename
- `resume_uploaded_at` - Timestamp
- `parsed_resume` - JSON structured data

No additional migrations needed if Stage 1 schema is complete.

---

## 3. Step 1: Basics

### 3.1 Page: `/app/(onboarding)/basics/page.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { toast } from '@/components/ui/use-toast'

const basicsSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  school: z.string().min(1, 'School is required'),
  major: z.string().min(1, 'Major is required'),
  graduation_year: z.coerce.number().min(2020).max(2035, 'Invalid graduation year'),
})

type BasicsFormData = z.infer<typeof basicsSchema>

export default function OnboardingBasicsPage() {
  const router = useRouter()
  const form = useForm<BasicsFormData>({
    resolver: zodResolver(basicsSchema),
  })

  async function onSubmit(data: BasicsFormData) {
    try {
      const res = await fetch('/api/profile/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to save')

      router.push('/onboarding/preferences')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <OnboardingStepper currentStep={1} totalSteps={4} />

      <div className="mt-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Let's start with the basics</h1>
        <p className="text-gray-600 mb-8">
          Tell us a bit about yourself so we can personalize your experience.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School / University</FormLabel>
                  <FormControl>
                    <Input placeholder="Stanford University" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="major"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major / Field of Study</FormLabel>
                  <FormControl>
                    <Input placeholder="Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="graduation_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Graduation Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="submit" size="lg">
                Next Step
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
```

### 3.2 API Route: `/app/api/profile/basics/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const basicsSchema = z.object({
  full_name: z.string().min(1),
  school: z.string().min(1),
  major: z.string().min(1),
  graduation_year: z.number().min(2020).max(2035),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = basicsSchema.parse(body)

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        ...data,
      },
      update: data,
    })

    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error saving basics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 4. Step 2: Preferences

### 4.1 Page: `/app/(onboarding)/preferences/page.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { MultiSelect } from '@/components/ui/multi-select'
import { toast } from '@/components/ui/use-toast'

const JOB_TYPES = [
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
]

const preferencesSchema = z.object({
  job_types: z.array(z.string()).min(1, 'Select at least one job type'),
  preferred_locations: z.array(z.string()).min(1, 'Add at least one location'),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      job_types: [],
      preferred_locations: [],
    },
  })

  async function onSubmit(data: PreferencesFormData) {
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to save')

      router.push('/onboarding/resume-upload')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <OnboardingStepper currentStep={2} totalSteps={4} />

      <div className="mt-8">
        <h1 className="font-heading text-3xl font-bold mb-2">What are you looking for?</h1>
        <p className="text-gray-600 mb-8">
          Help us understand your job preferences.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="job_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Types</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={JOB_TYPES}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select job types..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Locations</FormLabel>
                  <FormControl>
                    <LocationInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/onboarding/basics')}
              >
                Back
              </Button>
              <Button type="submit" size="lg">
                Next Step
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
```

### 4.2 API Route: `/app/api/profile/preferences/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const preferencesSchema = z.object({
  job_types: z.array(z.string()),
  preferred_locations: z.array(z.string()),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = preferencesSchema.parse(body)

    const profile = await prisma.profile.update({
      where: { user_id: user.id },
      data,
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 5. Step 3: Resume Upload

### 5.1 S3 Setup

Create `lib/s3.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!

/**
 * Generate presigned URL for uploading a file
 */
export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
}

/**
 * Generate presigned URL for downloading a file
 */
export async function generateDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Generate S3 key for resume file
 */
export function generateResumeKey(userId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `resumes/${userId}/${timestamp}-${sanitized}`
}
```

### 5.2 API Route: Presigned URL

Create `/app/api/upload/resume-url/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { generateUploadUrl, generateResumeKey } from '@/lib/s3'

const requestSchema = z.object({
  filename: z.string(),
  contentType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { filename, contentType } = requestSchema.parse(body)

    const key = generateResumeKey(user.id, filename)
    const uploadUrl = await generateUploadUrl(key, contentType)

    return NextResponse.json({
      uploadUrl,
      key,
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 5.3 Page: `/app/(onboarding)/resume-upload/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { FileUpload } from '@/components/forms/file-upload'
import { toast } from '@/components/ui/use-toast'

export default function OnboardingResumeUploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileUpload(file: File) {
    setIsUploading(true)
    try {
      // 1. Get presigned URL
      const urlRes = await fetch('/api/upload/resume-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      })

      if (!urlRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, key } = await urlRes.json()

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) throw new Error('Failed to upload file')

      // 3. Save to profile and trigger parsing
      const saveRes = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          filename: file.name,
        }),
      })

      if (!saveRes.ok) throw new Error('Failed to save resume')

      const { parseTaskId } = await saveRes.json()

      // 4. Redirect to review page (parsing happens in background)
      router.push(`/onboarding/resume-review?taskId=${parseTaskId}`)
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload resume. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <OnboardingStepper currentStep={3} totalSteps={4} />

      <div className="mt-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Upload your resume</h1>
        <p className="text-gray-600 mb-8">
          We'll parse your resume to help tailor applications. You'll be able to review and edit everything.
        </p>

        <FileUpload
          accept=".pdf,.docx"
          maxSize={5 * 1024 * 1024} // 5MB
          onUpload={handleFileUpload}
          isUploading={isUploading}
        />

        <div className="flex justify-between gap-4 pt-8">
          <Button
            variant="secondary"
            onClick={() => router.push('/onboarding/preferences')}
          >
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/onboarding/resume-review')}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 6. Resume Parsing (OpenAI)

### 6.1 Create OpenAI Client

Create `lib/openai.ts`:

```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export const MODELS = {
  GPT4O: 'gpt-4o-2024-05-13',
  GPT4O_MINI: 'gpt-4o-mini-2024-07-18',
} as const
```

### 6.2 Resume Parsing Prompt

Create `prompts/resume/parse-v1.md`:

```markdown
# Resume Parsing Prompt v1.0.0

You are a resume parser. Extract structured information from the provided resume text.

## Input

Resume text (from PDF extraction or paste)

## Output Format (JSON)

{
"personal": {
"name": "Full Name",
"email": "email@example.com",
"phone": "123-456-7890",
"location": "City, State",
"linkedin": "https://linkedin.com/in/username",
"github": "https://github.com/username",
"website": "https://example.com"
},
"education": [
{
"school": "University Name",
"degree": "Bachelor of Science",
"major": "Computer Science",
"graduationDate": "May 2025",
"gpa": "3.8"
}
],
"experience": [
{
"title": "Software Engineering Intern",
"company": "Company Name",
"location": "City, State",
"startDate": "June 2023",
"endDate": "August 2023",
"current": false,
"bullets": [
"Achievement or responsibility 1",
"Achievement or responsibility 2"
]
}
],
"projects": [
{
"name": "Project Name",
"description": "Brief description",
"technologies": ["React", "Node.js"],
"url": "https://github.com/..."
}
],
"skills": {
"languages": ["Python", "JavaScript"],
"frameworks": ["React", "Node.js"],
"tools": ["Git", "Docker"],
"other": ["Agile", "Team Leadership"]
},
"certifications": [
{
"name": "AWS Certified Developer",
"issuer": "Amazon Web Services",
"date": "January 2024"
}
]
}

## Instructions

1. Extract all available information
2. Use null for missing fields
3. Preserve formatting and bullet points
4. Return only valid JSON
5. If a section is empty, use an empty array []
```

### 6.3 Resume Parsing Function

Create `lib/resume-parser.ts`:

```typescript
import { openai, MODELS } from './openai'
import fs from 'fs/promises'

export interface ParsedResume {
  personal: {
    name?: string
    email?: string
    phone?: string
    location?: string
    linkedin?: string
    github?: string
    website?: string
  }
  education: Array<{
    school: string
    degree?: string
    major?: string
    graduationDate?: string
    gpa?: string
  }>
  experience: Array<{
    title: string
    company: string
    location?: string
    startDate?: string
    endDate?: string
    current: boolean
    bullets: string[]
  }>
  projects: Array<{
    name: string
    description?: string
    technologies: string[]
    url?: string
  }>
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    other: string[]
  }
  certifications: Array<{
    name: string
    issuer?: string
    date?: string
  }>
}

/**
 * Parse resume text using OpenAI
 */
export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  const prompt = await fs.readFile('prompts/resume/parse-v1.md', 'utf-8')

  const response = await openai.chat.completions.create({
    model: MODELS.GPT4O_MINI,
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: resumeText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No response from OpenAI')

  return JSON.parse(content) as ParsedResume
}
```

### 6.4 API Route: Resume Upload & Parse

Create `/app/api/resume/upload/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { inngest } from '@/lib/inngest'

const uploadSchema = z.object({
  key: z.string(),
  filename: z.string(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, filename } = uploadSchema.parse(body)

    // Update profile with resume file info
    await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        resume_file_url: key,
        resume_file_name: filename,
        resume_uploaded_at: new Date(),
      },
    })

    // Trigger parsing task
    const event = await inngest.send({
      name: 'resume/parse',
      data: {
        userId: user.id,
        resumeKey: key,
      },
    })

    return NextResponse.json({
      success: true,
      parseTaskId: event.ids[0],
    })
  } catch (error) {
    console.error('Error uploading resume:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 7. Step 4: Resume Review

### 7.1 Page: `/app/(onboarding)/resume-review/page.tsx`

This page allows users to review and edit parsed resume data before confirming.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { ResumeEditor } from '@/components/profile/resume-editor'
import { toast } from '@/components/ui/use-toast'
import type { ParsedResume } from '@/lib/resume-parser'

export default function OnboardingResumeReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const taskId = searchParams.get('taskId')

  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null)
  const [isLoading, setIsLoading] = useState(!!taskId)

  useEffect(() => {
    if (taskId) {
      // Poll for parsing completion
      const interval = setInterval(async () => {
        const res = await fetch(`/api/resume/parse-status?taskId=${taskId}`)
        const data = await res.json()

        if (data.status === 'COMPLETED') {
          setParsedResume(data.parsed)
          setIsLoading(false)
          clearInterval(interval)
        } else if (data.status === 'FAILED') {
          toast({
            title: 'Parsing failed',
            description: 'We had trouble reading your resume. Please review and fill in missing information.',
            variant: 'destructive',
          })
          setIsLoading(false)
          clearInterval(interval)
        }
      }, 2000)

      return () => clearInterval(interval)
    } else {
      // Load existing parsed resume
      fetchExistingResume()
    }
  }, [taskId])

  async function fetchExistingResume() {
    const res = await fetch('/api/profile')
    const data = await res.json()
    setParsedResume(data.parsed_resume)
  }

  async function handleConfirm(data: ParsedResume) {
    try {
      const res = await fetch('/api/resume/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_resume: data }),
      })

      if (!res.ok) throw new Error('Failed to confirm')

      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save resume. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <OnboardingStepper currentStep={4} totalSteps={4} />
        <div className="mt-8 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Parsing your resume...</h1>
          <p className="text-gray-600">This will just take a moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-12">
      <OnboardingStepper currentStep={4} totalSteps={4} />

      <div className="mt-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Review your resume</h1>
        <p className="text-gray-600 mb-8">
          We've parsed your resume. Please review and edit as needed.
        </p>

        <ResumeEditor
          initialData={parsedResume}
          onSubmit={handleConfirm}
          submitLabel="Looks good!"
        />
      </div>
    </div>
  )
}
```

### 7.2 API Route: Confirm Resume

Create `/app/api/resume/confirm/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { parsed_resume } = body

    // Update profile with confirmed parsed resume
    await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        parsed_resume,
        parsed_resume_confirmed_at: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error confirming resume:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 8. Profile Page

### 8.1 Page: `/app/(main)/profile/page.tsx`

Allow users to view and update their profile after onboarding.

```typescript
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/profile/profile-form'
import { ResumeSection } from '@/components/profile/resume-section'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await prisma.profile.findUnique({
    where: { user_id: user.id },
  })

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="font-heading text-3xl font-bold mb-8">Profile</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <ProfileForm profile={profile} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Resume</h2>
          <ResumeSection profile={profile} />
        </section>
      </div>
    </div>
  )
}
```

---

## 9. Components

### 9.1 Onboarding Stepper

Create `components/onboarding/stepper.tsx`:

```typescript
import { cn } from '@/lib/utils'

interface OnboardingStepperProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingStepper({ currentStep, totalSteps }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
                isCompleted && 'bg-secondary text-primary',
                isCurrent && 'bg-accent-teal text-white',
                !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
              )}
            >
              {stepNumber}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  'h-0.5 w-12',
                  stepNumber < currentStep ? 'bg-secondary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

### 9.2 Resume Editor Component

Create `components/profile/resume-editor.tsx` - A complex component with sections for:

- Personal info
- Education (array with add/remove)
- Experience (array with add/remove)
- Projects (array)
- Skills (categorized)
- Certifications (array)

_(Implementation would be quite long - similar structure to the form examples above but with dynamic arrays)_

---

## 10. Verification Checklist

- [ ] Onboarding flow redirects correctly through all 4 steps
- [ ] Profile data saves at each step
- [ ] Resume upload to S3 works
- [ ] Resume parsing returns valid JSON
- [ ] Resume review page displays parsed data
- [ ] Users can edit all resume sections
- [ ] Confirmation sets `parsed_resume_confirmed_at`
- [ ] Profile page loads existing data
- [ ] Back navigation works in onboarding
- [ ] Error states handled gracefully
- [ ] File size limit enforced (5MB)

---

## 11. Next Steps

Proceed to **Stage 3: Job Management** to implement job creation and application tracking.
