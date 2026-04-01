// Make.com (formerly Integromat) Integration
//
// HOW IT WORKS:
// 1. You create a "scenario" in Make.com for each platform
// 2. Each scenario starts with a "Custom Webhook" trigger
// 3. ProPost sends content to that webhook URL
// 4. Make posts it to the platform using its built-in app connections
//    (Make handles all OAuth — you connect accounts once in Make's UI)
//
// SETUP (one-time, in Make.com dashboard):
// For each platform, create a scenario:
//   Webhook (trigger) → [Platform] Create Post (action)
// Copy the webhook URL and add it to Vercel env vars.
//
// ENV VARS NEEDED:
//   MAKE_WEBHOOK_X           — webhook URL for X scenario
//   MAKE_WEBHOOK_INSTAGRAM   — webhook URL for Instagram scenario
//   MAKE_WEBHOOK_FACEBOOK    — webhook URL for Facebook scenario
//   MAKE_WEBHOOK_LINKEDIN    — webhook URL for LinkedIn scenario
//   MAKE_WEBHOOK_TIKTOK      — webhook URL for TikTok scenario
//   MAKE_WEBHOOK_YOUTUBE     — webhook URL for YouTube scenario
//   MAKE_WEBHOOK_REDDIT      — webhook URL for Reddit scenario
//   MAKE_API_KEY             — your Make API key (e9473f61-9d7f-4e85-b6c0-da2cdca95a7e)

export interface MakePostPayload {
  platform: string
  content: string
  mediaUrl?: string
  title?: string       // for YouTube/Reddit
  subreddit?: string   // for Reddit
  pillar?: string
  agentName?: string
  timestamp?: string
}

export interface MakePostResult {
  ok: boolean
  platform: string
  method: 'make_webhook'
  error?: string
  webhookUrl?: string
}

// Webhook URL env var names per platform
const WEBHOOK_ENV: Record<string, string> = {
  x:           'MAKE_WEBHOOK_X',
  instagram:   'MAKE_WEBHOOK_INSTAGRAM',
  facebook:    'MAKE_WEBHOOK_FACEBOOK',
  linkedin:    'MAKE_WEBHOOK_LINKEDIN',
  tiktok:      'MAKE_WEBHOOK_TIKTOK',
  youtube:     'MAKE_WEBHOOK_YOUTUBE',
  reddit:      'MAKE_WEBHOOK_REDDIT',
  mastodon:    'MAKE_WEBHOOK_MASTODON',
  truthsocial: 'MAKE_WEBHOOK_TRUTHSOCIAL',
}

export function getMakeWebhookUrl(platform: string): string | null {
  const envKey = WEBHOOK_ENV[platform]
  if (!envKey) return null
  return process.env[envKey] ?? null
}

export function isMakeConfigured(platform: string): boolean {
  return !!getMakeWebhookUrl(platform)
}

// Send content to Make webhook for a platform
export async function postViaMake(payload: MakePostPayload): Promise<MakePostResult> {
  const webhookUrl = getMakeWebhookUrl(payload.platform)

  if (!webhookUrl) {
    return {
      ok: false,
      platform: payload.platform,
      method: 'make_webhook',
      error: `MAKE_WEBHOOK_${payload.platform.toUpperCase()} not configured. Add it in Vercel env vars.`,
    }
  }

  try {
    const body = {
      platform: payload.platform,
      content: payload.content,
      media_url: payload.mediaUrl ?? null,
      title: payload.title ?? null,
      subreddit: payload.subreddit ?? null,
      pillar: payload.pillar ?? 'ai_news',
      agent: payload.agentName ?? 'PROPOST',
      timestamp: payload.timestamp ?? new Date().toISOString(),
      source: 'propost_empire',
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        platform: payload.platform,
        method: 'make_webhook',
        error: `Make webhook returned ${res.status}: ${text}`,
        webhookUrl,
      }
    }

    return {
      ok: true,
      platform: payload.platform,
      method: 'make_webhook',
      webhookUrl,
    }
  } catch (err) {
    return {
      ok: false,
      platform: payload.platform,
      method: 'make_webhook',
      error: err instanceof Error ? err.message : String(err),
      webhookUrl,
    }
  }
}

// Check which platforms have Make webhooks configured
export function getMakeStatus(): Record<string, { configured: boolean; envVar: string }> {
  const status: Record<string, { configured: boolean; envVar: string }> = {}
  for (const [platform, envKey] of Object.entries(WEBHOOK_ENV)) {
    status[platform] = {
      configured: !!process.env[envKey],
      envVar: envKey,
    }
  }
  return status
}
