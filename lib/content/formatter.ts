// Platform-specific content formatting enforcement
// Ensures every piece of content meets platform requirements before publishing

import type { Platform } from '../types'

export interface FormattedContent {
  platform: Platform
  content: string
  valid: boolean
  warnings: string[]
}

// Platform constraints
const CONSTRAINTS: Record<Platform, { maxLength?: number; minLength?: number; requireHashtags?: boolean }> = {
  x: { maxLength: 280 },
  instagram: { requireHashtags: true },
  linkedin: { minLength: 150 },
  facebook: {},
  website: {},
  substack: { minLength: 200 },
}

// Instagram hashtag blocks by pillar
const HASHTAG_BLOCKS: Record<string, string> = {
  ai_news: '#AI #ArtificialIntelligence #TechNews #AINews #MachineLearning #Kenya #Africa #Nairobi #NairobiTech #EugineMicah',
  youth_empowerment: '#YouthEmpowerment #AfricanYouth #Kenya #Hustle #Growth #Nairobi #KenyanYouth',
  trending_topics: '#Trending #Kenya #Africa #Viral #Nairobi',
  elite_conversations: '#Leadership #Business #Africa #Entrepreneurship #Nairobi #KenyanBusiness',
  kenyan_entertainment: '#Kenya #Nairobi #KenyanEntertainment #AfricanCulture #UrbanNews',
  fashion: '#Fashion #AfricanFashion #Style #Kenya #NairobiStyle',
  media_journalism: '#Media #Journalism #Africa #News #KenyanMedia',
  personal_story: '#PersonalGrowth #Story #Authentic #Kenya #BornBrokeBuiltLoud',
  entrepreneurship: '#Entrepreneurship #Business #Africa #Startup #Nairobi',
  culture_identity: '#AfricanCulture #Identity #Kenya #Heritage #Nairobi',
}

// Patterns that indicate AI preamble/meta-text that must be stripped before posting
const PREAMBLE_PATTERNS = [
  // "Here's a [type] post [for X] [on Y]:" — catch-all
  /^Here(?:'s| is)\s+(?:a\s+)?(?:professional\s+)?(?:great\s+)?(?:LinkedIn|X|Twitter|Instagram|Facebook|social media)?\s*post(?:\s+for\s+[^:\n]+)?(?:\s+on\s+[^:\n]+)?:\s*\n+/i,
  // "Here's a post that meets the requirements:"
  /^Here(?:'s| is)\s+a\s+post\s+that\s+meets\s+the\s+requirements?:\s*\n+/i,
  // Generic "Here's [anything]:" opener
  /^Here(?:'s| is)\s+[^:\n]{0,100}:\s*\n+/i,
  // "Below is a [type] post:"
  /^Below\s+is\s+[^:\n]{0,100}:\s*\n+/i,
  // "This is a [type] post:"
  /^This\s+is\s+a\s+[^:\n]{0,100}:\s*\n+/i,
]

/**
 * Strip AI preamble text that should never appear in a real post.
 * Also fixes hashtag formatting (hashtag#tag → #tag).
 */
function stripAIPreamble(text: string): string {
  let content = text.trim()

  // Strip preamble patterns
  for (const pattern of PREAMBLE_PATTERNS) {
    const stripped = content.replace(pattern, '').trim()
    if (stripped.length > 50) {
      content = stripped
      break // only strip one preamble (they don't stack)
    }
  }

  // Fix "hashtag#tag" → "#tag" (LinkedIn markdown artifact)
  content = content.replace(/\bhashtag#/gi, '#')

  // Fix "hash#tag" → "#tag"
  content = content.replace(/\bhash#/gi, '#')

  // Strip trailing "— [AgentName]" signatures the AI sometimes adds
  content = content.replace(/\s*—\s*(ORATOR|BLAZE|NOVA|CAPTION|CHIEF|AURORA|ZARA|QUILL|REACH|SCOUT|BOLT|PIXEL|SPARK)\s*$/i, '').trim()

  // Strip "As [AgentName]," openers
  content = content.replace(/^As\s+(ORATOR|BLAZE|NOVA|CAPTION|CHIEF|AURORA|ZARA|QUILL|REACH|SCOUT|BOLT|PIXEL|SPARK)[,\s]/i, '').trim()

  // Strip "At [AgentName]," references
  content = content.replace(/\bAt\s+(ORATOR|BLAZE|NOVA|CAPTION|CHIEF|AURORA|ZARA|QUILL|REACH|SCOUT|BOLT|PIXEL|SPARK)[,\s]/gi, 'In our work, ').trim()

  return content
}

/**
 * Format content for a specific platform, enforcing all constraints.
 */
export function formatContent(
  raw: string,
  platform: Platform,
  pillar?: string
): FormattedContent {
  const warnings: string[] = []
  let content = raw.trim()

  // Strip AI preamble and fix hashtag format (always runs first)
  const cleaned = stripAIPreamble(content)
  if (cleaned !== content) {
    warnings.push('Stripped AI preamble/meta-text')
    content = cleaned
  }

  const constraints = CONSTRAINTS[platform]

  // X: enforce 280 char limit
  if (platform === 'x' && constraints.maxLength) {
    if (content.length > constraints.maxLength) {
      content = content.slice(0, constraints.maxLength - 3) + '...'
      warnings.push(`Truncated to ${constraints.maxLength} characters for X`)
    }
  }

  // Instagram: append hashtag block if missing
  if (platform === 'instagram' && constraints.requireHashtags) {
    if (!content.includes('#')) {
      const hashtags = pillar ? (HASHTAG_BLOCKS[pillar] ?? HASHTAG_BLOCKS.ai_news) : HASHTAG_BLOCKS.ai_news
      content = content + '\n\n' + hashtags
      warnings.push('Appended hashtag block for Instagram')
    }
  }

  // LinkedIn: enforce minimum length
  if (platform === 'linkedin' && constraints.minLength) {
    if (content.length < constraints.minLength) {
      warnings.push(`Content is ${content.length} chars — LinkedIn recommends ≥${constraints.minLength}`)
    }
  }

  // Facebook: add engagement prompt if missing
  if (platform === 'facebook') {
    if (!content.includes('?') && !content.toLowerCase().includes('what do you think')) {
      content = content + '\n\nWhat do you think? Drop your thoughts below.'
      warnings.push('Added engagement prompt for Facebook')
    }
  }

  const valid = validateContent(content, platform)

  return { platform, content, valid, warnings }
}

function validateContent(content: string, platform: Platform): boolean {
  if (!content || content.length < 10) return false
  const constraints = CONSTRAINTS[platform]
  if (constraints.maxLength && content.length > constraints.maxLength) return false
  return true
}

/**
 * Format content for all platforms at once.
 */
export function formatForAllPlatforms(
  raw: string,
  platforms: Platform[],
  pillar?: string
): FormattedContent[] {
  return platforms.map((p) => formatContent(raw, p, pillar))
}
