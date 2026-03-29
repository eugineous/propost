// ============================================================
// ProPost Empire — Facebook Graph API Wrapper
// ============================================================

import { withRetry } from './retry'

const BASE_URL = 'https://graph.facebook.com/v25.0'

function token(): string {
  return process.env.FACEBOOK_ACCESS_TOKEN!
}

function pageId(): string {
  return process.env.FACEBOOK_PAGE_ID!
}

async function fbFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${sep}access_token=${token()}`, options)

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 3600000))
    throw new Error('Facebook API rate limit hit (429)')
  }

  return res
}

export async function publishPost(
  message: string,
  link?: string
): Promise<{ postId: string }> {
  return withRetry(async () => {
    const body: Record<string, string> = { message }
    if (link) body.link = link

    const res = await fbFetch(`/${pageId()}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`FB publishPost failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as { id: string }
    return { postId: json.id }
  })
}

export async function getComments(
  postId: string
): Promise<Array<{ id: string; message: string; from: string; createdTime: string }>> {
  return withRetry(async () => {
    const res = await fbFetch(`/${postId}/comments?fields=id,message,from,created_time`)

    if (!res.ok) {
      console.warn(`[facebook] getComments failed: ${res.status}`)
      return []
    }

    const json = await res.json() as {
      data: Array<{ id: string; message: string; from: { name: string }; created_time: string }>
    }

    return (json.data ?? []).map((c) => ({
      id: c.id,
      message: c.message,
      from: c.from?.name ?? 'unknown',
      createdTime: c.created_time,
    }))
  })
}

export async function moderateComment(
  commentId: string,
  action: 'hide' | 'remove'
): Promise<{ success: boolean }> {
  return withRetry(async () => {
    if (action === 'remove') {
      const res = await fbFetch(`/${commentId}`, { method: 'DELETE' })
      return { success: res.ok }
    }

    // Hide comment
    const res = await fbFetch(`/${commentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: true }),
    })
    return { success: res.ok }
  })
}

export async function getMetrics(): Promise<{
  followers: number
  impressions: number
  engagementRate: number
}> {
  return withRetry(async () => {
    const res = await fbFetch(
      `/${pageId()}?fields=fan_count,followers_count`
    )

    if (!res.ok) {
      console.warn(`[facebook] getMetrics failed: ${res.status}`)
      return { followers: 0, impressions: 0, engagementRate: 0 }
    }

    const json = await res.json() as { fan_count: number; followers_count: number }
    return {
      followers: json.followers_count ?? json.fan_count ?? 0,
      impressions: 0,
      engagementRate: 0,
    }
  })
}
