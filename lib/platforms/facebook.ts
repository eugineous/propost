// FacebookAdapter — Facebook Graph API platform adapter
// Enforces 30-minute minimum gap between posts (checks actions table)

import type { Platform } from '../types'
import { PlatformAPIError } from '../errors'
import { getDb } from '../db/client'
import type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'

const GRAPH_BASE = 'https://graph.facebook.com/v18.0'
const MIN_GAP_MS = 30 * 60 * 1000 // 30 minutes

export class FacebookAdapter implements PlatformAdapter {
  readonly platform: Platform = 'facebook'

  private get accessToken(): string {
    const v = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? process.env.FACEBOOK_ACCESS_TOKEN
    if (!v) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not set')
    return v
  }

  private get pageId(): string {
    const v = process.env.FACEBOOK_PAGE_ID
    if (!v) throw new Error('FACEBOOK_PAGE_ID not set')
    return v
  }

  /** Check actions table for last Facebook post; throw if < 30 min ago */
  private async enforcePostGap(): Promise<void> {
    const db = getDb()
    const rows = await db`
      SELECT timestamp FROM actions
      WHERE platform = 'facebook'
        AND action_type = 'post'
        AND status = 'success'
      ORDER BY timestamp DESC
      LIMIT 1
    `
    const last = (rows as Array<{ timestamp: Date }>)[0]?.timestamp
    if (!last) return

    const elapsed = Date.now() - new Date(last).getTime()
    if (elapsed < MIN_GAP_MS) {
      const waitMs = MIN_GAP_MS - elapsed
      throw new PlatformAPIError(
        'facebook',
        429,
        true,
        `Facebook 30-minute gap not met. Wait ${Math.ceil(waitMs / 1000)}s more.`
      )
    }
  }

  async post(content: PostContent): Promise<PlatformPostResult> {
    await this.enforcePostGap()

    const url = `${GRAPH_BASE}/${this.pageId}/feed`
    const body = new URLSearchParams({
      message: content.text,
      access_token: this.accessToken,
    })

    let res: Response
    try {
      res = await fetch(url, { method: 'POST', body })
    } catch (err) {
      throw new PlatformAPIError('facebook', 0, false, `Network error: ${String(err)}`)
    }

    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'facebook',
        res.status,
        res.status === 429,
        `Facebook API error ${res.status}: ${JSON.stringify(raw)}`
      )
    }

    const postId = (raw as { id?: string }).id
    if (!postId) throw new PlatformAPIError('facebook', res.status, false, 'No post ID returned')

    return {
      success: true,
      postId,
      url: `https://www.facebook.com/${postId}`,
      rawResponse: raw,
    }
  }

  async reply(targetId: string, content: string): Promise<PlatformPostResult> {
    const url = `${GRAPH_BASE}/${targetId}/comments`
    const body = new URLSearchParams({
      message: content,
      access_token: this.accessToken,
    })

    const res = await fetch(url, { method: 'POST', body })
    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'facebook',
        res.status,
        res.status === 429,
        `Facebook reply error ${res.status}: ${JSON.stringify(raw)}`
      )
    }

    const postId = (raw as { id?: string }).id
    if (!postId) throw new PlatformAPIError('facebook', res.status, false, 'No reply ID returned')

    return { success: true, postId, rawResponse: raw }
  }

  async getMetrics(postId: string): Promise<PostMetrics> {
    const url = `${GRAPH_BASE}/${postId}/insights?metric=post_impressions,post_reactions_by_type_total&access_token=${this.accessToken}`
    const res = await fetch(url)
    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'facebook',
        res.status,
        res.status === 429,
        `Facebook metrics error ${res.status}`
      )
    }

    const data = (raw as { data?: Array<{ name: string; values: Array<{ value: number | Record<string, number> }> }> }).data ?? []
    const impressions = data.find((d) => d.name === 'post_impressions')?.values?.[0]?.value as number | undefined
    const reactions = data.find((d) => d.name === 'post_reactions_by_type_total')?.values?.[0]?.value
    const likes = typeof reactions === 'object' && reactions !== null
      ? Object.values(reactions).reduce((a, b) => a + b, 0)
      : undefined

    return { impressions, likes }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const url = `${GRAPH_BASE}/${this.pageId}?fields=id,name&access_token=${this.accessToken}`
      const res = await fetch(url)
      return res.ok
    } catch {
      return false
    }
  }
}
