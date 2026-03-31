// InstagramAdapter — Instagram Graph API platform adapter
// Supports post, reel_publish, story_publish, reply, getMetrics
// Retries media upload up to 3 times with exponential backoff (1s, 2s, 4s)

import type { Platform } from '../types'
import { PlatformAPIError } from '../errors'
import type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'

const GRAPH_BASE = 'https://graph.facebook.com/v18.0'
const UPLOAD_RETRY_DELAYS = [1000, 2000, 4000]

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class InstagramAdapter implements PlatformAdapter {
  readonly platform: Platform = 'instagram'

  private get accessToken(): string {
    const v = process.env.INSTAGRAM_ACCESS_TOKEN
    if (!v) throw new Error('INSTAGRAM_ACCESS_TOKEN not set')
    return v
  }

  private get accountId(): string {
    const v = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    if (!v) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not set')
    return v
  }

  /** Create a media container with retry on upload error */
  private async createMediaContainer(
    params: Record<string, string>
  ): Promise<string> {
    const url = `${GRAPH_BASE}/${this.accountId}/media`
    const body = new URLSearchParams({
      ...params,
      access_token: this.accessToken,
    })

    let lastError: unknown
    for (let attempt = 0; attempt <= UPLOAD_RETRY_DELAYS.length; attempt++) {
      try {
        const res = await fetch(url, { method: 'POST', body })
        const raw = await res.json()

        if (!res.ok) {
          const rateLimited = res.status === 429
          throw new PlatformAPIError(
            'instagram',
            res.status,
            rateLimited,
            `Instagram media create error ${res.status}: ${JSON.stringify(raw)}`
          )
        }

        const mediaId = (raw as { id?: string }).id
        if (!mediaId) throw new Error('No media ID returned from Instagram')
        return mediaId
      } catch (err) {
        lastError = err
        if (attempt < UPLOAD_RETRY_DELAYS.length) {
          await sleep(UPLOAD_RETRY_DELAYS[attempt])
        }
      }
    }
    throw lastError
  }

  /** Publish a previously created media container */
  private async publishContainer(mediaId: string): Promise<string> {
    const url = `${GRAPH_BASE}/${mediaId}/publish`
    const body = new URLSearchParams({
      creation_id: mediaId,
      access_token: this.accessToken,
    })

    const res = await fetch(url, { method: 'POST', body })
    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'instagram',
        res.status,
        res.status === 429,
        `Instagram publish error ${res.status}: ${JSON.stringify(raw)}`
      )
    }

    const postId = (raw as { id?: string }).id
    if (!postId) throw new Error('No post ID returned from Instagram publish')
    return postId
  }

  async post(content: PostContent): Promise<PlatformPostResult> {
    const params: Record<string, string> = { caption: content.text }
    if (content.mediaUrls?.[0]) {
      params.image_url = content.mediaUrls[0]
    }

    const mediaId = await this.createMediaContainer(params)
    const postId = await this.publishContainer(mediaId)

    return {
      success: true,
      postId,
      url: `https://www.instagram.com/p/${postId}/`,
      rawResponse: { mediaId, postId },
    }
  }

  async reelPublish(content: PostContent): Promise<PlatformPostResult> {
    const videoUrl = content.mediaUrls?.[0]
    if (!videoUrl) throw new Error('reelPublish requires a video URL in mediaUrls[0]')

    const mediaId = await this.createMediaContainer({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: content.text,
    })
    const postId = await this.publishContainer(mediaId)

    return {
      success: true,
      postId,
      rawResponse: { mediaId, postId },
    }
  }

  async storyPublish(content: PostContent): Promise<PlatformPostResult> {
    const mediaUrl = content.mediaUrls?.[0]
    if (!mediaUrl) throw new Error('storyPublish requires a media URL in mediaUrls[0]')

    const isVideo = mediaUrl.match(/\.(mp4|mov|avi)$/i)
    const mediaId = await this.createMediaContainer({
      media_type: 'STORIES',
      ...(isVideo ? { video_url: mediaUrl } : { image_url: mediaUrl }),
      caption: content.text,
    })
    const postId = await this.publishContainer(mediaId)

    return {
      success: true,
      postId,
      rawResponse: { mediaId, postId },
    }
  }

  async reply(targetId: string, content: string): Promise<PlatformPostResult> {
    const url = `${GRAPH_BASE}/${targetId}/replies`
    const body = new URLSearchParams({
      message: content,
      access_token: this.accessToken,
    })

    const res = await fetch(url, { method: 'POST', body })
    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'instagram',
        res.status,
        res.status === 429,
        `Instagram reply error ${res.status}: ${JSON.stringify(raw)}`
      )
    }

    const postId = (raw as { id?: string }).id
    if (!postId) throw new Error('No reply ID returned from Instagram')

    return { success: true, postId, rawResponse: raw }
  }

  async getMetrics(postId: string): Promise<PostMetrics> {
    const url = `${GRAPH_BASE}/${postId}/insights?metric=impressions,likes,comments&access_token=${this.accessToken}`
    const res = await fetch(url)
    const raw = await res.json()

    if (!res.ok) {
      throw new PlatformAPIError(
        'instagram',
        res.status,
        res.status === 429,
        `Instagram metrics error ${res.status}`
      )
    }

    const data = (raw as { data?: Array<{ name: string; values: Array<{ value: number }> }> }).data ?? []
    const get = (name: string) => data.find((d) => d.name === name)?.values?.[0]?.value

    return {
      impressions: get('impressions'),
      likes: get('likes'),
      replies: get('comments'),
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const url = `${GRAPH_BASE}/${this.accountId}?fields=id,name&access_token=${this.accessToken}`
      const res = await fetch(url)
      return res.ok
    } catch {
      return false
    }
  }
}
