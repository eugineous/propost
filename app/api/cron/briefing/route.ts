export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Morning Briefing Cron (6AM EAT / 3AM UTC)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions, trends, posts } from '@/lib/schema'
import { desc, gte, sql } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { validateCronSecret } from '@/lib/cronAuth'
import { cleanEnvValue } from '@/lib/env'

export async function GET(req: NextRequest) {
  // Verify cron secret via x-cron-secret header
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const genAI = new GoogleGenerativeAI(cleanEnvValue(process.env.GEMINI_API_KEY))
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Gather yesterday's stats
    const [recentActions, recentTrends, recentPosts] = await Promise.all([
      db.select().from(agentActions).where(gte(agentActions.createdAt, yesterday)).orderBy(desc(agentActions.createdAt)).limit(50),
      db.select().from(trends).where(gte(trends.detectedAt, yesterday)).orderBy(desc(trends.detectedAt)).limit(10),
      db.select().from(posts).where(gte(posts.createdAt, yesterday)).orderBy(desc(posts.createdAt)).limit(20),
    ])

    const successCount = recentActions.filter(a => a.outcome === 'success').length
    const errorCount = recentActions.filter(a => a.outcome === 'error').length
    const publishedPosts = recentPosts.filter(p => p.status === 'published').length
    const draftPosts = recentPosts.filter(p => p.status === 'draft').length

    const model = genAI.getGenerativeModel({ model: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are SCRIBE, the intelligence analyst for ProPost Empire — a Kenyan social media management company run by Eugine Micah.

Generate a morning briefing for 6AM EAT. Be concise, actionable, and energetic.

YESTERDAY'S STATS:
- Agent actions: ${recentActions.length} total (${successCount} success, ${errorCount} errors)
- Posts published: ${publishedPosts}, drafts ready: ${draftPosts}
- Trending topics found: ${recentTrends.length}
- Top trends: ${recentTrends.slice(0, 5).map(t => t.trendText).join(', ')}

FORMAT:
{
  "greeting": "Good morning Eugine! [one energetic sentence]",
  "yesterdayStats": "Yesterday: [2-sentence summary of what happened]",
  "todayPriorities": ["priority 1", "priority 2", "priority 3"],
  "trendingNow": ["trend 1", "trend 2", "trend 3"],
  "recommendation": "Today's top recommendation in one sentence"
}

Return only valid JSON.`)

    let briefing: Record<string, unknown> = {}
    try {
      const text = result.response.text()
      const match = text.match(/\{[\s\S]*\}/)
      if (match) briefing = JSON.parse(match[0])
    } catch {
      briefing = { greeting: 'Good morning Eugine!', recommendation: 'Check agent status and review drafts.' }
    }

    await db.insert(agentActions).values({
      agentName: 'scribe',
      company: 'intelcore',
      actionType: 'morning_briefing',
      details: {
        ...briefing,
        statsSnapshot: {
          actionsYesterday: recentActions.length,
          successRate: recentActions.length > 0 ? Math.round((successCount / recentActions.length) * 100) : 0,
          postsPublished: publishedPosts,
          draftsReady: draftPosts,
          trendsFound: recentTrends.length,
        },
        generatedAt: new Date().toISOString(),
      },
      outcome: 'success',
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      briefing,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    })
  } catch (err) {
    console.error('[briefing]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
