import { generateResumeMarkdown, type MarkdownUserInfo } from './markdown/resume-to-markdown'
import { detectBulletMetrics } from './bullet-scorer'
import { isSkillsV2 } from './resume-types'
import type { GeneratedResumeContent, SkillsV1, SkillsV2 } from './resume-types'
import type { SemanticJDAnalysis } from './semantic-analyzer'

// ─── Types ───────────────────────────────────────────

export type GovernableContent = GeneratedResumeContent & {
  lead?: string
  section_order?: string[]
}

export interface GovernorResult {
  content: GovernableContent
  markdown: string
  actions: GovernorAction[]
  linesBefore: number
  linesAfter: number
  metricsInFinalContent: number
  densityRatio: number
}

export interface GovernorAction {
  step: 'A' | 'B' | 'C' | 'D' | 'TIGHTEN' | 'CONDENSE' | 'COMPACT' | 'FINAL' | 'REEXPAND'
  action: string
  linesSaved: number
}

export interface GovernorOptions {
  maxLines?: number
  sectionOrder: string[]
  professionalTitle?: string
  semanticAnalysis: SemanticJDAnalysis
}

// ─── Line Counter ────────────────────────────────────

const MAX_LINES = 64
const CHARS_PER_LINE = 105

export function countRenderedLines(markdown: string, charsPerLine = CHARS_PER_LINE): number {
  const lines = markdown.split('\n')
  let total = 0
  for (const line of lines) {
    if (line.length === 0) {
      total += 1
    } else {
      total += Math.ceil(line.length / charsPerLine)
    }
  }
  return total
}

// ─── Step A: Semantic Redundancy Consolidation ───────

export function consolidateRedundantProjects(
  content: GovernableContent,
  analysis: SemanticJDAnalysis
): GovernorAction[] {
  const actions: GovernorAction[] = []
  if (!content.projects || content.projects.length === 0 || !content.experience) return actions

  const projectsToRemove: number[] = []

  for (let pi = 0; pi < content.projects.length; pi++) {
    const project = content.projects[pi]
    const projName = project.name.toLowerCase()
    const projTech = project.technologies || []
    const projBullets = (project as any).bullets as string[] | undefined

    // Find matching experiences
    const matches: Array<{ expIdx: number; score: number }> = []

    for (let ei = 0; ei < content.experience.length; ei++) {
      const exp = content.experience[ei]
      const expCompany = exp.company.toLowerCase()

      // Org match: project name contains company name or vice versa
      const orgMatch = projName.includes(expCompany) || expCompany.includes(projName)
      if (!orgMatch) continue

      // Tech overlap: >50% of project technologies appear in experience bullets
      if (projTech.length === 0) continue
      const expBulletText = exp.bullets.join(' ').toLowerCase()
      const overlapCount = projTech.filter(t => expBulletText.includes(t.toLowerCase())).length
      const overlapRatio = overlapCount / projTech.length
      if (overlapRatio <= 0.5) continue

      // Both match — find score for this experience
      const expScore = analysis.experience_scores.find(s => s.index === ei)?.score ?? 50
      matches.push({ expIdx: ei, score: expScore })
    }

    if (matches.length === 0) continue

    // Pick the experience with the highest score
    matches.sort((a, b) => b.score - a.score)
    const bestMatch = matches[0]
    const targetExp = content.experience[bestMatch.expIdx]

    // Append project bullets to experience
    if (projBullets && projBullets.length > 0) {
      targetExp.bullets.push(...projBullets)
    }

    projectsToRemove.push(pi)
    actions.push({
      step: 'A',
      action: `Consolidated project "${project.name}" into experience "${targetExp.title}" at "${targetExp.company}"`,
      linesSaved: 3 + (projBullets?.length || 0), // header + description + tech line + bullets
    })
  }

  // Remove projects in reverse order to preserve indices
  for (const idx of projectsToRemove.reverse()) {
    content.projects.splice(idx, 1)
  }

  return actions
}

// ─── Step B: Soft-Skill Compression ──────────────────

export function compressSoftSkills(content: GovernableContent): GovernorAction[] {
  const actions: GovernorAction[] = []
  if (!content.skills) return actions

  if (isSkillsV2(content.skills)) {
    const v2 = content.skills as SkillsV2
    if (v2.other.length === 0) return actions
    v2.tools = [...v2.tools, ...v2.other]
    const removed = v2.other.length
    v2.other = []
    actions.push({
      step: 'B',
      action: `Merged ${removed} soft-skill items into Tools & Cloud`,
      linesSaved: 1,
    })
  } else {
    const v1 = content.skills as SkillsV1
    if (v1.other.length === 0) return actions
    v1.technical = [...v1.technical, ...v1.other]
    const removed = v1.other.length
    v1.other = []
    actions.push({
      step: 'B',
      action: `Merged ${removed} soft-skill items into Technical`,
      linesSaved: 1,
    })
  }

  return actions
}

// ─── Syntactic Tightening ────────────────────────────

const LEAD_IN_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^Responsible for the development of\b/i, replacement: 'Developed' },
  { pattern: /^Responsible for managing\b/i, replacement: 'Managed' },
  { pattern: /^Responsible for\b/i, replacement: 'Led' },
  { pattern: /^Played a (?:key|critical|major) role in\s*/i, replacement: '' },
  { pattern: /^Was (?:tasked with|involved in)\s*/i, replacement: '' },
  { pattern: /^Successfully\s+/i, replacement: '' },
  { pattern: /^Helped to\s+/i, replacement: 'Co-' },
  { pattern: /^Assisted (?:in|with)\s+/i, replacement: 'Co-' },
]

const MID_SENTENCE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: / in order to /g, replacement: ' to ' },
  { pattern: / as well as /g, replacement: ' and ' },
  { pattern: / a wide (?:range|variety) of /g, replacement: ' various ' },
  { pattern: / on a daily basis/g, replacement: ' daily' },
  { pattern: / on a weekly basis/g, replacement: ' weekly' },
  { pattern: / on a monthly basis/g, replacement: ' monthly' },
  { pattern: / utilized /g, replacement: ' used ' },
  { pattern: / a total of /g, replacement: ' ' },
  { pattern: / in collaboration with /g, replacement: ' with ' },
]

export function tightenBulletText(text: string): string {
  let result = text

  // Apply first matching lead-in pattern
  for (const { pattern, replacement } of LEAD_IN_PATTERNS) {
    const match = result.match(pattern)
    if (match) {
      result = result.replace(pattern, replacement)
      // Capitalize next word if replacement is empty (pattern stripped the lead-in)
      if (replacement === '' && result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1)
      }
      break
    }
  }

  // Apply all mid-sentence patterns
  for (const { pattern, replacement } of MID_SENTENCE_PATTERNS) {
    result = result.replace(pattern, replacement)
  }

  // Clean up double spaces
  result = result.replace(/ {2,}/g, ' ').trim()

  return result
}

export function tightenAllBullets(content: GovernableContent): GovernorAction[] {
  let charsSaved = 0

  if (content.experience) {
    for (const exp of content.experience) {
      for (let i = 0; i < exp.bullets.length; i++) {
        const original = exp.bullets[i]
        const tightened = tightenBulletText(original)
        if (tightened !== original) {
          charsSaved += original.length - tightened.length
          exp.bullets[i] = tightened
        }
      }
    }
  }

  if (content.projects) {
    for (const proj of content.projects) {
      const projBullets = (proj as any).bullets as string[] | undefined
      if (!projBullets) continue
      for (let i = 0; i < projBullets.length; i++) {
        const original = projBullets[i]
        const tightened = tightenBulletText(original)
        if (tightened !== original) {
          charsSaved += original.length - tightened.length
          projBullets[i] = tightened
        }
      }
    }
  }

  if (charsSaved === 0) return []

  return [
    {
      step: 'TIGHTEN',
      action: `Tightened bullet text, saved ${charsSaved} characters`,
      linesSaved: Math.floor(charsSaved / CHARS_PER_LINE),
    },
  ]
}

// ─── Low-Priority Condensation ──────────────────────

const METRIC_TYPE_RANK: Record<string, number> = {
  currency: 5,
  percentage: 4,
  multiplier: 3,
  count: 2,
  time: 1,
}

// ─── Broad Metric Detection ─────────────────────────

const BROAD_COUNT_NOUNS =
  /\b\d[\d,]*\+?\s*(?:staff|engineers|members|clients|customers|teams|people|applications|projects|services|departments|stakeholders|contributors|participants|students|reports|meetings|sprints|releases|deployments|tickets|reviews|interviews)\b/i

const STANDALONE_NUMBER_PLUS = /\b\d[\d,]*\+/

export function hasAnyMetric(text: string): boolean {
  if (detectBulletMetrics(text).hasMetric) return true
  if (BROAD_COUNT_NOUNS.test(text)) return true
  if (STANDALONE_NUMBER_PLUS.test(text)) return true
  return false
}

// ─── Top Bullet Selection ───────────────────────────

export function pickTopBullets(bullets: string[], count: number): string[] {
  if (bullets.length <= count) return [...bullets]

  const scored = bullets.map((text, idx) => {
    const precise = detectBulletMetrics(text)
    let rank = 0
    if (precise.hasMetric && precise.metricType) {
      rank = METRIC_TYPE_RANK[precise.metricType] ?? 1
    } else if (hasAnyMetric(text)) {
      rank = 0.5
    }
    return { text, idx, rank }
  })

  scored.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank
    return a.idx - b.idx // stable by original index
  })

  return scored
    .slice(0, count)
    .sort((a, b) => a.idx - b.idx) // restore original order
    .map(s => s.text)
}

export function pickCondensedLine(bullets: string[]): string {
  if (bullets.length === 0) return ''
  return pickTopBullets(bullets, 1)[0]
}

export function condenseLowPriorityEntry(
  content: GovernableContent,
  analysis: SemanticJDAnalysis,
  minBullets = 1
): GovernorAction[] {
  type ScoredEntry = {
    type: 'experience' | 'project'
    index: number
    name: string
    score: number
    bulletCount: number
    bullets: string[]
  }

  const entries: ScoredEntry[] = []

  if (content.experience) {
    for (let i = 0; i < content.experience.length; i++) {
      const exp = content.experience[i]
      const nameKey = `${exp.title} at ${exp.company}`.toLowerCase()
      const score =
        analysis.experience_scores.find(
          s =>
            `${content.experience![s.index]?.title} at ${content.experience![s.index]?.company}`.toLowerCase() ===
            nameKey
        )?.score ??
        analysis.experience_scores.find(s => s.index === i)?.score ??
        50
      entries.push({
        type: 'experience',
        index: i,
        name: `${exp.title} at ${exp.company}`,
        score,
        bulletCount: exp.bullets.length,
        bullets: exp.bullets,
      })
    }
  }

  if (content.projects) {
    for (let i = 0; i < content.projects.length; i++) {
      const proj = content.projects[i]
      const projBullets = (proj as any).bullets as string[] | undefined
      const score =
        analysis.project_scores.find(
          s => content.projects![s.index]?.name.toLowerCase() === proj.name.toLowerCase()
        )?.score ??
        analysis.project_scores.find(s => s.index === i)?.score ??
        50
      entries.push({
        type: 'project',
        index: i,
        name: proj.name,
        score,
        bulletCount: projBullets?.length ?? 0,
        bullets: projBullets ?? [],
      })
    }
  }

  // +100 score boost for entries with metric bullets (condensed last)
  for (const entry of entries) {
    if (entry.bullets.some(b => hasAnyMetric(b))) {
      entry.score += 100
    }
  }

  // Skip entries already at or below minBullets
  const condensable = entries.filter(e => e.bulletCount > minBullets)
  if (condensable.length === 0) return []

  // Sort ascending by score; prefer condensing projects on tie
  condensable.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.type === 'project' && b.type === 'experience') return -1
    if (a.type === 'experience' && b.type === 'project') return 1
    return 0
  })

  const target = condensable[0]

  if (target.type === 'experience' && content.experience) {
    const exp = content.experience[target.index]
    const kept = pickTopBullets(exp.bullets, minBullets)
    const removed = exp.bullets.length - minBullets
    exp.bullets = kept
    return [
      {
        step: 'CONDENSE',
        action: `Condensed "${target.name}" from ${removed + minBullets} bullets to ${minBullets} (score: ${target.score})`,
        linesSaved: removed,
      },
    ]
  }

  if (target.type === 'project' && content.projects) {
    const proj = content.projects[target.index]
    const projBullets = (proj as any).bullets as string[]
    const kept = pickTopBullets(projBullets, minBullets)
    const removed = projBullets.length - minBullets
    ;(proj as any).bullets = kept
    return [
      {
        step: 'CONDENSE',
        action: `Condensed project "${target.name}" from ${removed + minBullets} bullets to ${minBullets} (score: ${target.score})`,
        linesSaved: removed,
      },
    ]
  }

  return []
}

// ─── Step C: Bottom-Up Pruning ───────────────────────

export function pruneLowestScoredEntry(
  content: GovernableContent,
  analysis: SemanticJDAnalysis
): GovernorAction[] {
  const actions: GovernorAction[] = []

  // Build scored list of all entries
  type ScoredEntry = {
    type: 'experience' | 'project'
    index: number
    name: string
    score: number
    hasBullets: boolean
  }

  const entries: ScoredEntry[] = []

  if (content.experience) {
    for (let i = 0; i < content.experience.length; i++) {
      const exp = content.experience[i]
      const nameKey = `${exp.title} at ${exp.company}`.toLowerCase()
      const score =
        analysis.experience_scores.find(
          s =>
            `${content.experience![s.index]?.title} at ${content.experience![s.index]?.company}`.toLowerCase() ===
            nameKey
        )?.score ??
        analysis.experience_scores.find(s => s.index === i)?.score ??
        50
      entries.push({
        type: 'experience',
        index: i,
        name: `${exp.title} at ${exp.company}`,
        score,
        hasBullets: exp.bullets.length > 0,
      })
    }
  }

  if (content.projects) {
    for (let i = 0; i < content.projects.length; i++) {
      const proj = content.projects[i]
      const projBullets = (proj as any).bullets as string[] | undefined
      const score =
        analysis.project_scores.find(
          s => content.projects![s.index]?.name.toLowerCase() === proj.name.toLowerCase()
        )?.score ??
        analysis.project_scores.find(s => s.index === i)?.score ??
        50
      entries.push({
        type: 'project',
        index: i,
        name: proj.name,
        score,
        hasBullets: (projBullets?.length || 0) > 0,
      })
    }
  }

  // +100 score boost for entries with metric bullets (pruned last)
  for (const entry of entries) {
    const bullets =
      entry.type === 'experience'
        ? (content.experience?.[entry.index]?.bullets ?? [])
        : (((content.projects?.[entry.index] as any)?.bullets as string[] | undefined) ?? [])
    if (bullets.some(b => hasAnyMetric(b))) {
      entry.score += 100
    }
  }

  // Sort ascending by score; tiebreaker: prefer removing projects over experiences
  entries.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    // Projects should be removed first (sort projects before experiences at same score)
    if (a.type === 'project' && b.type === 'experience') return -1
    if (a.type === 'experience' && b.type === 'project') return 1
    return 0
  })

  for (const entry of entries) {
    // Guard: Never remove the last experience
    if (entry.type === 'experience') {
      const expCount = content.experience?.length || 0
      if (expCount <= 1) continue
    }

    if (entry.type === 'experience' && content.experience) {
      const exp = content.experience[entry.index]
      if (entry.hasBullets) {
        // Pass 1: Remove bullets, keep header
        const bulletCount = exp.bullets.length
        exp.bullets = []
        actions.push({
          step: 'C',
          action: `Removed ${bulletCount} bullets from "${entry.name}" (score: ${entry.score})`,
          linesSaved: bulletCount,
        })
      } else {
        // Pass 2: Remove entire entry
        content.experience.splice(entry.index, 1)
        actions.push({
          step: 'C',
          action: `Removed experience entry "${entry.name}" (score: ${entry.score})`,
          linesSaved: 3, // header lines + blank
        })
      }
      return actions
    }

    if (entry.type === 'project' && content.projects) {
      const proj = content.projects[entry.index]
      const projBullets = (proj as any).bullets as string[] | undefined
      if (entry.hasBullets && projBullets) {
        // Pass 1: Remove bullets
        const bulletCount = projBullets.length
        ;(proj as any).bullets = []
        actions.push({
          step: 'C',
          action: `Removed ${bulletCount} bullets from project "${entry.name}" (score: ${entry.score})`,
          linesSaved: bulletCount,
        })
      } else {
        // Pass 2: Remove entire project entry
        content.projects.splice(entry.index, 1)
        actions.push({
          step: 'C',
          action: `Removed project "${entry.name}" (score: ${entry.score})`,
          linesSaved: 3 + ((projBullets?.length || 0) > 0 ? 0 : 1),
        })
      }
      return actions
    }
  }

  return actions
}

// ─── Step D: Bullet Density Reduction ────────────────

export function reduceBulletDensity(content: GovernableContent, maxBullets = 4): GovernorAction[] {
  const actions: GovernorAction[] = []

  if (content.experience) {
    for (const exp of content.experience) {
      if (exp.bullets.length <= maxBullets) continue

      // Score bullets: metric bullets get priority
      const scored = exp.bullets.map((text, idx) => ({
        text,
        idx,
        hasMetric: detectBulletMetrics(text).hasMetric,
      }))

      // Partition: metric bullets first, then non-metric in original order
      const metricBullets = scored.filter(b => b.hasMetric)
      const nonMetricBullets = scored.filter(b => !b.hasMetric)
      const prioritized = [...metricBullets, ...nonMetricBullets]

      const kept = prioritized.slice(0, maxBullets).sort((a, b) => a.idx - b.idx)
      const removed = exp.bullets.length - maxBullets
      exp.bullets = kept.map(b => b.text)

      actions.push({
        step: 'D',
        action: `Reduced "${exp.title}" bullets from ${exp.bullets.length + removed} to ${maxBullets}`,
        linesSaved: removed,
      })
    }
  }

  if (content.projects) {
    for (const proj of content.projects) {
      const projBullets = (proj as any).bullets as string[] | undefined
      if (!projBullets || projBullets.length <= maxBullets) continue

      const scored = projBullets.map((text: string, idx: number) => ({
        text,
        idx,
        hasMetric: detectBulletMetrics(text).hasMetric,
      }))

      const metricBullets = scored.filter((b: { hasMetric: boolean }) => b.hasMetric)
      const nonMetricBullets = scored.filter((b: { hasMetric: boolean }) => !b.hasMetric)
      const prioritized = [...metricBullets, ...nonMetricBullets]

      const kept = prioritized
        .slice(0, maxBullets)
        .sort((a: { idx: number }, b: { idx: number }) => a.idx - b.idx)
      const removed = projBullets.length - maxBullets
      ;(proj as any).bullets = kept.map((b: { text: string }) => b.text)

      actions.push({
        step: 'D',
        action: `Reduced project "${proj.name}" bullets from ${projBullets.length} to ${maxBullets}`,
        linesSaved: removed,
      })
    }
  }

  return actions
}

// ─── Compact Markdown ────────────────────────────────

export function compactifyMarkdown(markdown: string): string {
  // Collapse 3+ consecutive newlines to 2
  let result = markdown.replace(/\n{3,}/g, '\n\n')

  // Remove trailing blank line before each section header (keep single blank)
  result = result.replace(/\n\n\n*(## )/g, '\n\n$1')

  return result
}

// ─── Final Verification ──────────────────────────────

export function applyFinalVerification(
  content: GovernableContent,
  analysis: SemanticJDAnalysis
): GovernorAction[] {
  const actions: GovernorAction[] = []

  const expTotal = analysis.experience_section_total
  const projTotal = analysis.project_section_total

  // The lower-scoring section gets reduced to its single highest-scored entry
  if (expTotal < projTotal && content.experience && content.experience.length > 1) {
    // Keep only the highest-scored experience
    let bestIdx = 0
    let bestScore = 0
    for (let i = 0; i < content.experience.length; i++) {
      const score = analysis.experience_scores.find(s => s.index === i)?.score ?? 50
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    const removed = content.experience.length - 1
    const kept = content.experience[bestIdx]
    content.experience = [kept]
    actions.push({
      step: 'FINAL',
      action: `Reduced experience section to highest-scored entry "${kept.title}" (removed ${removed} entries)`,
      linesSaved: removed * 5,
    })
  } else if (projTotal <= expTotal && content.projects && content.projects.length > 1) {
    // Keep only the highest-scored project
    let bestIdx = 0
    let bestScore = 0
    for (let i = 0; i < content.projects.length; i++) {
      const score = analysis.project_scores.find(s => s.index === i)?.score ?? 50
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    const removed = content.projects.length - 1
    const kept = content.projects[bestIdx]
    content.projects = [kept]
    actions.push({
      step: 'FINAL',
      action: `Reduced projects section to highest-scored entry "${kept.name}" (removed ${removed} entries)`,
      linesSaved: removed * 4,
    })
  }

  return actions
}

// ─── Deep Clone Helper ───────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ─── Build Result Helper ─────────────────────────────

function buildResult(
  content: GovernableContent,
  markdown: string,
  actions: GovernorAction[],
  linesBefore: number,
  maxLines: number
): GovernorResult {
  const linesAfter = countRenderedLines(markdown)

  // Count metric bullets in final content
  let metricsInFinalContent = 0
  if (content.experience) {
    for (const exp of content.experience) {
      for (const b of exp.bullets) {
        if (hasAnyMetric(b)) metricsInFinalContent++
      }
    }
  }
  if (content.projects) {
    for (const proj of content.projects) {
      const projBullets = (proj as any).bullets as string[] | undefined
      if (projBullets) {
        for (const b of projBullets) {
          if (hasAnyMetric(b)) metricsInFinalContent++
        }
      }
    }
  }

  return {
    content,
    markdown,
    actions,
    linesBefore,
    linesAfter,
    metricsInFinalContent,
    densityRatio: maxLines > 0 ? linesAfter / maxLines : 0,
  }
}

// ─── Main Orchestrator ───────────────────────────────

export function governOnePage(
  content: GovernableContent,
  userInfo: MarkdownUserInfo,
  options: GovernorOptions
): GovernorResult {
  const maxLines = options.maxLines ?? MAX_LINES
  const allActions: GovernorAction[] = []

  // Deep-clone content to avoid mutating the original
  const governed = deepClone(content)
  const original = deepClone(content)

  const mkOpts = {
    sectionOrder: options.sectionOrder,
    professionalTitle: options.professionalTitle,
  }

  // Helper: regenerate markdown and check fit
  const regenerate = () => generateResumeMarkdown(governed, userInfo, mkOpts)
  const fits = (md: string) => countRenderedLines(md) <= maxLines

  // Initial markdown generation + line count
  let markdown = regenerate()
  const linesBefore = countRenderedLines(markdown)

  if (linesBefore <= maxLines) {
    return buildResult(governed, markdown, [], linesBefore, maxLines)
  }

  // Step A: Consolidate redundant projects
  const stepA = consolidateRedundantProjects(governed, options.semanticAnalysis)
  allActions.push(...stepA)
  if (stepA.length > 0) {
    markdown = regenerate()
    if (fits(markdown)) {
      return attemptReExpansion(
        governed,
        original,
        markdown,
        allActions,
        linesBefore,
        maxLines,
        userInfo,
        mkOpts,
        options.semanticAnalysis
      )
    }
  }

  // Step B: Soft-skill compression
  const stepB = compressSoftSkills(governed)
  allActions.push(...stepB)
  if (stepB.length > 0) {
    markdown = regenerate()
    if (fits(markdown)) {
      return attemptReExpansion(
        governed,
        original,
        markdown,
        allActions,
        linesBefore,
        maxLines,
        userInfo,
        mkOpts,
        options.semanticAnalysis
      )
    }
  }

  // TIGHTEN: Syntactic tightening of bullet text
  const stepTighten = tightenAllBullets(governed)
  allActions.push(...stepTighten)
  if (stepTighten.length > 0) {
    markdown = regenerate()
    if (fits(markdown)) {
      return attemptReExpansion(
        governed,
        original,
        markdown,
        allActions,
        linesBefore,
        maxLines,
        userInfo,
        mkOpts,
        options.semanticAnalysis
      )
    }
  }

  // Step D: Bullet density reduction (5→4 only — no blanket 4→3)
  const stepD4 = reduceBulletDensity(governed, 4)
  allActions.push(...stepD4)
  if (stepD4.length > 0) {
    markdown = regenerate()
    if (fits(markdown)) {
      return attemptReExpansion(
        governed,
        original,
        markdown,
        allActions,
        linesBefore,
        maxLines,
        userInfo,
        mkOpts,
        options.semanticAnalysis
      )
    }
  }

  // CONDENSE(min=2): Targeted condensation to 2 bullets per entry
  for (let i = 0; i < 20; i++) {
    const stepCondense = condenseLowPriorityEntry(governed, options.semanticAnalysis, 2)
    if (stepCondense.length === 0) break
    allActions.push(...stepCondense)
    markdown = regenerate()
    if (fits(markdown)) break
  }
  if (fits(markdown)) {
    return attemptReExpansion(
      governed,
      original,
      markdown,
      allActions,
      linesBefore,
      maxLines,
      userInfo,
      mkOpts,
      options.semanticAnalysis
    )
  }

  // CONDENSE(min=1): Emergency condensation to 1 bullet per entry
  for (let i = 0; i < 20; i++) {
    const stepCondense = condenseLowPriorityEntry(governed, options.semanticAnalysis, 1)
    if (stepCondense.length === 0) break
    allActions.push(...stepCondense)
    markdown = regenerate()
    if (fits(markdown)) break
  }
  if (fits(markdown)) {
    return attemptReExpansion(
      governed,
      original,
      markdown,
      allActions,
      linesBefore,
      maxLines,
      userInfo,
      mkOpts,
      options.semanticAnalysis
    )
  }

  // Step C: Full entry removal (loop — last resort before compact/final)
  for (let i = 0; i < 20; i++) {
    const stepC = pruneLowestScoredEntry(governed, options.semanticAnalysis)
    if (stepC.length === 0) break
    allActions.push(...stepC)
    markdown = regenerate()
    if (fits(markdown)) {
      return attemptReExpansion(
        governed,
        original,
        markdown,
        allActions,
        linesBefore,
        maxLines,
        userInfo,
        mkOpts,
        options.semanticAnalysis
      )
    }
  }

  // Compact mode
  markdown = compactifyMarkdown(markdown)
  const compactLines = countRenderedLines(markdown)
  allActions.push({
    step: 'COMPACT',
    action: 'Applied compact mode to markdown',
    linesSaved: countRenderedLines(regenerate()) - compactLines,
  })
  if (compactLines <= maxLines) {
    return attemptReExpansion(
      governed,
      original,
      markdown,
      allActions,
      linesBefore,
      maxLines,
      userInfo,
      mkOpts,
      options.semanticAnalysis
    )
  }

  // Final Verification
  const stepFinal = applyFinalVerification(governed, options.semanticAnalysis)
  allActions.push(...stepFinal)
  markdown = regenerate()
  markdown = compactifyMarkdown(markdown)

  return buildResult(governed, markdown, allActions, linesBefore, maxLines)
}

// ─── Re-Expansion ───────────────────────────────────

function attemptReExpansion(
  governed: GovernableContent,
  original: GovernableContent,
  markdown: string,
  allActions: GovernorAction[],
  linesBefore: number,
  maxLines: number,
  userInfo: MarkdownUserInfo,
  mkOpts: { sectionOrder: string[]; professionalTitle?: string },
  analysis: SemanticJDAnalysis
): GovernorResult {
  const targetLines = Math.floor(maxLines * 0.95)
  let currentLines = countRenderedLines(markdown)
  let currentMarkdown = markdown

  if (currentLines >= targetLines) {
    return buildResult(governed, currentMarkdown, allActions, linesBefore, maxLines)
  }

  // Build candidate list from both experience and project sections
  type Candidate = {
    sectionType: 'experience' | 'project'
    entryLabel: string
    bullet: string
    sectionScore: number
    hasMetric: boolean
    entryScore: number
  }

  const buildCandidates = (): Candidate[] => {
    const candidates: Candidate[] = []

    // Experience candidates
    if (governed.experience && original.experience) {
      for (let i = 0; i < governed.experience.length; i++) {
        const govExp = governed.experience[i]
        const origExp = original.experience.find(
          e => e.title === govExp.title && e.company === govExp.company
        )
        if (!origExp) continue

        const entryScore = analysis.experience_scores.find(s => s.index === i)?.score ?? 50
        const missing = origExp.bullets.filter(b => !govExp.bullets.includes(b))
        for (const bullet of missing) {
          candidates.push({
            sectionType: 'experience',
            entryLabel: `${govExp.title} at ${govExp.company}`,
            bullet,
            sectionScore: analysis.experience_section_total,
            hasMetric: hasAnyMetric(bullet),
            entryScore,
          })
        }
      }
    }

    // Project candidates
    if (governed.projects && original.projects) {
      for (let i = 0; i < governed.projects.length; i++) {
        const govProj = governed.projects[i]
        const govBullets = ((govProj as any).bullets as string[] | undefined) ?? []
        const origProj = original.projects.find(p => p.name === govProj.name)
        if (!origProj) continue
        const origBullets = ((origProj as any).bullets as string[] | undefined) ?? []

        const entryScore = analysis.project_scores.find(s => s.index === i)?.score ?? 50
        const missing = origBullets.filter(b => !govBullets.includes(b))
        for (const bullet of missing) {
          candidates.push({
            sectionType: 'project',
            entryLabel: govProj.name,
            bullet,
            sectionScore: analysis.project_section_total,
            hasMetric: hasAnyMetric(bullet),
            entryScore,
          })
        }
      }
    }

    // Sort: highest section score first, then metric bullets first, then entry score
    candidates.sort((a, b) => {
      if (b.sectionScore !== a.sectionScore) return b.sectionScore - a.sectionScore
      if (a.hasMetric !== b.hasMetric) return a.hasMetric ? -1 : 1
      return b.entryScore - a.entryScore
    })

    return candidates
  }

  // Loop: add bullets until target density or overflow
  while (currentLines < targetLines) {
    const candidates = buildCandidates()
    if (candidates.length === 0) break

    const best = candidates[0]

    // Add the bullet
    if (best.sectionType === 'experience' && governed.experience) {
      const exp = governed.experience.find(e => `${e.title} at ${e.company}` === best.entryLabel)
      if (exp) exp.bullets.push(best.bullet)
    } else if (best.sectionType === 'project' && governed.projects) {
      const proj = governed.projects.find(p => p.name === best.entryLabel)
      if (proj) {
        const projBullets = (proj as any).bullets as string[] | undefined
        if (projBullets) {
          projBullets.push(best.bullet)
        } else {
          ;(proj as any).bullets = [best.bullet]
        }
      }
    }

    const expandedMarkdown = generateResumeMarkdown(governed, userInfo, mkOpts)
    const expandedLines = countRenderedLines(expandedMarkdown)

    if (expandedLines > maxLines) {
      // Roll back — overflows
      if (best.sectionType === 'experience' && governed.experience) {
        const exp = governed.experience.find(e => `${e.title} at ${e.company}` === best.entryLabel)
        if (exp) exp.bullets.pop()
      } else if (best.sectionType === 'project' && governed.projects) {
        const proj = governed.projects.find(p => p.name === best.entryLabel)
        if (proj) {
          const projBullets = (proj as any).bullets as string[]
          projBullets.pop()
        }
      }
      break
    }

    allActions.push({
      step: 'REEXPAND',
      action: `Restored bullet to "${best.entryLabel}": "${best.bullet.slice(0, 60)}..."`,
      linesSaved: -(expandedLines - currentLines),
    })
    currentLines = expandedLines
    currentMarkdown = expandedMarkdown
  }

  return buildResult(governed, currentMarkdown, allActions, linesBefore, maxLines)
}
