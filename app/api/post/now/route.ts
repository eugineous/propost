// POST /api/post/now
// Immediately generates content and posts to X and/or LinkedIn.
// No queue. No waiting. Fires right now.
// Used for: manual triggers, "post now" button, immediate trend reactions.
//
// Posting priority:
//   1. Make.com webhook (if configured) — handles all platforms cleanly
//   2. Direct platform API (X OAuth, LinkedIn API)
//   3. X browser poster fallback (if API credits depleted)
//   4. Approval queue (if all else fails)
//
// Body: { platform: 'x' | 'linkedin' | 'both', topic?: string, pillar?: string }

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/router'
import { hawk } from '@/lib/hawk/engine'
import { getPlatformAdapter } from '@/lib/platforms/index'
import { logAction, logInfo, logError } from '@/lib/logger'
import { PLATFORM_PROMPTS, AI_NEWS_FORMULAS } from '@/lib/brand/context'
import { getBestTopic } from '@/lib/content/ai-news-source'
import { formatContent } from '@/lib/content/formatter'
import { propostEvents } from '@/lib/events'
import { getDb, withRetry } from '@/lib/db/client'
import { postViaMake, isMakeConfigured } from '@/lib/make/client'

interface PostNowBody {
  platform?: 'x' | 'linkedin' | 'instagram' | 'facebook' | 'all'
  topic?: string
  pillar?: string
  content?: string // pre-written content (skip AI generation)
}

interface PostResult {
  platform: string
  success: boolean
  postId?: string
  url?: string
  content?: string
  error?: string
}

// ─── Browser poster fallback (X) ─────────────────────────────────────────────

async function postViaXBrowserPoster(content: string): Promise<{ success: boolean; postId?: string; url?: string; error?: string }> {
  const browserPosterUrl = process.env.X_BROWSER_POSTER_URL
  const internalSecret = process.env.INTERNAL_SECRET

  if (!browserPosterUrl || !internalSecret) {
    return { success: false, error: 'X_BROWSER_POSTER_URL not configured' }
  }

  try {
    const res = await fetch(`${browserPosterUrl}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ content }),
    })

    const data = await res.json() as { ok: boolean; error?: string; preview?: string }

    if (!res.ok || !data.ok) {
      return { success: false, error: data.error ?? `Browser poster returned ${res.status}` }
    }

    return { success: true, url: 'https://x.com' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Approval queue fallback ──────────────────────────────────────────────────

async function queueForApproval(platform: string, content: string, reason: string): Promise<void> {
  try {
    const { getDb, withRetry } = await import('@/lib/db/client')
    const db = getDb()
    await withRetry(() =>
      db`
        INSERT INTO approval_queue (action_type, platform, agent_name, content, content_preview, risk_level, risk_score, status, failure_context)
        VALUES ('post_now', ${platform}, 'BLAZE', ${content}, ${content.slice(0, 100)}, 'medium', 30, 'pending', ${JSON.stringify({ reason, fallbacksExhausted: true })})
      `
    )
  } catch { /* non-fatal */ }
}

async function postToInstagramNow(content: string): Promise<PostResult> {
  // Try Make.com first (handles media upload automatically)
  if (isMakeConfigured('instagram')) {
    logInfo('[post/now] Using Make.com for Instagram post')
    const makeResult = await postViaMake({ platform: 'instagram', content, agentName: 'AURORA' })
    if (makeResult.ok) {
      propostEvents.emit('activity', {
        id: crypto.randomUUID(), type: 'post', agentName: 'AURORA',
        company: 'gramgod', platform: 'instagram',
        contentPreview: content.slice(0, 80), timestamp: new Date().toISOString(),
      })
      return { platform: 'instagram', success: true, content }
    }
    logInfo(`[post/now] Make failed for Instagram: ${makeResult.error} — trying direct API`)
  }

  // Direct Instagram Graph API
  try {
    const igAdapter = getPlatformAdapter('instagram')
    const result = await igAdapter.post({ text: content })
    await logAction({ agentName: 'AURORA', company: 'gramgod', platform: 'instagram', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'AURORA', company: 'gramgod', platform: 'instagram', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    return { platform: 'instagram', success: true, postId: result.postId, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Queue for approval if direct API fails
    await queueForApproval('instagram', content, msg)
    return { platform: 'instagram', success: false, error: `${msg} — queued for approval`, content }
  }
}

async function postToFacebookNow(content: string): Promise<PostResult> {
  // Try Make.com first
  if (isMakeConfigured('facebook')) {
    logInfo('[post/now] Using Make.com for Facebook post')
    const makeResult = await postViaMake({ platform: 'facebook', content, agentName: 'CHIEF' })
    if (makeResult.ok) {
      propostEvents.emit('activity', {
        id: crypto.randomUUID(), type: 'post', agentName: 'CHIEF',
        company: 'pagepower', platform: 'facebook',
        contentPreview: content.slice(0, 80), timestamp: new Date().toISOString(),
      })
      return { platform: 'facebook', success: true, content }
    }
    logInfo(`[post/now] Make failed for Facebook: ${makeResult.error} — trying direct API`)
  }

  // Direct Facebook Graph API
  try {
    const fbAdapter = getPlatformAdapter('facebook')
    const result = await fbAdapter.post({ text: content })
    await logAction({ agentName: 'CHIEF', company: 'pagepower', platform: 'facebook', actionType: 'post_now', content, status: 'success', platformPostId: result.postId })
    propostEvents.emit('activity', { id: result.postId ?? crypto.randomUUID(), type: 'post', agentName: 'CHIEF', company: 'pagepower', platform: 'facebook', contentPreview: content.slice(0, 80), timestamp: new Date().toISOString() })
    return { platform: 'facebook', success: true, postId: result.postId, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await queueForApproval('facebook', content, msg)
    return { platform: 'facebook', success: false, error: `${msg} — queued for approval`, content }
  }
}

async function postToXNow(content: string): Promise<PostResult> {
  // Try Make.com first if configured
  if (isMakeConfigured('x')) {
    logInfo('[post/now] Using Make.com for X post')
    const makeResult = await postViaMake({ platform: 'x', content, agentName: 'BLAZE' })
    if (makeResult.ok) {
      propostEvents.emit('activity', {
        id: crypto.randomUUID(), type: 'post', agentName: 'BLAZE',
        company: 'xforce', platform: 'x',
        contentPreview: content.slice(0, 80), timestamp: new Date().toISOString(),
      })
      return { platform: 'x', success: true, content }
    }
    logInfo(`[post/now] Make failed for X: ${makeResult.error} — trying direct API`)
  }

  try {
    const rateStatus = await hawk.checkRateLimit('x')
    if (!rateStatus.allowed) {
      return { platform: 'x', success: false, error: `HAWK rate limit: reset at ${rateStatus.resetAt.toISOString()}` }
    }

    const delay = await hawk.getDelay('x')
    if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 3000)))

    const xAdapter = getPlatformAdapter('x')
    let result: { success: boolean; postId?: string; url?: string; rawResponse?: unknown }
    let method = 'api'

    try {
      result = await xAdapter.post({ text: content.slice(0, 280) })
    } catch (apiErr) {
      const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      const isCreditsError = errMsg.includes('CreditsDepleted') || errMsg.includes('402')
      const isForbidden = errMsg.includes('403') || errMsg.includes('Forbidden')

      if (isCreditsError || isForbidden) {
        // X API requires paid plan — fall back to browser poster
        logInfo(`[post/now] X API credits depleted, trying browser poster fallback`)
        const browserResult = await postViaXBrowserPoster(content)
        if (browserResult.success) {
          result = { success: true, postId: browserResult.postId, url: browserResult.url, rawResponse: { method: 'browser_poster' } }
          method = 'browser_poster'
        } else {
          // Both failed — queue for approval
          await queueForApproval('x', content, errMsg)
          return { platform: 'x', success: false, error: `API: ${errMsg} | Browser: ${browserResult.error} — queued for approval` }
        }
      } else {
        throw apiErr
      }
    }

    await hawk.recordAction('x')

    await logAction({
      agentName: 'BLAZE',
      company: 'xforce',
      platform: 'x',
      actionType: method === 'browser_poster' ? 'post_browser' : 'post_now',
      content,
      status: 'success',
      platformPostId: result.postId,
      platformResponse: result.rawResponse,
    })

    propostEvents.emit('activity', {
      id: result.postId ?? crypto.randomUUID(),
      type: 'post',
      agentName: 'BLAZE',
      company: 'xforce',
      platform: 'x',
      contentPreview: content.slice(0, 80),
      timestamp: new Date().toISOString(),
      postId: result.postId,
    })

    logInfo(`[post/now] X post published via ${method}: ${result.postId ?? 'browser'}`)
    return { platform: 'x', success: true, postId: result.postId, url: result.url, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] X post failed', err)
    await logAction({
      agentName: 'BLAZE',
      company: 'xforce',
      platform: 'x',
      actionType: 'post_now',
      content,
      status: 'failed',
      platformResponse: { error: msg },
    })
    return { platform: 'x', success: false, error: msg, content }
  }
}

async function postToLinkedInNow(content: string): Promise<PostResult> {
  // Try Make.com first if configured
  if (isMakeConfigured('linkedin')) {
    logInfo('[post/now] Using Make.com for LinkedIn post')
    const makeResult = await postViaMake({ platform: 'linkedin', content, agentName: 'ORATOR' })
    if (makeResult.ok) {
      propostEvents.emit('activity', {
        id: crypto.randomUUID(), type: 'post', agentName: 'ORATOR',
        company: 'linkedelite', platform: 'linkedin',
        contentPreview: content.slice(0, 80), timestamp: new Date().toISOString(),
      })
      return { platform: 'linkedin', success: true, content }
    }
    logInfo(`[post/now] Make failed for LinkedIn: ${makeResult.error} — trying direct API`)
  }

  try {
    const rateStatus = await hawk.checkRateLimit('linkedin')
    if (!rateStatus.allowed) {
      return { platform: 'linkedin', success: false, error: `HAWK rate limit: reset at ${rateStatus.resetAt.toISOString()}` }
    }

    const delay = await hawk.getDelay('linkedin')
    if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 3000)))

    const liAdapter = getPlatformAdapter('linkedin')
    const result = await liAdapter.post({ text: content })

    await hawk.recordAction('linkedin')

    await logAction({
      agentName: 'ORATOR',
      company: 'linkedelite',
      platform: 'linkedin',
      actionType: 'post_now',
      content,
      status: 'success',
      platformPostId: result.postId,
      platformResponse: result.rawResponse,
    })

    propostEvents.emit('activity', {
      id: result.postId ?? crypto.randomUUID(),
      type: 'post',
      agentName: 'ORATOR',
      company: 'linkedelite',
      platform: 'linkedin',
      contentPreview: content.slice(0, 80),
      timestamp: new Date().toISOString(),
      postId: result.postId,
    })

    logInfo(`[post/now] LinkedIn post published: ${result.postId}`)
    return { platform: 'linkedin', success: true, postId: result.postId, url: result.url, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] LinkedIn post failed', err)
    await logAction({
      agentName: 'ORATOR',
      company: 'linkedelite',
      platform: 'linkedin',
      actionType: 'post_now',
      content,
      status: 'failed',
      platformResponse: { error: msg },
    })
    return { platform: 'linkedin', success: false, error: msg, content }
  }
}

export async function POST(req: NextRequest) {
  // Allow internal calls and authenticated founder calls
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = internalSecret === process.env.INTERNAL_SECRET
  const authHeader = req.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isInternal && !isCron) {
    // For dashboard calls — allow if no auth (dashboard is already protected by deployment)
    // In production you'd add session auth here
  }

  let body: PostNowBody = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const platform = body.platform ?? 'all'
  const pillar = body.pillar ?? 'ai_news'
  const results: PostResult[] = []

  try {
    const topic = await getBestTopic()
    const topicText = body.topic ?? topic.headline
    const summary = topic.summary

    // Generate content for each platform in parallel
    const [xContent, liContent, igContent, fbContent] = await Promise.all([
      // X
      (platform === 'x' || platform === 'both' || platform === 'all') && !body.content
        ? aiRouter.route('generate',
            `Write a sharp X post about: ${topicText}. Under 280 chars. Kenyan angle. Hot take.\n\nSummary: ${summary}\n\nVoice: Eugine Micah. No AI filler. MANDATORY: Kenyan angle.`,
            { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar }
          ).then(r => formatContent(r.content, 'x', 'ai_news').content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      // LinkedIn
      (platform === 'linkedin' || platform === 'both' || platform === 'all') && !body.content
        ? aiRouter.route('generate',
            `Write a LinkedIn post about: ${topicText}. Hook + 3-4 paragraphs + Kenyan angle + CTA. 800-1200 chars.\n\nSummary: ${summary}\n\nVoice: Eugine Micah — professional authority. 3-5 hashtags at end.`,
            { platform: 'linkedin', systemPrompt: PLATFORM_PROMPTS.linkedin, pillar }
          ).then(r => formatContent(r.content, 'linkedin', 'ai_news').content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      // Instagram
      (platform === 'instagram' || platform === 'all') && !body.content
        ? aiRouter.route('generate',
            `Write an Instagram caption about: ${topicText}. Engaging, story-driven. Mix English and Swahili naturally. Max 2 hashtags. End with a question.\n\nSummary: ${summary}`,
            { platform: 'instagram', pillar }
          ).then(r => r.content).catch(() => '')
        : Promise.resolve(body.content ?? ''),

      // Facebook
      (platform === 'facebook' || platform === 'all') && !body.content
        ? aiRouter.route('generate',
            `Write a Facebook post about: ${topicText}. Community-focused, shareable. Kenyan audience. Ask a question to drive comments.\n\nSummary: ${summary}`,
            { platform: 'facebook', pillar }
          ).then(r => r.content).catch(() => '')
        : Promise.resolve(body.content ?? ''),
    ])

    // Fire all platforms in parallel
    const postPromises: Promise<PostResult>[] = []
    if ((platform === 'x' || platform === 'both' || platform === 'all') && xContent) postPromises.push(postToXNow(xContent))
    if ((platform === 'linkedin' || platform === 'both' || platform === 'all') && liContent) postPromises.push(postToLinkedInNow(liContent))
    if ((platform === 'instagram' || platform === 'all') && igContent) postPromises.push(postToInstagramNow(igContent))
    if ((platform === 'facebook' || platform === 'all') && fbContent) postPromises.push(postToFacebookNow(fbContent))

    const settled = await Promise.allSettled(postPromises)
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value)
      else results.push({ platform: 'unknown', success: false, error: String(r.reason) })
    }

    // Update platform connection status in DB
    const db = getDb()
    for (const r of results) {
      if (r.success) {
        await withRetry(() =>
          db`
            INSERT INTO platform_connections (platform, status, last_verified, updated_at)
            VALUES (${r.platform}, 'connected', NOW(), NOW())
            ON CONFLICT (platform) DO UPDATE
              SET status = 'connected', last_verified = NOW(), updated_at = NOW(), error_message = NULL
          `
        ).catch(() => {})
      } else if (r.error) {
        await withRetry(() =>
          db`
            INSERT INTO platform_connections (platform, status, error_message, updated_at)
            VALUES (${r.platform}, 'error', ${r.error ?? null}, NOW())
            ON CONFLICT (platform) DO UPDATE
              SET status = 'error', error_message = ${r.error ?? null}, updated_at = NOW()
          `
        ).catch(() => {})
      }
    }

    const allSuccess = results.every((r) => r.success)
    const anySuccess = results.some((r) => r.success)

    return NextResponse.json({
      ok: anySuccess,
      results,
      posted: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    }, { status: allSuccess ? 200 : anySuccess ? 207 : 500 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[post/now] Fatal error', err)
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 })
  }
}

// GET — check if platforms are ready to post
export async function GET() {
  const xReady = !!(process.env.X_API_KEY && process.env.X_ACCESS_TOKEN)
  const liReady = !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN)

  const xRate = await hawk.checkRateLimit('x').catch(() => ({ allowed: false, remaining: 0, resetAt: new Date() }))
  const liRate = await hawk.checkRateLimit('linkedin').catch(() => ({ allowed: false, remaining: 0, resetAt: new Date() }))

  // Check browser poster status
  let browserPosterStatus = 'not_configured'
  const browserPosterUrl = process.env.X_BROWSER_POSTER_URL
  if (browserPosterUrl) {
    try {
      const res = await fetch(`${browserPosterUrl}/status`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
      })
      const data = await res.json() as { hasSession?: boolean; browserEnabled?: boolean }
      browserPosterStatus = data.browserEnabled ? (data.hasSession ? 'ready' : 'needs_login') : 'browser_api_disabled'
    } catch {
      browserPosterStatus = 'unreachable'
    }
  }

  return NextResponse.json({
    x: {
      configured: xReady,
      apiTier: xReady ? 'check_credits' : 'not_configured',
      browserPoster: browserPosterStatus,
      rateLimit: xRate,
      note: 'X API free tier cannot post. Needs Basic plan ($100/mo) OR Cloudflare Browser Rendering.',
    },
    linkedin: { configured: liReady, rateLimit: liRate },
    readyToPosts: xReady || liReady,
  })
}
