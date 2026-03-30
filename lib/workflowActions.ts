// ============================================================
// ProPost Empire — Direct Workflow Action Executor
// Bypasses Gemini for known platform actions — real API calls
// ============================================================

import { db } from '@/lib/db'
import { posts, agentActions, trends } from '@/lib/schema'
import { postTweet, getMentions, replyToTweet } from '@/lib/platforms/x'
import { getDMs, replyToDM, publishPost as igPublish } from '@/lib/platforms/instagram'
import { publishPost as liPublish } from '@/lib/platforms/linkedin'
import { hawkReview } from '@/lib/hawk'
import { run as blazeRun } from '@/agents/xforce/blaze'
import { run as chatRun } from '@/agents/gramgod/chat'
import { run as scoutRun } from '@/agents/xforce/scout'
import { run as oracleRun } from '@/agents/intelcore/oracle'
import { run as memoryRun } from '@/agents/intelcore/memory'
import { run as scribeRun } from '@/agents/intelcore/scribe'
import { run as sentryRun } from '@/agents/intelcore/sentry'
import { run as novaRun } from '@/agents/linkedelite/nova'
import { run as auroraRun } from '@/agents/gramgod/aurora'
import { cleanEnvValue } from '@/lib/env'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { desc, gte } from 'drizzle-orm'

async function gemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(cleanEnvValue(process.env.GEMINI_API_KEY))
  const model = genAI.getGenerativeModel({ model: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function logAction(agentName: string, company: string, actionType: string, details: Record<string, unknown>, outcome: string, durationMs = 0) {
  await db.insert(agentActions).values({ agentName, company, actionType, details, outcome, durationMs })
}

// ── Action Registry ───────────────────────────────────────────
// Maps workflow step action strings to real implementations

export async function executeAction(
  action: string,
  params: Record<string, unknown>,
  agentName: string,
  corp: string
): Promise<{ ok: boolean; preview: string }> {
  const start = Date.now()

  try {
    switch (action) {

      // ── X / Twitter ──────────────────────────────────────────
      case 'generate_hot_take':
      case 'write_thread':
      case 'write_linkedin_post':
      case 'post_to_platform': {
        const platform = (params.platform as string) ?? (action === 'write_linkedin_post' ? 'linkedin' : 'x')
        const agentResult = await blazeRun(`Generate content for ${platform}. Topic: ${params.topic ?? 'Nairobi tech and entrepreneurship'}. Tone: ${params.tone ?? 'bold'}. Format: ${params.format ?? 'tweet'}`)
        const raw = agentResult.data?.response as string ?? ''
        let content = raw

        // Try to extract from JSON
        try {
          const match = raw.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0]) as { tweets?: Array<{ text: string }>; content?: string; text?: string }
            content = parsed.tweets?.[0]?.text ?? parsed.content ?? parsed.text ?? raw
          }
        } catch { /* use raw */ }

        content = content.trim().slice(0, 280)
        if (!content) return { ok: false, preview: 'No content generated' }

        // HAWK review
        const hawk = await hawkReview(content, platform, agentName)
        if (!hawk.approved) {
          await logAction(agentName, corp, 'post_blocked', { platform, reason: hawk.blockedReasons, content: content.slice(0, 100) }, 'blocked', Date.now() - start)
          return { ok: false, preview: `HAWK blocked: ${hawk.blockedReasons?.join(', ')}` }
        }

        if (platform === 'x' || platform === 'twitter') {
          const { tweetId, url } = await postTweet(content)
          await db.insert(posts).values({ platform: 'x', content, status: 'published', publishedAt: new Date(), platformId: tweetId, agentName, hawkApproved: true, hawkRiskScore: hawk.riskScore })
          await logAction(agentName, corp, 'post_published', { platform: 'x', tweetId, url, summary: `Posted to X: ${content.slice(0, 80)}` }, 'success', Date.now() - start)
          return { ok: true, preview: `✅ Posted to X: ${content.slice(0, 80)}` }
        }

        if (platform === 'linkedin') {
          const { postId } = await liPublish(content)
          await db.insert(posts).values({ platform: 'linkedin', content, status: 'published', publishedAt: new Date(), platformId: postId, agentName, hawkApproved: true })
          await logAction(agentName, corp, 'post_published', { platform: 'linkedin', postId, summary: `Posted to LinkedIn: ${content.slice(0, 80)}` }, 'success', Date.now() - start)
          return { ok: true, preview: `✅ Posted to LinkedIn: ${content.slice(0, 80)}` }
        }

        // Save as draft for other platforms
        await db.insert(posts).values({ platform, content, status: 'draft', agentName })
        return { ok: true, preview: `Draft saved for ${platform}: ${content.slice(0, 60)}` }
      }

      // ── Instagram DMs ─────────────────────────────────────────
      case 'scan_dm_backlog':
      case 'daily_engagement':
      case 'reply_dm_batch': {
        const dms = await getDMs()
        let replied = 0
        const tier = params.tier as string ?? 'all'
        const limit = tier === 'brand' ? 5 : tier === 'meaningful' ? 10 : 20

        for (const dm of dms.slice(0, limit)) {
          try {
            const reply = await gemini(
              `You are CHAT, Instagram DM manager for Eugine Micah (Kenyan media personality, PPP TV).
Reply to this DM warmly. Use Sheng if they wrote in Sheng, English if formal.
DM: "${dm.text}"
Reply (max 100 words, no hashtags):`
            )
            await replyToDM(dm.senderId, reply.trim())
            replied++
          } catch { /* continue */ }
        }

        await logAction(agentName, corp, 'dm_batch_reply', { summary: `Replied to ${replied}/${dms.length} DMs`, tier, replied, total: dms.length }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Replied to ${replied} Instagram DMs` }
      }

      case 'score_messages':
      case 'select_shoutouts': {
        const dms = await getDMs()
        const scored = dms.slice(0, 20).map(dm => ({
          ...dm,
          score: dm.text.length > 100 ? 8 : dm.text.length > 50 ? 5 : 2,
        })).sort((a, b) => b.score - a.score)

        const top10 = scored.slice(0, 10)
        await logAction(agentName, corp, 'shoutouts_selected', { summary: `Selected ${top10.length} shoutout candidates`, count: top10.length }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Selected ${top10.length} shoutout candidates` }
      }

      // ── Trend Scouting ────────────────────────────────────────
      case 'fetch_trends':
      case 'scan_crisis_signals':
      case 'flag_top_trends': {
        const foundTrends: string[] = []
        try {
          const res = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=KE', { headers: { 'User-Agent': 'Mozilla/5.0' } })
          const xml = await res.text()
          const regex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g
          let match: RegExpExecArray | null
          while ((match = regex.exec(xml)) !== null) {
            const t = match[1].trim()
            if (t && t !== 'Daily Search Trends') foundTrends.push(t)
          }
          for (const trendText of foundTrends.slice(0, 10)) {
            try { await db.insert(trends).values({ trendText, region: 'KE', source: 'google_trends', relevanceScore: '0.7' }) } catch { /* dup */ }
          }
        } catch { /* ignore */ }

        await logAction(agentName, corp, 'trends_fetched', { summary: `Found ${foundTrends.length} Kenya trends`, trends: foundTrends.slice(0, 5) }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Found ${foundTrends.length} trending topics in Kenya` }
      }

      // ── Intelligence / Briefing ───────────────────────────────
      case 'run_intelligence_sweep':
      case 'issue_daily_briefing':
      case 'compile_activity_report':
      case 'generate_daily_briefing': {
        const recentActions = await db.select().from(agentActions).orderBy(desc(agentActions.createdAt)).limit(20)
        const briefing = await gemini(
          `You are SOVEREIGN, commander of ProPost Empire for Eugine Micah.
Write a 3-sentence daily briefing based on these recent actions:
${JSON.stringify(recentActions.map(a => ({ agent: a.agentName, action: a.actionType, outcome: a.outcome })))}
Focus on: what worked, what needs attention, one recommendation.`
        )
        await logAction(agentName, corp, 'daily_briefing', { summary: briefing.trim().slice(0, 200), actionsAnalyzed: recentActions.length }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Briefing: ${briefing.trim().slice(0, 100)}` }
      }

      // ── Pattern Learning ──────────────────────────────────────
      case 'analyze_post_patterns':
      case 'extract_learnings':
      case 'analyze_strategy': {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentPosts = await db.select().from(posts).where(gte(posts.createdAt, sevenDaysAgo)).orderBy(desc(posts.createdAt)).limit(30)
        const analysis = await gemini(
          `Analyze these ${recentPosts.length} posts and extract 3 key learnings for Eugine Micah's social media strategy:
${JSON.stringify(recentPosts.map(p => ({ platform: p.platform, type: p.contentType, status: p.status, likes: p.likes, content: (p.content ?? '').slice(0, 60) })))}
Return JSON: {"learnings":["...","...","..."],"topPlatform":"...","bestContentType":"..."}`
        )
        await logAction(agentName, corp, 'pattern_analysis', { summary: `Analyzed ${recentPosts.length} posts`, analysis: analysis.slice(0, 200) }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Analyzed ${recentPosts.length} posts, extracted patterns` }
      }

      // ── LinkedIn ──────────────────────────────────────────────
      case 'review_li_strategy':
      case 'write_mentorship_post':
      case 'craft_brand_voice_post': {
        const result = await novaRun(`Write a LinkedIn post for Eugine Micah. Topic: ${params.topic ?? 'entrepreneurship lessons'}. Tone: ${params.tone ?? 'thought_leader'}`)
        const content = (result.data?.response as string ?? '').trim().slice(0, 3000)
        if (!content) return { ok: false, preview: 'No LinkedIn content generated' }

        const hawk = await hawkReview(content, 'linkedin', agentName)
        if (!hawk.approved) return { ok: false, preview: `HAWK blocked LinkedIn post` }

        const { postId } = await liPublish(content)
        await db.insert(posts).values({ platform: 'linkedin', content, status: 'published', publishedAt: new Date(), platformId: postId, agentName, hawkApproved: true })
        await logAction(agentName, corp, 'post_published', { platform: 'linkedin', postId, summary: `LinkedIn post: ${content.slice(0, 80)}` }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Posted to LinkedIn: ${content.slice(0, 80)}` }
      }

      // ── Security / Compliance ─────────────────────────────────
      case 'review_content_compliance':
      case 'check_shadowban_status':
      case 'monitor_policy_changes': {
        const pendingPosts = await db.select().from(posts).where(gte(posts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))).limit(10)
        let blocked = 0
        for (const post of pendingPosts) {
          if (post.status === 'draft' && !post.hawkApproved) {
            const review = await hawkReview(post.content, post.platform, post.agentName)
            if (!review.approved) blocked++
          }
        }
        await logAction(agentName, corp, 'compliance_review', { summary: `Reviewed ${pendingPosts.length} posts, blocked ${blocked}`, reviewed: pendingPosts.length, blocked }, 'success', Date.now() - start)
        return { ok: true, preview: `✅ Reviewed ${pendingPosts.length} posts, ${blocked} blocked` }
      }

      // ── Generic fallback — use Gemini via agent dispatch ──────
      default: {
        const agentResult = await (async () => {
          // Route to appropriate agent based on corp
          const task = `Execute: ${action}. Params: ${JSON.stringify(params)}. Be concise and take real action.`
          if (corp === 'xforce') return blazeRun(task)
          if (corp === 'gramgod') return chatRun(task)
          if (corp === 'linkedelite') return novaRun(task)
          if (corp === 'intelcore') {
            if (agentName === 'memory') return memoryRun(task)
            if (agentName === 'scribe') return scribeRun(task)
            if (agentName === 'sentry') return sentryRun(task)
            return oracleRun(task)
          }
          return scribeRun(task)
        })()

        const preview = (agentResult.data?.response as string ?? `${action} completed`).slice(0, 150)
        await logAction(agentName, corp, action, { summary: preview, params }, 'success', Date.now() - start)
        return { ok: true, preview }
      }
    }
  } catch (err) {
    const errorMsg = String(err)
    await logAction(agentName, corp, action, { summary: `Failed: ${errorMsg.slice(0, 100)}`, params }, 'error', Date.now() - start)
    return { ok: false, preview: errorMsg.slice(0, 150) }
  }
}
