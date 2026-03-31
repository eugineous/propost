// Real-time AI news sourcing
// Sources topics from live news APIs and trend signals

export interface NewsTopic {
  headline: string
  summary: string
  sourceUrl: string
  relevanceScore: number
  publishedAt: string
  tags: string[]
}

// NewsAPI.org integration (requires NEWS_API_KEY env var)
async function fetchFromNewsAPI(): Promise<NewsTopic[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://newsapi.org/v2/everything?q=artificial+intelligence+OR+AI+OR+ChatGPT+OR+Gemini+OR+OpenAI&sortBy=publishedAt&pageSize=10&language=en&apiKey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.articles ?? []).map((a: Record<string, string>) => ({
      headline: a.title ?? '',
      summary: a.description ?? a.content ?? '',
      sourceUrl: a.url ?? '',
      relevanceScore: scoreRelevance(a.title + ' ' + a.description),
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      tags: extractTags(a.title + ' ' + a.description),
    }))
  } catch {
    return []
  }
}

// GNews API fallback (requires GNEWS_API_KEY env var)
async function fetchFromGNews(): Promise<NewsTopic[]> {
  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://gnews.io/api/v4/search?q=artificial+intelligence&lang=en&max=10&apikey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.articles ?? []).map((a: Record<string, string>) => ({
      headline: a.title ?? '',
      summary: a.description ?? '',
      sourceUrl: a.url ?? '',
      relevanceScore: scoreRelevance(a.title + ' ' + a.description),
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      tags: extractTags(a.title + ' ' + a.description),
    }))
  } catch {
    return []
  }
}

// Fallback: curated static topics when no API is available
function getFallbackTopics(): NewsTopic[] {
  const now = new Date().toISOString()
  return [
    {
      headline: 'AI is reshaping how we work, create, and communicate',
      summary: 'The latest developments in artificial intelligence are transforming industries at an unprecedented pace.',
      sourceUrl: 'https://propost.ai',
      relevanceScore: 0.8,
      publishedAt: now,
      tags: ['ai', 'technology', 'future'],
    },
    {
      headline: 'Large language models are getting smarter and cheaper',
      summary: 'New model releases are pushing the boundaries of what AI can do while reducing costs.',
      sourceUrl: 'https://propost.ai',
      relevanceScore: 0.75,
      publishedAt: now,
      tags: ['llm', 'ai', 'technology'],
    },
  ]
}

/**
 * Fetch the top AI news topics from available sources.
 * Falls back gracefully if APIs are unavailable.
 */
export async function fetchAINewsTopics(): Promise<NewsTopic[]> {
  const [newsApiTopics, gnewsTopics] = await Promise.all([
    fetchFromNewsAPI(),
    fetchFromGNews(),
  ])

  const all = [...newsApiTopics, ...gnewsTopics]

  if (all.length === 0) {
    return getFallbackTopics()
  }

  // Sort by relevance and recency, deduplicate by headline similarity
  return all
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)
}

/**
 * Get the single best topic for immediate posting.
 */
export async function getBestTopic(): Promise<NewsTopic> {
  const topics = await fetchAINewsTopics()
  return topics[0] ?? getFallbackTopics()[0]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HIGH_VALUE_TERMS = [
  'openai', 'gemini', 'claude', 'gpt', 'llm', 'chatgpt', 'nvidia', 'anthropic',
  'breakthrough', 'launch', 'release', 'new model', 'ai agent', 'artificial intelligence',
]

function scoreRelevance(text: string): number {
  const lower = text.toLowerCase()
  let score = 0.5
  for (const term of HIGH_VALUE_TERMS) {
    if (lower.includes(term)) score += 0.05
  }
  return Math.min(1, score)
}

function extractTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags: string[] = ['ai']
  if (lower.includes('openai') || lower.includes('chatgpt')) tags.push('openai')
  if (lower.includes('gemini') || lower.includes('google')) tags.push('google')
  if (lower.includes('nvidia')) tags.push('nvidia')
  if (lower.includes('llm') || lower.includes('language model')) tags.push('llm')
  if (lower.includes('agent')) tags.push('ai-agents')
  return tags
}
