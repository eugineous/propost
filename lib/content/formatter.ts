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
}

// Common AI filler phrases to strip
const AI_FILLER = [
  'certainly!', 'of course!', 'absolutely!', 'great question',
  'as an ai', 'i am an ai', 'i cannot', 'i apologize',
  'in conclusion,', 'to summarize,', 'in summary,',
]

// Instagram hashtag blocks by pillar
const HASHTAG_BLOCKS: Record<string, string> = {
  ai_news: '#AI #ArtificialIntelligence #TechNews #AINews #MachineLearning #Kenya #Africa',
  youth_empowerment: '#YouthEmpowerment #AfricanYouth #Kenya #Hustle #Growth',
  trending_topics: '#Trending #Kenya #Africa #Viral',
  elite_conversations: '#Leadership #Business #Africa #Entrepreneurship',
  kenyan_entertainment: '#Kenya #Nairobi #KenyanEntertainment #AfricanCulture',
  fashion: '#Fashion #AfricanFashion #Style #Kenya',
  media_journalism: '#Media #Journalism #Africa #News',
  personal_story: '#PersonalGrowth #Story #Authentic #Kenya',
  entrepreneurship: '#Entrepreneurship #Business #Africa #Startup',
  culture_identity: '#AfricanCulture #Identity #Kenya #Heritage',
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

  // Strip AI filler
  for (const filler of AI_FILLER) {
    if (content.toLowerCase().includes(filler)) {
      content = content.replace(new RegExp(filler, 'gi'), '').trim()
      warnings.push(`Stripped AI filler: "${filler}"`)
    }
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

  // Facebook: add community framing if missing
  if (platform === 'facebook') {
    if (!content.includes('?') && !content.toLowerCase().includes('what do you think')) {
      content = content + '\n\nWhat do you think? Share your thoughts below 👇'
      warnings.push('Added community engagement prompt for Facebook')
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
