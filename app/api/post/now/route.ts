// POST /api/post/now — direct API posting, no Make, no queue blocking
// Generates content via AI and posts directly to platform APIs
// Body: { platform: 'x'|'linkedin'|'instagram'|'facebook'|'all', content?: string, topic?: string }

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/router'
import { hawk } from '@/lib/hawk/engine'
import { getPlatformAdapter } from '@/lib/platforms/index'
import { logAction, logInfo, logError } from '@/lib/logger'
import { PLATFORM_PROMPTS } from '@/lib/brand/context'
import { getBestTopic } from '@/lib/content/ai-news-source'
import { formatContent } from '@/lib/content/formatter'
import { propostEvents } from '@/lib/events'

interface PostNowBody {
  platform?: 'x' | 'linkedin' | 'instagram' | 'facebook' | 'all'
  topic?: string
  pillar?: string
  content?: string
}

interface PostResult {
  platform: string
  success: boolean
  postId?: string
  url?: string
  content?: string
  error?: string
}

// ─── Per-platform post functions ──────────────────────────────────────────────

async function postX(content: string): Promise<PostResult> {
  try {
    const rate = await hawk.checkRateLimit('x')
    if (!rate.allowed) return { platform: 'x', success: false, error: `Rate limited until ${rate.resetAt.toISOString()}` }
    const delay = await hawk.getDelay('x')
    if (delay > 0) await new Promise(r => setTimeout(r, Math.min(delay, 2000)))
    const result = await getPlatformAdapter('x').post({ text: content.slice(0, 280) })
    await hawk.recordAction('x')
    await logAction({ agentName: 'BLAZE', company: 'xforce', platform: 'x', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'BLAZE', company: 'xforce', platform: 'x', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    logInfo(`[post/now] X posted: ${result.postId}`)
    return { platform: 'x', success: true, postId: result.postId, url: result.url, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] X failed', err)
    return { platform: 'x', success: false, error: msg, content }
  }
}

async function postLinkedIn(content: string): Promise<PostResult> {
  try {
    const rate = await hawk.checkRateLimit('linkedin')
    if (!rate.allowed) return { platform: 'linkedin', success: false, error: `Rate limited until ${rate.resetAt.toISOString()}` }
    const delay = await hawk.getDelay('linkedin')
    if (delay > 0) await new Promise(r => setTimeout(r, Math.min(delay, 2000)))
    const result = await getPlatformAdapter('linkedin').post({ text: content })
    await hawk.recordAction('linkedin')
    await logAction({ agentName: 'ORATOR', company: 'linkedelite', platform: 'linkedin', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'ORATOR', company: 'linkedelite', platform: 'linkedin', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    logInfo(`[post/now] LinkedIn posted: ${result.postId}`)
    return { platform: 'linkedin', success: true, postId: result.postId, url: result.url, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] LinkedIn failed', err)
    return { platform: 'linkedin', success: false, error: msg, content }
  }
}

async function postInstagram(content: string): Promise<PostResult> {
  try {
    const result = await getPlatformAdapter('instagram').post({ text: content })
    await logAction({ agentName: 'AURORA', company: 'gramgod', platform: 'instagram', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'AURORA', company: 'gramgod', platform: 'instagram', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    logInfo(`[post/now] Instagram posted: ${result.postId}`)
    return { platform: 'instagram', success: true, postId: result.postId, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] Instagram failed', err)
    return { platform: 'instagram', success: false, error: msg, content }
  }
}

async function postFacebook(content: string): Promise<PostResult> {
  try {
    const result = await getPlatformAdapter('facebook').post({ text: content })
    await logAction({ agentName: 'CHIEF', company: 'pagepower', platform: 'facebook', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'CHIEF', company: 'pagepower', platform: 'facebook', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    logInfo(`[post/now] Facebook posted: ${result.postId}`)
    return { platform: 'facebook', success: true, postId: result.postId, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] Facebook failed', err)
    return { platform: 'facebook', success: false, error: msg, content }
  }
}

// ─── Main POST handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: PostNowBody = {}
  try { body = await req.json() } catch { body = {} }

  const platform = body.platform ?? 'all'
  const pillar = body.pillar ?? 'ai_news'
  const results: PostResult[] = []

  try {
    // Get topic for AI generation
    const topic = await getBestTopic().catch(() => ({
      headline: 'AI is transforming how Nairobi works, creates, and connects',
      summary: 'Artificial intelligence tools are becoming essential for Kenyan creators, entrepreneurs, and media professionals.',
    }))
    const topicText = body.topic ?? topic.headline
    const summary = topic.summary

    const needsX  = platform === 'x'  || platform === 'all'
    const needsLI = platform === 'linkedin' || platform === 'all'
    const needsIG = platform === 'instagram' || platform === 'all'
    const needsFB = platform === 'facebook' || platform === 'all'

    // Generate content for each platform in parallel (skip if pre-written)
    const [xContent, liContent, igContent, fbContent] = await Promise.all([
      needsX && !body.content
        ? aiRouter.route('generate', `Write a sharp X post about: ${topicText}. Under 280 chars. Kenyan angle. Hot take.\n\nSummary: ${summary}\n\nVoice: Eugine Micah. No AI filler.`, { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar }).then(r => formatContent(r.content, 'x', 'ai_news').content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      needsLI && !body.content
        ? aiRouter.route('generate', `Write a LinkedIn post about: ${topicText}. Hook + 3 paragraphs + Kenyan angle + CTA.\n\nSummary: ${summary}\n\nVoice: Eugine Micah — professional authority. 3-5 hashtags at end.`, { platform: 'linkedin', systemPrompt: PLATFORM_PROMPTS.linkedin, pillar }).then(r => formatContent(r.content, 'linkedin', 'ai_news').content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      needsIG && !body.content
        ? aiRouter.route('generate', `Write an Instagram caption about: ${topicText}. Engaging, story-driven. Mix English and Swahili. Max 2 hashtags. End with a question.\n\nSummary: ${summary}`, { platform: 'instagram', pillar }).then(r => r.content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      needsFB && !body.content
        ? aiRouter.route('generate', `Write a Facebook post about: ${topicText}. Community-focused, shareable. Kenyan audience. Ask a question.\n\nSummary: ${summary}`, { platform: 'facebook', pillar }).then(r => r.content).catch(() => '')
        : Promise.resolve(body.content ?? ''),
    ])

    // Fire all in parallel — each catches its own errors
    const jobs: Promise<PostResult>[] = []
    if (needsX  && xContent)  jobs.push(postX(xContent))
    if (needsLI && liContent) jobs.push(postLinkedIn(liContent))
    if (needsIG && igContent) jobs.push(postInstagram(igContent))
    if (needsFB && fbContent) jobs.push(postFacebook(fbContent))

    const settled = await Promise.allSettled(jobs)
    for (const r of settled) {
      results.push(r.status === 'fulfilled' ? r.value : { platform: 'unknown', success: false, error: String((r as PromiseRejectedResult).reason) })
    }

    return NextResponse.json({
      ok: results.some(r => r.success),
      results,
      posted: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] Fatal', err)
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 })
  }
}

// GET — platform readiness check
export async function GET() {
  const [xRate, liRate] = await Promise.all([
    hawk.checkRateLimit('x').catch(() => ({ allowed: false, remaining: 0, resetAt: new Date() })),
    hawk.checkRateLimit('linkedin').catch(() => ({ allowed: false, remaining: 0, resetAt: new Date() })),
  ])
  return NextResponse.json({
    x:        { configured: !!(process.env.X_API_KEY && process.env.X_ACCESS_TOKEN), rateLimit: xRate },
    linkedin: { configured: !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN), rateLimit: liRate },
    instagram:{ configured: !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) },
    facebook: { configured: !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID) },
  })
}
