import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'
import { sanitizeEmDashes } from './utils'
import type {
  BulletEnhanceRequest,
  BulletEnhanceResponse,
  BulletSuggestRequest,
  BulletSuggestResponse,
} from '@/types/profile'

/**
 * Enhance a single bullet point using AI
 */
export async function enhanceBullet(
  userId: string,
  request: BulletEnhanceRequest
): Promise<BulletEnhanceResponse> {
  const { content: prompt, metadata } = await loadPrompt('bullets', 'enhance-v1')

  const input = {
    bulletText: request.bulletText,
    jobDescription: request.jobDescription,
    context: request.context,
  }

  const completion = await callOpenAI(
    userId,
    () =>
      openai.chat.completions.create({
        model: MODELS.GPT4O_MINI, // Cost-effective for this task
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: metadata.temperature,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 20000 } // 20 seconds
  )

  const result = parseOpenAIJson<{
    enhancedText: string
    suggestedTags: string[]
    suggestedCategory: string
    suggestedPriority: number
    metrics?: {
      type: 'percentage' | 'absolute'
      value: number
    }
  }>(completion.choices[0].message.content)

  return {
    originalText: request.bulletText,
    enhancedText: sanitizeEmDashes(result.enhancedText),
    suggestedTags: result.suggestedTags,
    suggestedCategory: result.suggestedCategory as any,
    suggestedPriority: result.suggestedPriority,
    metrics: result.metrics,
  }
}

/**
 * Generate bullet point suggestions from job/project description
 */
export async function suggestBullets(
  userId: string,
  request: BulletSuggestRequest
): Promise<BulletSuggestResponse> {
  const { content: prompt, metadata } = await loadPrompt('bullets', 'suggest-v1')

  const input = {
    jobDescription: request.jobDescription,
    experienceContext: request.experienceContext,
    projectContext: request.projectContext,
  }

  const completion = await callOpenAI(
    userId,
    () =>
      openai.chat.completions.create({
        model: MODELS.GPT4O_MINI,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: metadata.temperature,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 30000 } // 30 seconds
  )

  const result = parseOpenAIJson<BulletSuggestResponse>(completion.choices[0].message.content)

  return {
    suggestions: result.suggestions.map(s => ({
      ...s,
      text: sanitizeEmDashes(s.text),
    })),
  }
}

/**
 * Auto-tag multiple bullets in batch
 */
export async function autoTagBullets(
  userId: string,
  bullets: Array<{ id: string; text: string }>
): Promise<
  Array<{
    id: string
    tags: string[]
    category: string
    priority: number
  }>
> {
  // For batch operations, we'll process in parallel with rate limiting
  const BATCH_SIZE = 5

  const results: Array<{
    id: string
    tags: string[]
    category: string
    priority: number
  }> = []

  for (let i = 0; i < bullets.length; i += BATCH_SIZE) {
    const batch = bullets.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async bullet => {
        try {
          // Use enhance endpoint but only extract tags/category/priority
          const enhanced = await enhanceBullet(userId, {
            bulletText: bullet.text,
          })

          return {
            id: bullet.id,
            tags: enhanced.suggestedTags,
            category: enhanced.suggestedCategory,
            priority: enhanced.suggestedPriority,
          }
        } catch (error) {
          console.error(`Failed to auto-tag bullet ${bullet.id}:`, error)
          // Return defaults on error
          return {
            id: bullet.id,
            tags: [],
            category: 'other',
            priority: 0,
          }
        }
      })
    )

    results.push(...batchResults)
  }

  return results
}
