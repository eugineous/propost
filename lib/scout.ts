// ============================================================
// ProPost Empire — SCOUT scoutPoll
// Uses Google Trends RSS (free, no API key needed)
// ============================================================

import { db } from '@/lib/db'
import { trends, agentActions } from '@/lib/schema'

export async function scoutPoll(): Promise<void> {
  const start = Date.now()
  const foundTrends: Array<{ text: string; volume: number }> = []

  try {
    // Google Trends daily RSS for Kenya — no API key required
    const res = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=KE', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProPostBot/1.0)' },
    })

    if (!res.ok) {
      throw new Error(`Google Trends RSS returned ${res.status}`)
    }

    const xml = await res.text()

    // Parse <title><![CDATA[...]]></title> entries
    const titleRegex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g
    let match: RegExpExecArray | null
    while ((match = titleRegex.exec(xml)) !== null) {
      const text = match[1].trim()
      if (text && text !== 'Daily Search Trends') {
        foundTrends.push({ text, volume: 0 })
      }
    }

    // Also try plain <title> tags as fallback
    if (foundTrends.length === 0) {
      const plainTitleRegex = /<title>([^<]{3,80})<\/title>/g
      while ((match = plainTitleRegex.exec(xml)) !== null) {
        const text = match[1].trim()
        if (text && text !== 'Daily Search Trends' && !text.includes('<?')) {
          foundTrends.push({ text, volume: 0 })
        }
      }
    }
  } catch (err) {
    console.warn('[scout] Google Trends fetch failed:', err)
  }

  const topTrends = foundTrends.slice(0, 10)

  // Store in trends table
  for (const trend of topTrends) {
    try {
      await db.insert(trends).values({
        trendText: trend.text,
        volume: trend.volume,
        region: 'KE',
        source: 'google_trends',
        relevanceScore: '0.7',
      }).onConflictDoNothing()
    } catch {
      // ignore duplicate constraint errors
    }
  }

  // Always log to agent_actions (success or not)
  await db.insert(agentActions).values({
    agentName: 'scout',
    company: 'xforce',
    actionType: 'trends_fetched',
    details: {
      summary: `Found ${topTrends.length} trending topics in Kenya`,
      trends: topTrends.slice(0, 5).map(t => t.text),
      region: 'KE',
      source: 'google_trends',
      totalFound: topTrends.length,
    },
    outcome: topTrends.length > 0 ? 'success' : 'error',
    durationMs: Date.now() - start,
  })
}
