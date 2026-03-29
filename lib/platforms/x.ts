// ============================================================
// ProPost Empire — X/Twitter API v2 Wrapper
// ============================================================

import { withRetry } from './retry'

const BASE_URL = 'https://api.twitter.com/2'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_KV_AGENT_STATE_ID = process.env.CF_KV_AGENT_STATE_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!

async function bearerHeaders(): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function oauthHeaders(method: string, url: string, body?: string): Promise<HeadersInit> {
  // OAuth 1.0a signing for write operations
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = Math.random().toString(36).substring(2)

  const params: Record<string, string> = {
    oauth_consumer_key: process.env.TWITTER_API_KEY!,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: process.env.TWITTER_ACCESS_TOKEN!,
    oauth_version: '1.0',
  }

  const authHeader =
    'OAuth ' +
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(', ')

  return {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  }
}

async function updateRateLimitKV(): Promise<void> {
  try {
    const key = 'x:rate_limit:429'
    const value = JSON.stringify({ hitAt: new Date().toISOString(), backoffUntil: Date.now() + 3600000 })
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_AGENT_STATE_ID}/values/${encodeURIComponent(key)}`
    await fetch(kvUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: value,
    })
  } catch {
    // Non-critical — log and continue
    console.warn('[x] Failed to update rate limit KV')
  }
}

async function xFetch(
  path: string,
  options: RequestInit = {},
  useBearer = true
): Promise<Response> {
  const headers = useBearer ? await bearerHeaders() : await oauthHeaders(options.method ?? 'GET', `${BASE_URL}${path}`)
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 429) {
    await updateRateLimitKV()
    // Back off 1 hour
    await new Promise((r) => setTimeout(r, 3600000))
    throw new Error('X API rate limit hit (429) — backed off 1 hour')
  }

  return res
}

export async function postTweet(
  content: string,
  mediaUrls?: string[]
): Promise<{ tweetId: string; url: string }> {
  return withRetry(async () => {
    const body: Record<string, unknown> = { text: content }
    if (mediaUrls && mediaUrls.length > 0) {
      body.media = { media_ids: mediaUrls }
    }

    const res = await xFetch('/tweets', {
      method: 'POST',
      body: JSON.stringify(body),
    }, false)

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`postTweet failed: ${res.status} ${err}`)
    }

    const json = await res.json() as { data: { id: string; text: string } }
    const tweetId = json.data.id
    return {
      tweetId,
      url: `https://x.com/i/web/status/${tweetId}`,
    }
  })
}

export async function replyToTweet(
  content: string,
  replyToId: string
): Promise<{ tweetId: string }> {
  return withRetry(async () => {
    const res = await xFetch('/tweets', {
      method: 'POST',
      body: JSON.stringify({ text: content, reply: { in_reply_to_tweet_id: replyToId } }),
    }, false)

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`replyToTweet failed: ${res.status} ${err}`)
    }

    const json = await res.json() as { data: { id: string } }
    return { tweetId: json.data.id }
  })
}

export async function getTrending(
  region = 'KE'
): Promise<Array<{ text: string; volume: number }>> {
  return withRetry(async () => {
    // X API v2 trending via search/recent with woeid mapping
    const res = await xFetch(`/trends/by/woeid/23424863`, {}, true)

    if (!res.ok) {
      // Fallback: return empty array on non-critical failure
      console.warn(`[x] getTrending failed: ${res.status}`)
      return []
    }

    const json = await res.json() as Array<Array<{ name: string; tweet_volume: number | null }>>
    const trends = json[0] ?? []
    return trends.map((t) => ({
      text: t.name,
      volume: t.tweet_volume ?? 0,
    }))
  })
}

export async function getNotifications(): Promise<
  Array<{ id: string; type: string; text: string }>
> {
  return withRetry(async () => {
    // Fetch mentions timeline as notifications proxy
    const res = await xFetch(
      '/tweets/search/recent?query=@euginemicah&max_results=10&tweet.fields=text',
      {},
      true
    )

    if (!res.ok) {
      console.warn(`[x] getNotifications failed: ${res.status}`)
      return []
    }

    const json = await res.json() as { data?: Array<{ id: string; text: string }> }
    return (json.data ?? []).map((t) => ({
      id: t.id,
      type: 'mention',
      text: t.text,
    }))
  })
}

export async function getMetrics(): Promise<{
  followers: number
  impressions: number
  engagementRate: number
}> {
  return withRetry(async () => {
    const res = await xFetch(
      '/users/me?user.fields=public_metrics',
      {},
      true
    )

    if (!res.ok) {
      console.warn(`[x] getMetrics failed: ${res.status}`)
      return { followers: 0, impressions: 0, engagementRate: 0 }
    }

    const json = await res.json() as {
      data: { public_metrics: { followers_count: number; tweet_count: number } }
    }
    const metrics = json.data.public_metrics
    return {
      followers: metrics.followers_count,
      impressions: 0, // Requires elevated access
      engagementRate: 0,
    }
  })
}
