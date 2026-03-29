// ============================================================
// ProPost Empire — LinkedIn API Wrapper
// ============================================================

import { withRetry } from './retry'

const BASE_URL = 'https://api.linkedin.com/v2'

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

async function liFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers ?? {}) },
  })

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 3600000))
    throw new Error('LinkedIn API rate limit hit (429)')
  }

  return res
}

export async function publishPost(content: string): Promise<{ postId: string }> {
  return withRetry(async () => {
    const body = {
      author: `urn:li:person:${process.env.LINKEDIN_CLIENT_ID}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await liFetch('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`LinkedIn publishPost failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as { id: string }
    return { postId: json.id }
  })
}

export async function publishArticle(
  title: string,
  content: string
): Promise<{ articleId: string }> {
  return withRetry(async () => {
    const body = {
      author: `urn:li:person:${process.env.LINKEDIN_CLIENT_ID}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'ARTICLE',
          media: [{ status: 'READY', title: { text: title } }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await liFetch('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`LinkedIn publishArticle failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as { id: string }
    return { articleId: json.id }
  })
}

export async function getConnections(): Promise<
  Array<{ id: string; name: string; headline: string }>
> {
  return withRetry(async () => {
    const res = await liFetch('/connections?q=viewer&start=0&count=50')

    if (!res.ok) {
      console.warn(`[linkedin] getConnections failed: ${res.status}`)
      return []
    }

    const json = await res.json() as {
      elements: Array<{ id: string; localizedFirstName: string; localizedLastName: string; headline?: { localized?: { en_US?: string } } }>
    }

    return (json.elements ?? []).map((c) => ({
      id: c.id,
      name: `${c.localizedFirstName} ${c.localizedLastName}`,
      headline: c.headline?.localized?.en_US ?? '',
    }))
  })
}

export async function getMetrics(): Promise<{
  followers: number
  impressions: number
  engagementRate: number
}> {
  return withRetry(async () => {
    const res = await liFetch(
      `/networkSizes/urn:li:person:${process.env.LINKEDIN_CLIENT_ID}?edgeType=CompanyFollowedByMember`
    )

    if (!res.ok) {
      console.warn(`[linkedin] getMetrics failed: ${res.status}`)
      return { followers: 0, impressions: 0, engagementRate: 0 }
    }

    const json = await res.json() as { firstDegreeSize: number }
    return {
      followers: json.firstDegreeSize ?? 0,
      impressions: 0,
      engagementRate: 0,
    }
  })
}
