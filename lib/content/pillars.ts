// ProPost Content Pillar definitions
// 10 pillars covering all content strategy areas

import type { ContentPillar } from '../types'

export interface PillarDefinition {
  slug: ContentPillar
  name: string
  description: string
  platforms: string[]
  tone: string
  schedule: string // cron expression (UTC)
  postsPerDay: number
  active: boolean
}

export const CONTENT_PILLARS: PillarDefinition[] = [
  {
    slug: 'ai_news',
    name: 'AI News & Insights',
    description: 'Real-time AI industry news, breakthroughs, and insider analysis. Post every 6 hours.',
    platforms: ['x', 'instagram', 'linkedin', 'facebook'],
    tone: 'fast, insider, slightly provocative, authoritative',
    schedule: '0 3,9,15,21 * * *',
    postsPerDay: 4,
    active: true,
  },
  {
    slug: 'youth_empowerment',
    name: 'Youth Empowerment',
    description: 'Inspiring content for young Africans building their future.',
    platforms: ['instagram', 'facebook', 'x'],
    tone: 'inspiring, energetic, relatable, African-centered',
    schedule: '0 8 * * *',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'trending_topics',
    name: 'Trending Topics',
    description: 'Fast reactive content on what is trending globally and in Kenya.',
    platforms: ['x', 'instagram'],
    tone: 'reactive, bold, opinionated, fast',
    schedule: '*/30 * * * *',
    postsPerDay: 6,
    active: true,
  },
  {
    slug: 'elite_conversations',
    name: 'Elite Conversations',
    description: 'High-level discourse on business, politics, and society.',
    platforms: ['linkedin', 'x'],
    tone: 'intellectual, authoritative, thought-provoking',
    schedule: '0 10 * * *',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'kenyan_entertainment',
    name: 'Kenyan Entertainment',
    description: 'Kenyan music, culture, celebrity, and entertainment commentary.',
    platforms: ['instagram', 'facebook', 'x'],
    tone: 'fun, culturally grounded, Kenyan slang where appropriate',
    schedule: '0 18 * * *',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'fashion',
    name: 'Fashion & Style',
    description: 'African fashion, personal style, and brand collaborations.',
    platforms: ['instagram'],
    tone: 'aspirational, visual, trend-aware',
    schedule: '0 12 * * 1,3,5',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'media_journalism',
    name: 'Media & Journalism',
    description: 'Commentary on media, journalism, and the information landscape.',
    platforms: ['x', 'linkedin'],
    tone: 'analytical, insider, credible',
    schedule: '0 9 * * 1,3,5',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'personal_story',
    name: 'Personal Story',
    description: 'Authentic personal experiences, lessons, and behind-the-scenes.',
    platforms: ['instagram', 'linkedin', 'facebook'],
    tone: 'authentic, vulnerable, storytelling-forward',
    schedule: '0 19 * * 0,3',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'entrepreneurship',
    name: 'Entrepreneurship',
    description: 'Business insights, startup culture, and African entrepreneurship.',
    platforms: ['linkedin', 'x', 'facebook'],
    tone: 'practical, motivating, experience-based',
    schedule: '0 7 * * 1,4',
    postsPerDay: 1,
    active: true,
  },
  {
    slug: 'culture_identity',
    name: 'Culture & Identity',
    description: 'African identity, cultural pride, and social commentary.',
    platforms: ['instagram', 'facebook', 'x'],
    tone: 'proud, grounded, culturally rich',
    schedule: '0 20 * * 5,6',
    postsPerDay: 1,
    active: true,
  },
]

export const PILLAR_SCHEDULES: Record<ContentPillar, string> = Object.fromEntries(
  CONTENT_PILLARS.map((p) => [p.slug, p.schedule])
) as Record<ContentPillar, string>

export function getPillar(slug: ContentPillar): PillarDefinition | undefined {
  return CONTENT_PILLARS.find((p) => p.slug === slug)
}

export function getActivePillars(): PillarDefinition[] {
  return CONTENT_PILLARS.filter((p) => p.active)
}
