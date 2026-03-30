// ============================================================
// ProPost Empire — X/Twitter API v2 Wrapper
// ============================================================

import { withRetry } from './retry'
import { cleanEnvValue } from '@/lib/env'
import crypto from 'crypto'

const BASE_URL = 'https://api.twitter.com/2'

// Helper: read X_* env vars with TWITTER_* fallback for backwards compat
function xEnv(xKey: string, twitterKey: string): string {
  return cleanEnvValue(process.env[xKey] || process.env[twitterKey])
}

function bearerHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${xEnv('X_BEARER_TOKEN', 'TWITTER_BEARER_TOKEN')}`,
    'Content-Type': 'application/json',
  }
}

// Proper OAuth 1.0a signing (HMAC-SHA1) using Node.js crypto
function oauthHeaders(method: string, fullUrl: string): HeadersInit {
  const consumerKey    = xEnv('X_API_KEY', 'TWITTER_API_KEY')
  const consumerSecret = xEnv('X_API_SECRET', 'TWITTER_API_SECRET')
  const accessToken    = xEnv('X_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN')
  const tokenSecret    = xEnv('X_ACCESS_TOKEN_SECRET', 'TWITTER_ACCESS_SECRET')

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')

  // Strip query string for base URL; collect query params separately
  const urlObj = new URL(fullUrl)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`

  const queryParams: Record<string, string> = {}
  urlObj.searchParams.forEach((v, k) => { queryParams[k] = v })

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  }

  // Combine all params, percent-encode keys & values, sort, join
  const allParams = { ...queryParams, ...oauthParams }
  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  // Signature base string
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(paramString),
  ].join('&')

  // Signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`

  // HMAC-SHA1 → base64
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  const authHeader =
    'OAuth ' +
    [
      ...Object.entries(oauthParams),
      ['oauth_signature', signature],
    ]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(', ')

  return {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  }
}

async function updateRateLimitKV(): Promise<void> {
  try {
    const cfAccountId    = cleanEnvValue(process.env.CF_ACCOUNT_ID)
    const cfKvAgentStateId = cleanEnvValue(process.env.CF_KV_AGENT_STATE_ID)
    const cfApiToken     = cleanEnvValue(process.env.CF_API_TOKEN)

    const key   = 'x:rate_limit:429'
    const value = JSON.stringify({ hitAt: new Date().toISOString(), backoffUntil: Date.now() + 3600000 })
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/storage/kv/namespaces/${cfKvAgentStateId}/values/${encodeURIComponent(key)}`
    await fetch(kvUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${cfApiToken}`, 'Content-Type': 'application/json' },
      body: value,
    })
  } catch {
    console.warn('[x] Failed to update rate limit KV')
  }
}

async function xFetch(
  path: string,
  options: RequestInit = {},
  useBearer = true
): Promise<Response> {
  const fullUrl = `${BASE_URL}${path}`
  const headers = useBearer
    ? bearerHeaders()
    : oauthHeaders(options.method ?? 'GET', fullUrl)

  const res = await fetch(fullUrl, { ...options, headers })

  if (res.status === 429) {
    await updateRateLimitKV()
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
      // 402 = CreditsDepleted (free tier monthly limit hit)
      if (res.status === 402) {
        throw new Error(`X_CREDITS_DEPLETED: ${err.slice(0, 200)}`)
      }
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
    const fullUrl = `${BASE_URL}/tweets`
    const body = JSON.stringify({ text: content, reply: { in_reply_to_tweet_id: replyToId } })
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: oauthHeaders('POST', fullUrl),
      body,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`replyToTweet failed: ${res.status} ${err}`)
    }

    const json = await res.json() as { data: { id: string } }
    return { tweetId: json.data.id }
  })
}

export async function getMentions(): Promise<Array<{ id: string; text: string }>> {
  return withRetry(async () => {
    const res = await xFetch(
      '/tweets/search/recent?query=@euginemicah&max_results=10&tweet.fields=text',
      {},
      true
    )

    if (!res.ok) {
      console.warn(`[x] getMentions failed: ${res.status}`)
      return []
    }

    const json = await res.json() as { data?: Array<{ id: string; text: string }> }
    return json.data ?? []
  })
}

export async function getTrending(
  _region = 'KE'
): Promise<Array<{ text: string; volume: number }>> {
  return withRetry(async () => {
    // X API v2 trending endpoint (Kenya woeid: 23424863)
    const res = await xFetch(`/trends/by/woeid/23424863`, {}, true)

    if (!res.ok) {
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
    return (json.data ?? []).map((t) => ({ id: t.id, type: 'mention', text: t.text }))
  })
}

export async function getMetrics(): Promise<{
  followers: number
  impressions: number
  engagementRate: number
}> {
  return withRetry(async () => {
    // Fetch authenticated user's public metrics
    const res = await xFetch('/users/me?user.fields=public_metrics', {}, true)

    if (!res.ok) {
      throw new Error(`X getMetrics failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as {
      data: { public_metrics: { followers_count: number; tweet_count: number } }
    }

    const followers   = json.data.public_metrics.followers_count ?? 0
    const tweetCount  = json.data.public_metrics.tweet_count ?? 0
    return {
      followers,
      impressions: tweetCount * 100, // crude estimate — real impressions require elevated access
      engagementRate: 0,
    }
  })
}
