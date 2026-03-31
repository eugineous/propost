// XAdapter — X API v2 platform adapter
// OAuth 1.0a signing via Web Crypto API (edge-compatible)

import type { Platform } from '../types'
import { PlatformAPIError } from '../errors'

export interface PostContent {
  text: string
  mediaUrls?: string[]
  replyToId?: string
}

export interface PlatformPostResult {
  success: boolean
  postId?: string        // real platform post ID — never null on success
  url?: string
  error?: string
  rawResponse?: unknown  // full platform API response stored
}

export interface PostMetrics {
  impressions?: number
  likes?: number
  replies?: number
  reposts?: number
  bookmarks?: number
}

export interface PlatformAdapter {
  platform: Platform
  post(content: PostContent): Promise<PlatformPostResult>
  reply(targetId: string, content: string): Promise<PlatformPostResult>
  getMetrics(postId: string): Promise<PostMetrics>
  verifyCredentials(): Promise<boolean>
}

// ---------------------------------------------------------------------------
// OAuth 1.0a signing — Web Crypto API (no Node.js crypto)
// ---------------------------------------------------------------------------

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function signOAuth1(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
    ...params,
  }

  const allParams = { ...oauthParams }
  const sortedKeys = Object.keys(allParams).sort()
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&')

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`
  const signature = await hmacSha1(signingKey, baseString)

  const authHeader =
    'OAuth ' +
    Object.entries({ ...oauthParams, oauth_signature: signature })
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .join(', ')

  return authHeader
}

// ---------------------------------------------------------------------------
// XAdapter
// ---------------------------------------------------------------------------

export class XAdapter implements PlatformAdapter {
  readonly platform: Platform = 'x'

  private get apiKey(): string {
    const v = process.env.X_API_KEY
    if (!v) throw new Error('X_API_KEY not set')
    return v
  }
  private get apiSecret(): string {
    const v = process.env.X_API_SECRET
    if (!v) throw new Error('X_API_SECRET not set')
    return v
  }
  private get accessToken(): string {
    const v = process.env.X_ACCESS_TOKEN
    if (!v) throw new Error('X_ACCESS_TOKEN not set')
    return v
  }
  private get accessTokenSecret(): string {
    const v = process.env.X_ACCESS_TOKEN_SECRET
    if (!v) throw new Error('X_ACCESS_TOKEN_SECRET not set')
    return v
  }

  private async authHeader(method: string, url: string): Promise<string> {
    return signOAuth1(
      method,
      url,
      {},
      this.apiKey,
      this.apiSecret,
      this.accessToken,
      this.accessTokenSecret
    )
  }

  async post(content: PostContent): Promise<PlatformPostResult> {
    const url = 'https://api.twitter.com/2/tweets'
    const body: Record<string, unknown> = { text: content.text }
    if (content.replyToId) {
      body.reply = { in_reply_to_tweet_id: content.replyToId }
    }

    const auth = await this.authHeader('POST', url)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new PlatformAPIError('x', 0, false, `Network error: ${String(err)}`)
    }

    const raw = await res.json()

    if (!res.ok) {
      const rateLimited = res.status === 429
      throw new PlatformAPIError(
        'x',
        res.status,
        rateLimited,
        `X API error ${res.status}: ${JSON.stringify(raw)}`
      )
    }

    const postId = (raw as { data?: { id?: string } }).data?.id
    if (!postId) {
      throw new PlatformAPIError('x', res.status, false, 'X API returned no post ID')
    }

    return {
      success: true,
      postId,
      url: `https://x.com/i/web/status/${postId}`,
      rawResponse: raw,
    }
  }

  async reply(targetId: string, content: string): Promise<PlatformPostResult> {
    return this.post({ text: content, replyToId: targetId })
  }

  async getMetrics(postId: string): Promise<PostMetrics> {
    const url = `https://api.twitter.com/2/tweets/${postId}?tweet.fields=public_metrics`
    const auth = await this.authHeader('GET', url)

    let res: Response
    try {
      res = await fetch(url, { headers: { Authorization: auth } })
    } catch (err) {
      throw new PlatformAPIError('x', 0, false, `Network error: ${String(err)}`)
    }

    if (!res.ok) {
      throw new PlatformAPIError('x', res.status, res.status === 429, `X metrics error ${res.status}`)
    }

    const raw = (await res.json()) as {
      data?: {
        public_metrics?: {
          impression_count?: number
          like_count?: number
          reply_count?: number
          retweet_count?: number
          bookmark_count?: number
        }
      }
    }

    const m = raw.data?.public_metrics ?? {}
    return {
      impressions: m.impression_count,
      likes: m.like_count,
      replies: m.reply_count,
      reposts: m.retweet_count,
      bookmarks: m.bookmark_count,
    }
  }

  async verifyCredentials(): Promise<boolean> {
    const url = 'https://api.twitter.com/2/users/me'
    const auth = await this.authHeader('GET', url)

    try {
      const res = await fetch(url, { headers: { Authorization: auth } })
      return res.ok
    } catch {
      return false
    }
  }
}
