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
    const profileRes = await fbFetch(`/${pageId()}?fields=fan_count,followers_count`)
    if (!profileRes.ok) throw new Error(`FB profile metrics failed: ${profileRes.status} ${await profileRes.text()}`)
    const profile = await profileRes.json() as { fan_count: number; followers_count: number }

    const insightsRes = await fbFetch(`/${pageId()}/insights?metric=page_impressions,page_engaged_users&period=day`)
    if (!insightsRes.ok) throw new Error(`FB insights failed: ${insightsRes.status} ${await insightsRes.text()}`)
    const insights = await insightsRes.json() as {
      data?: Array<{ name: string; values?: Array<{ value: number }> }>
    }

    const impressions = Number(
      insights.data?.find((m) => m.name === 'page_impressions')?.values?.[0]?.value ?? 0
    )
    const engagedUsers = Number(
      insights.data?.find((m) => m.name === 'page_engaged_users')?.values?.[0]?.value ?? 0
    )
    return {
      followers: Number(profile.followers_count ?? profile.fan_count ?? 0),
      impressions,
      engagementRate: impressions > 0 ? engagedUsers / impressions : 0,
    }
  })
}
