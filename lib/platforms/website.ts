// WebsiteAdapter — Vercel Deploy Hook adapter
// Triggers a Vercel deployment to publish website content

import type { Platform } from '../types'
import { PlatformAPIError } from '../errors'
import type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'

export class WebsiteAdapter implements PlatformAdapter {
  readonly platform: Platform = 'website'

  private get deployHookUrl(): string {
    const v = process.env.VERCEL_DEPLOY_HOOK_URL
    if (!v) throw new Error('VERCEL_DEPLOY_HOOK_URL not set')
    return v
  }

  async post(_content: PostContent): Promise<PlatformPostResult> {
    const timestamp = Date.now()
    const postId = `deploy-${timestamp}`

    let res: Response
    try {
      res = await fetch(this.deployHookUrl, { method: 'POST' })
    } catch (err) {
      throw new PlatformAPIError('website', 0, false, `Network error triggering deploy: ${String(err)}`)
    }

    if (!res.ok) {
      throw new PlatformAPIError(
        'website',
        res.status,
        false,
        `Vercel deploy hook returned ${res.status}`
      )
    }

    return {
      success: true,
      postId,
      rawResponse: { deployTriggeredAt: new Date(timestamp).toISOString() },
    }
  }

  async reply(_targetId: string, _content: string): Promise<PlatformPostResult> {
    throw new PlatformAPIError('website', 400, false, 'WebsiteAdapter does not support replies')
  }

  async getMetrics(_postId: string): Promise<PostMetrics> {
    // Website metrics are not available via deploy hook
    return {}
  }

  async verifyCredentials(): Promise<boolean> {
    // We can't verify without triggering a deploy — just check env var presence
    return Boolean(process.env.VERCEL_DEPLOY_HOOK_URL)
  }
}
