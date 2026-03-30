export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions, posts, trends } from '@/lib/schema'
import { desc, gte } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getDMs, replyToDM } from '@/lib/platforms/instagram'
import { dispatchToAgent, AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'
import { setAgentActive, setAgentIdle, setAgentError } from '@/lib/agentState'
import { cleanEnvValue } from '@/lib/env'

async function geminiGenerate(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(cleanEnvValue(process.env.GEMINI_API_KEY))
  const model = genAI.getGenerativeModel({ model: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function logAction(
  agentName: string,
  company: string,
  actionType: string,
  details: Record<string, unknown>,
  outcome: string,
  tokensUsed = 0,
  durationMs = 0
) {
  await db.insert(agentActions).values({
    agentName,
    company,
    actionType,
    details,
    outcome,
    tokensUsed,
    durationMs,
  })
}

// CHAT: reply to unreplied Instagram DMs
async function runChat() {
  const start = Date.now()
  const dms = await getDMs()
  let replied = 0

  for (const dm of dms.slice(0, 5)) {
    try {
      const reply = await geminiGenerate(
        `You are CHAT, a friendly Instagram DM assistant for a Kenyan social media influencer brand called ProPost Empire. 
Reply to this DM in a warm, engaging, professional tone. Keep it under 100 words.
DM: "${dm.text}"
Reply only with the response text, nothing else.`
      )
      await replyToDM(dm.senderId, reply.trim())
      replied++
    } catch (err) {
      console.warn('[work/chat] DM reply failed:', err)
    }
  }

  await logAction('chat', 'gramgod', 'dm_batch_reply', {
    summary: `Replied to ${replied} of ${dms.length} DMs`,
    dmCount: dms.length,
    replied,
  }, 'success', 0, Date.now() - start)

  return { agent: 'CHAT', replied, total: dms.length }
}

// BLAZE: generate tweet/thread idea
async function runBlaze() {
  const start = Date.now()

  const idea = await geminiGenerate(
    `You are BLAZE, a viral X (Twitter) content strategist for a Kenyan tech/lifestyle brand.
Generate ONE high-engagement tweet or thread idea about tech, entrepreneurship, or Kenyan culture.
Format: {"type":"tweet|thread","content":"...","hook":"...","hashtags":["..."]}
Return only valid JSON.`
  )

  let parsed: Record<string, unknown> = {}
  try {
    const match = idea.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {
    parsed = { content: idea.trim() }
  }

  await db.insert(posts).values({
    platform: 'x',
    content: String(parsed.content ?? idea.trim()).slice(0, 280),
    status: 'draft',
    agentName: 'blaze',
    contentType: parsed.type === 'thread' ? 'thread' : 'hot_take',
    topicCategory: 'tech',
  })

  await logAction('blaze', 'xforce', 'post_generated', {
    summary: `Generated ${parsed.type ?? 'tweet'} idea`,
    hook: parsed.hook,
    hashtags: parsed.hashtags,
    content: String(parsed.content ?? '').slice(0, 100),
  }, 'success', 0, Date.now() - start)

  return { agent: 'BLAZE', type: parsed.type ?? 'tweet', content: String(parsed.content ?? '').slice(0, 80) }
}

// SCOUT: fetch trending topics from Google Trends RSS for Kenya
async function runScout() {
  const start = Date.now()
  const foundTrends: string[] = []

  try {
    const res = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=KE', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await res.text()

    // Parse RSS items using exec loop (compatible with all TS targets)
    const titleRegex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g
    let match: RegExpExecArray | null
    while ((match = titleRegex.exec(xml)) !== null) {
      const text = match[1].trim()
      if (text && text !== 'Daily Search Trends') {
        foundTrends.push(text)
      }
    }

    // Save top 10 trends
    for (const trendText of foundTrends.slice(0, 10)) {
      try {
        await db.insert(trends).values({
          trendText,
          region: 'KE',
          source: 'google_trends',
          relevanceScore: '0.7',
        })
      } catch {
        // ignore duplicate trends
      }
    }
  } catch (err) {
    console.warn('[work/scout] trends fetch failed:', err)
  }

  await logAction('scout', 'xforce', 'trends_fetched', {
    summary: `Found ${foundTrends.length} trending topics in Kenya`,
    trends: foundTrends.slice(0, 5),
    region: 'KE',
  }, 'success', 0, Date.now() - start)

  return { agent: 'SCOUT', trendsFound: foundTrends.length, sample: foundTrends.slice(0, 3) }
}

// SCRIBE: generate daily briefing summary
async function runScribe() {
  const start = Date.now()

  const recentActions = await db
    .select()
    .from(agentActions)
    .orderBy(desc(agentActions.createdAt))
    .limit(20)

  const summary = await geminiGenerate(
    `You are SCRIBE, an intelligence analyst for ProPost Empire, a Kenyan social media management company.
Based on these recent agent actions, write a concise 3-sentence daily briefing:
${JSON.stringify(recentActions.map(a => ({ agent: a.agentName, action: a.actionType, outcome: a.outcome })))}
Focus on what's working, what needs attention, and one recommendation.`
  )

  await logAction('scribe', 'intelcore', 'daily_briefing', {
    summary: summary.trim().slice(0, 200),
    actionsAnalyzed: recentActions.length,
    generatedAt: new Date().toISOString(),
  }, 'success', 0, Date.now() - start)

  return { agent: 'SCRIBE', briefing: summary.trim().slice(0, 150) }
}

// MEMORY: analyze last 7 days of posts, extract patterns
async function runMemory() {
  const start = Date.now()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentPosts = await db
    .select()
    .from(posts)
    .where(gte(posts.createdAt, sevenDaysAgo))
    .orderBy(desc(posts.createdAt))
    .limit(30)

  const patterns = await geminiGenerate(
    `You are MEMORY, a pattern recognition agent for ProPost Empire.
Analyze these ${recentPosts.length} posts from the last 7 days and extract 3 key learnings:
${JSON.stringify(recentPosts.map(p => ({
  platform: p.platform,
  contentType: p.contentType,
  status: p.status,
  likes: p.likes,
  impressions: p.impressions,
  content: (p.content ?? '').slice(0, 60),
})))}
Return JSON: {"learnings":["...","...","..."],"topPlatform":"...","bestContentType":"..."}`
  )

  let parsed: Record<string, unknown> = {}
  try {
    const match = patterns.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {
    parsed = { learnings: [patterns.trim().slice(0, 100)] }
  }

  await logAction('memory', 'intelcore', 'pattern_analysis', {
    summary: `Analyzed ${recentPosts.length} posts, extracted patterns`,
    postsAnalyzed: recentPosts.length,
    learnings: parsed.learnings,
    topPlatform: parsed.topPlatform,
    bestContentType: parsed.bestContentType,
  }, 'success', 0, Date.now() - start)

  return { agent: 'MEMORY', postsAnalyzed: recentPosts.length, learnings: parsed.learnings }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { agents?: string[] }
  const requestedAgents = body.agents ?? ['CHAT', 'BLAZE', 'SCOUT', 'SCRIBE', 'MEMORY']

  const results: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  await Promise.allSettled(
    requestedAgents.map(async (agent) => {
      try {
        switch (agent.toUpperCase()) {
          case 'CHAT':
            await setAgentActive('chat', 'work_loop')
            results.CHAT = await runChat()
            await setAgentIdle('chat', 'work_loop_complete')
            break
          case 'BLAZE':
            await setAgentActive('blaze', 'work_loop')
            results.BLAZE = await runBlaze()
            await setAgentIdle('blaze', 'work_loop_complete')
            break
          case 'SCOUT':
            await setAgentActive('scout', 'work_loop')
            results.SCOUT = await runScout()
            await setAgentIdle('scout', 'work_loop_complete')
            break
          case 'SCRIBE':
            await setAgentActive('scribe', 'work_loop')
            results.SCRIBE = await runScribe()
            await setAgentIdle('scribe', 'work_loop_complete')
            break
          case 'MEMORY':
            await setAgentActive('memory', 'work_loop')
            results.MEMORY = await runMemory()
            await setAgentIdle('memory', 'work_loop_complete')
            break
          default: {
            // Generic dispatch — works for all 80 agents via agentDispatch
            const agentLower = agent.toLowerCase()
            const corp = AGENT_CORP_LOOKUP[agentLower]
            if (corp) {
              const t = Date.now()
              await setAgentActive(agentLower, 'work_loop')
              const res = await dispatchToAgent(corp, agentLower, { task: 'Run your primary duty for ProPost Empire' })
              await logAction(agentLower, corp, 'agent_work', {
                summary: res.preview ?? 'Task executed',
                task: 'primary_duty',
              }, 'success', 0, Date.now() - t)
              await setAgentIdle(agentLower, 'work_loop_complete')
              results[agent.toUpperCase()] = { agent: agent.toUpperCase(), preview: res.preview }
            } else {
              errors[agent] = 'Unknown agent'
            }
            break
          }
        }
      } catch (err) {
        const lower = agent.toLowerCase()
        if (AGENT_CORP_LOOKUP[lower]) {
          await setAgentError(lower, 'work_loop_failed')
        }
        errors[agent] = String(err)
        console.error(`[work/${agent}] error:`, err)
      }
    })
  )

  return NextResponse.json({
    ok: true,
    completedAt: new Date().toISOString(),
    results,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  })
}

// Also support GET for quick trigger
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'POST to this endpoint with {"agents":["CHAT","BLAZE","SCOUT","SCRIBE","MEMORY"]} to trigger agent work',
    availableAgents: Object.keys(AGENT_CORP_LOOKUP).map(a => a.toUpperCase()),
  })
}
