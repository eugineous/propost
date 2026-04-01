// LinkedInAdapter — LinkedIn API v2 platform adapter
// Detects token expiry (401) and throws PlatformAPIError with statusCode 401

import type { Platform } from '../types'
import { PlatformAPIError } from '../errors'
import type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'

const LI_BASE = 'https://api.linkedin.com/v2'

export class LinkedInAdapter implements PlatformAdapter {
  readonly platform: Platform = 'linkedin'

  private get accessToken(): string {
    const v = process.env.LINKEDIN_ACCESS_TOKEN
    if (!v) throw new Error('LINKEDIN_ACCESS_TOKEN not set')
    return v
  }

  private get personUrn(): string {
    // Support both LINKEDIN_PERSON_URN and LINKEDIN_AUTHOR_URN (legacy)
    const v = process.env.LINKEDIN_PERSON_URN ?? process.env.LINKEDIN_AUTHOR_URN
    if (!v) throw new Error('LINKEDIN_PERSON_URN not set')
    // Return the full URN — normalize to urn:li:person: format
    const stripped = v.replace(/^urn:li:(member|person):/, '').trim()
    return `urn:li:person:${stripped}`
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    }
  }

  private handleError(status: number, raw: unknown, context: string): never {
    if (status === 401) {
      throw new PlatformAPIError(
        'linkedin',
        401,
        false,
        `LinkedIn token expired or invalid (401) — ${context}`
      )
    }
    throw new PlatformAPIError(
      'linkedin',
      status,
      status === 429,
      `LinkedIn API error ${status} — ${context}: ${JSON.stringify(raw)}`
    )
  }

  async post(content: PostContent): Promise<PlatformPostResult> {
    const url = `${LI_BASE}/ugcPosts`
    const body = {
      author: this.personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new PlatformAPIError('linkedin', 0, false, `Network error: ${String(err)}`)
    }

    const raw = await res.json()

    if (!res.ok) {
      this.handleError(res.status, raw, 'post')
    }

    // LinkedIn returns the post URN in the `id` field
    const postId = (raw as { id?: string }).id
    if (!postId) throw new PlatformAPIError('linkedin', res.status, false, 'No post ID returned')

    return {
      success: true,
      postId,
      url: `https://www.linkedin.com/feed/update/${postId}/`,
      rawResponse: raw,
    }
  }

  async reply(targetId: string, content: string): Promise<PlatformPostResult> {
    const url = `${LI_BASE}/socialActions/${targetId}/comments`
    const body = {
      actor: this.personUrn,
      message: { text: content },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    })
    const raw = await res.json()

    if (!res.ok) {
      this.handleError(res.status, raw, 'reply')
    }

    const postId = (raw as { id?: string }).id
    if (!postId) throw new PlatformAPIError('linkedin', res.status, false, 'No comment ID returned')

    return { success: true, postId, rawResponse: raw }
  }

  async getMetrics(postId: string): Promise<PostMetrics> {
    const url = `${LI_BASE}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(postId)}`
    const res = await fetch(url, { headers: this.authHeaders() })
    const raw = await res.json()

    if (!res.ok) {
      this.handleError(res.status, raw, 'getMetrics')
    }

    const elements = (raw as { elements?: Array<{ totalShareStatistics?: { impressionCount?: number; likeCount?: number; commentCount?: number; shareCount?: number } }> }).elements ?? []
    const stats = elements[0]?.totalShareStatistics ?? {}

    return {
      impressions: stats.impressionCount,
      likes: stats.likeCount,
      replies: stats.commentCount,
      reposts: stats.shareCount,
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${LI_BASE}/me`, { headers: this.authHeaders() })
      if (res.status === 401) {
        throw new PlatformAPIError('linkedin', 401, false, 'LinkedIn token expired')
      }
      return res.ok
    } catch (err) {
      if (err instanceof PlatformAPIError) throw err
      return false
    }
  }
}
