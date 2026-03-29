// ============================================================
// ProPost Empire — LinkedIn API Wrapper
// ============================================================

import { withRetry } from './retry'
import { cleanEnvValue } from '@/lib/env'

const BASE_URL = 'https://api.linkedin.com/v2'

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${cleanEnvValue(process.env.LINKEDIN_ACCESS_TOKEN)}`,
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
    const author = cleanEnvValue(process.env.LINKEDIN_AUTHOR_URN)
    if (!author) throw new Error('LINKEDIN_AUTHOR_URN missing for LinkedIn posting')
    const body = {
      author,
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
    const author = cleanEnvValue(process.env.LINKEDIN_AUTHOR_URN)
    if (!author) throw new Error('LINKEDIN_AUTHOR_URN missing for LinkedIn posting')
    const body = {
      author,
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
    const organization = process.env.LINKEDIN_ORG_URN
    if (!organization) throw new Error('LINKEDIN_ORG_URN missing for organization metrics')

    const followersRes = await liFetch(
      `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(organization)}`
    )
    if (!followersRes.ok) throw new Error(`LinkedIn follower stats failed: ${followersRes.status} ${await followersRes.text()}`)
    const followerJson = await followersRes.json() as {
      elements?: Array<{ followerCounts?: { organicFollowerCount?: number; paidFollowerCount?: number } }>
    }
    const followers = Number(
      (followerJson.elements ?? []).reduce((acc, e) => acc + Number(e.followerCounts?.organicFollowerCount ?? 0) + Number(e.followerCounts?.paidFollowerCount ?? 0), 0)
    )

    const pageStatsRes = await liFetch(
      `/organizationPageStatistics?q=organization&organization=${encodeURIComponent(organization)}`
    )
    if (!pageStatsRes.ok) throw new Error(`LinkedIn page stats failed: ${pageStatsRes.status} ${await pageStatsRes.text()}`)
    const pageJson = await pageStatsRes.json() as {
      elements?: Array<{
        totalPageStatistics?: {
          views?: { allPageViews?: { pageViews?: number } }
          uniqueVisitors?: { allUniqueVisitors?: { uniqueVisitorsCount?: number } }
        }
      }>
    }
    const impressions = Number(
      (pageJson.elements ?? []).reduce((acc, e) => acc + Number(e.totalPageStatistics?.views?.allPageViews?.pageViews ?? 0), 0)
    )
    const uniqueVisitors = Number(
      (pageJson.elements ?? []).reduce((acc, e) => acc + Number(e.totalPageStatistics?.uniqueVisitors?.allUniqueVisitors?.uniqueVisitorsCount ?? 0), 0)
    )

    return {
      followers,
      impressions,
      engagementRate: impressions > 0 ? uniqueVisitors / impressions : 0,
    }
  })
}
