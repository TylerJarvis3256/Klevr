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
export function getPromptVersion(category: string, name: string, version = '1.0.0'): string {
  return `${category}-${name}-v${version}`
}
