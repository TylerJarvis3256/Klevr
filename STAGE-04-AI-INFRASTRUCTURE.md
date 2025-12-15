# Stage 4: AI Infrastructure

**Stage:** 4 of 14
**Dependencies:** Stage 1 (Foundation & Setup)
**Estimated Effort:** Major infrastructure work

---

## Overview

This stage establishes the AI infrastructure foundation for all async AI operations. It sets up Inngest for background job orchestration, implements the AiTask lifecycle system, configures OpenAI integration, and builds SSE streaming for real-time status updates.

### Goals
- Set up Inngest for background job orchestration
- Implement AiTask model lifecycle (PENDING → RUNNING → SUCCEEDED/FAILED)
- Create OpenAI client with rate limiting and error handling
- Build SSE streaming endpoint for real-time task updates
- Implement retry logic and timeout handling
- Create base prompt template system

---

## 1. Inngest Setup

### 1.1 Create Inngest Client

**File:** `lib/inngest.ts`

```typescript
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'klevr',
  name: 'Klevr Career Assistant',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
```

### 1.2 Create Inngest API Route

**File:** `app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { resumeParseFunction } from '@/inngest/functions/resume-parse'
import { jobScoringFunction } from '@/inngest/functions/job-scoring'
import { resumeGenerationFunction } from '@/inngest/functions/resume-generation'
import { coverLetterGenerationFunction } from '@/inngest/functions/cover-letter-generation'
import { companyResearchFunction } from '@/inngest/functions/company-research'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    resumeParseFunction,
    jobScoringFunction,
    resumeGenerationFunction,
    coverLetterGenerationFunction,
    companyResearchFunction,
  ],
})
```

### 1.3 Base Function Template

**File:** `inngest/functions/_template.ts`

```typescript
import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { AiTaskStatus } from '@prisma/client'

export const templateFunction = inngest.createFunction(
  {
    id: 'function-name',
    name: 'Human Readable Name',
    retries: 2,
    timeouts: {
      execution: '30s',
    },
  },
  { event: 'event/name' },
  async ({ event, step }) => {
    const { userId, taskId } = event.data

    // Step 1: Update task to RUNNING
    await step.run('mark-running', async () => {
      await prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: AiTaskStatus.RUNNING,
          started_at: new Date(),
        },
      })
    })

    try {
      // Step 2: Do work
      const result = await step.run('do-work', async () => {
        // Your work here
        return { success: true }
      })

      // Step 3: Mark success
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: result.id,
          },
        })
      })

      return { success: true }
    } catch (error) {
      // Step 4: Mark failure
      await step.run('mark-failure', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      })

      throw error
    }
  }
)
```

---

## 2. OpenAI Client Enhancement

### 2.1 Enhanced OpenAI Utilities

**File:** `lib/openai.ts`

```typescript
import OpenAI from 'openai'
import { RateLimiter } from 'limiter'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 2,
  timeout: 30000, // 30 seconds
})

export const MODELS = {
  GPT4O: 'gpt-4o-2024-05-13',
  GPT4O_MINI: 'gpt-4o-mini-2024-07-18',
} as const

// Rate limiter: 60 requests per minute per user
const userLimiters = new Map<string, RateLimiter>()

export function getUserRateLimiter(userId: string): RateLimiter {
  if (!userLimiters.has(userId)) {
    userLimiters.set(userId, new RateLimiter({ tokensPerInterval: 60, interval: 'minute' }))
  }
  return userLimiters.get(userId)!
}

/**
 * Call OpenAI with rate limiting and error handling
 */
export async function callOpenAI<T>(
  userId: string,
  fn: () => Promise<T>,
  options: {
    timeout?: number
    onRateLimit?: () => void
  } = {}
): Promise<T> {
  const limiter = getUserRateLimiter(userId)

  // Wait for rate limit
  const allowed = await limiter.removeTokens(1)
  if (!allowed) {
    options.onRateLimit?.()
    throw new Error('Rate limit exceeded')
  }

  // Execute with timeout
  const timeout = options.timeout || 30000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI call timed out')), timeout)
  })

  try {
    return await Promise.race([fn(), timeoutPromise])
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded')
      }
      throw new Error(`OpenAI API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Count tokens (approximate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Validate JSON response from OpenAI
 */
export function parseOpenAIJson<T>(content: string | null): T {
  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  try {
    return JSON.parse(content) as T
  } catch (error) {
    console.error('Failed to parse OpenAI JSON:', content)
    throw new Error('Invalid JSON from OpenAI')
  }
}
```

---

## 3. Prompt Version Management

### 3.1 Prompt Registry

**File:** `lib/prompts.ts`

```typescript
import fs from 'fs/promises'
import path from 'path'

export interface PromptMetadata {
  version: string
  description: string
  model: string
  maxTokens?: number
}

/**
 * Load a prompt template with version
 */
export async function loadPrompt(
  category: string,
  name: string
): Promise<{ content: string; metadata: PromptMetadata }> {
  const promptPath = path.join(process.cwd(), 'prompts', category, `${name}.md`)
  const content = await fs.readFile(promptPath, 'utf-8')

  // Extract metadata from front matter (if exists)
  const metadataMatch = content.match(/^---\n([\s\S]+?)\n---/)
  let metadata: PromptMetadata = {
    version: '1.0.0',
    description: '',
    model: 'gpt-4o-2024-05-13',
  }

  if (metadataMatch) {
    const frontMatter = metadataMatch[1]
    frontMatter.split('\n').forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim())
      if (key === 'version') metadata.version = value
      if (key === 'description') metadata.description = value
      if (key === 'model') metadata.model = value
      if (key === 'maxTokens') metadata.maxTokens = parseInt(value)
    })
  }

  return { content, metadata }
}

/**
 * Get prompt version string for storage
 */
export function getPromptVersion(category: string, name: string): string {
  return `${category}-${name}-v1.0.0`
}
```

### 3.2 Prompt Template Structure

Create `prompts/_template.md`:

```markdown
---
version: 1.0.0
description: Template prompt
model: gpt-4o-2024-05-13
maxTokens: 2000
---

# Prompt Title

[System instructions here]

## Input
[Describe input format]

## Output Format
[Describe expected output]

## Instructions
1. Step one
2. Step two
3. Step three
```

---

## 4. SSE Streaming for Task Updates

### 4.1 SSE Endpoint

**File:** `app/api/ai-tasks/stream/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return new Response('Missing taskId', { status: 400 })
  }

  // Verify task belongs to user
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      user_id: user.id,
    },
  })

  if (!task) {
    return new Response('Task not found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial state
      sendEvent({
        status: task.status,
        result_ref: task.result_ref,
        error_message: task.error_message,
      })

      // Poll for updates
      const interval = setInterval(async () => {
        try {
          const updatedTask = await prisma.aiTask.findUnique({
            where: { id: taskId },
          })

          if (!updatedTask) {
            clearInterval(interval)
            controller.close()
            return
          }

          sendEvent({
            status: updatedTask.status,
            result_ref: updatedTask.result_ref,
            error_message: updatedTask.error_message,
          })

          // Close stream when task is complete
          if (updatedTask.status === 'SUCCEEDED' || updatedTask.status === 'FAILED') {
            clearInterval(interval)
            controller.close()
          }
        } catch (error) {
          console.error('SSE error:', error)
          clearInterval(interval)
          controller.close()
        }
      }, 2000) // Poll every 2 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### 4.2 SSE Client Hook

**File:** `lib/hooks/use-sse-task.ts`

```typescript
import { useEffect, useState } from 'react'
import { AiTaskStatus } from '@prisma/client'

interface TaskUpdate {
  status: AiTaskStatus
  result_ref?: string | null
  error_message?: string | null
}

export function useSSETask(taskId: string | null, onComplete?: (result: string) => void) {
  const [status, setStatus] = useState<AiTaskStatus>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return

    const eventSource = new EventSource(`/api/ai-tasks/stream?taskId=${taskId}`)

    eventSource.onmessage = event => {
      const data: TaskUpdate = JSON.parse(event.data)
      setStatus(data.status)
      setError(data.error_message || null)
      setResult(data.result_ref || null)

      if (data.status === 'SUCCEEDED' && data.result_ref) {
        onComplete?.(data.result_ref)
        eventSource.close()
      } else if (data.status === 'FAILED') {
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [taskId, onComplete])

  return { status, error, result, isLoading: status === 'PENDING' || status === 'RUNNING' }
}
```

---

## 5. Usage Tracking

### 5.1 Usage Utilities

**File:** `lib/usage.ts`

```typescript
import { prisma } from './prisma'
import { getCurrentMonth } from './utils'
import { AiTaskType } from '@prisma/client'

export const USAGE_LIMITS = {
  JOB_SCORING: 200,
  RESUME_GENERATION: 30,
  COVER_LETTER_GENERATION: 30,
  COMPANY_RESEARCH: 100, // No hard limit mentioned, but track it
} as const

/**
 * Get current month's usage for a user
 */
export async function getUserUsage(userId: string) {
  const month = getCurrentMonth()

  const usage = await prisma.usageTracking.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
  })

  return (
    usage || {
      fit_count: 0,
      resume_count: 0,
      cover_letter_count: 0,
    }
  )
}

/**
 * Increment usage counter
 */
export async function incrementUsage(userId: string, type: AiTaskType) {
  const month = getCurrentMonth()

  const fieldMap = {
    JOB_SCORING: 'fit_count',
    RESUME_GENERATION: 'resume_count',
    COVER_LETTER_GENERATION: 'cover_letter_count',
    COMPANY_RESEARCH: 'fit_count', // Track with fit for now
  }

  const field = fieldMap[type]
  if (!field) return

  await prisma.usageTracking.upsert({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
    create: {
      user_id: userId,
      month,
      [field]: 1,
    },
    update: {
      [field]: { increment: 1 },
    },
  })
}

/**
 * Check if user has exceeded limit
 */
export async function checkUsageLimit(userId: string, type: AiTaskType): Promise<boolean> {
  const usage = await getUserUsage(userId)

  const limits = {
    JOB_SCORING: { current: usage.fit_count, max: USAGE_LIMITS.JOB_SCORING },
    RESUME_GENERATION: { current: usage.resume_count, max: USAGE_LIMITS.RESUME_GENERATION },
    COVER_LETTER_GENERATION: {
      current: usage.cover_letter_count,
      max: USAGE_LIMITS.COVER_LETTER_GENERATION,
    },
    COMPANY_RESEARCH: { current: usage.fit_count, max: USAGE_LIMITS.COMPANY_RESEARCH },
  }

  const limit = limits[type]
  return limit.current < limit.max
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(current: number, max: number): number {
  return Math.round((current / max) * 100)
}
```

---

## 6. Task Creation Helpers

### 6.1 Task Factory

**File:** `lib/ai-tasks.ts`

```typescript
import { prisma } from './prisma'
import { AiTaskType } from '@prisma/client'
import { inngest } from './inngest'

interface CreateTaskOptions {
  userId: string
  type: AiTaskType
  applicationId?: string
  data: Record<string, any>
}

/**
 * Create an AI task and trigger Inngest event
 */
export async function createAiTask({
  userId,
  type,
  applicationId,
  data,
}: CreateTaskOptions): Promise<string> {
  // Create task record
  const task = await prisma.aiTask.create({
    data: {
      user_id: userId,
      type,
      application_id: applicationId,
      status: 'PENDING',
    },
  })

  // Map task type to event name
  const eventMap = {
    JOB_SCORING: 'job/assess-fit',
    RESUME_GENERATION: 'resume/generate',
    COVER_LETTER_GENERATION: 'cover-letter/generate',
    COMPANY_RESEARCH: 'company/research',
  }

  const eventName = eventMap[type]
  if (!eventName) {
    throw new Error(`Unknown task type: ${type}`)
  }

  // Trigger Inngest event
  await inngest.send({
    name: eventName,
    data: {
      taskId: task.id,
      userId,
      applicationId,
      ...data,
    },
  })

  return task.id
}
```

---

## 7. Error Handling

### 7.1 Error Types

**File:** `lib/errors.ts`

```typescript
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export class RateLimitError extends AIError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', true)
  }
}

export class TimeoutError extends AIError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT', true)
  }
}

export class ValidationError extends AIError {
  constructor(message = 'Validation failed') {
    super(message, 'VALIDATION', false)
  }
}

export class UsageLimitError extends AIError {
  constructor(message = 'Usage limit exceeded') {
    super(message, 'USAGE_LIMIT', false)
  }
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(error: Error): boolean {
  if (error instanceof AIError) {
    return error.retryable
  }

  // Retry on network errors
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return true
  }

  return false
}
```

---

## 8. Testing Infrastructure

### 8.1 Mock OpenAI Responses

**File:** `lib/test-utils/mock-openai.ts`

```typescript
import { vi } from 'vitest'

export function mockOpenAIResponse(content: any) {
  return {
    choices: [
      {
        message: {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          role: 'assistant',
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }
}

export function createMockOpenAI() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(mockOpenAIResponse({ success: true })),
      },
    },
  }
}
```

---

## 9. Verification Checklist

- [ ] Inngest client configured and route created
- [ ] AiTask lifecycle works (PENDING → RUNNING → SUCCEEDED/FAILED)
- [ ] SSE streaming endpoint returns real-time updates
- [ ] OpenAI client has rate limiting
- [ ] Retry logic implemented for transient failures
- [ ] Timeout handling works (30s default)
- [ ] Usage tracking increments correctly
- [ ] Usage limits enforced before task creation
- [ ] Prompt versioning system in place
- [ ] Error types defined and handled
- [ ] Task creation helper works

---

## 10. Next Steps

Proceed to **Stage 5: Fit Assessment** to implement the job scoring algorithm and fit bucketing.
