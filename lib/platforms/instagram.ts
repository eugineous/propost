// ============================================================
// ProPost Empire — Instagram Graph API Wrapper
// ============================================================

import { withRetry } from './retry'

const BASE_URL = 'https://graph.facebook.com/v25.0'

function token(): string {
  return process.env.INSTAGRAM_ACCESS_TOKEN!
}

function accountId(): string {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!
}

async function igFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${sep}access_token=${token()}`, options)

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 3600000))
    throw new Error('Instagram API rate limit hit (429)')
  }

  return res
}

export async function publishPost(
  caption: string,
  imageUrl: string
): Promise<{ postId: string }> {
  return withRetry(async () => {
    // Step 1: Create media container
    const containerRes = await igFetch(`/${accountId()}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption }),
    })

    if (!containerRes.ok) {
      throw new Error(`IG createContainer failed: ${containerRes.status} ${await containerRes.text()}`)
    }

    const container = await containerRes.json() as { id: string }

    // Step 2: Publish container
    const publishRes = await igFetch(`/${accountId()}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id }),
    })

    if (!publishRes.ok) {
      throw new Error(`IG publish failed: ${publishRes.status} ${await publishRes.text()}`)
    }

    const result = await publishRes.json() as { id: string }
    return { postId: result.id }
  })
}

export async function publishStory(
  imageUrl: string,
  caption?: string
): Promise<{ storyId: string }> {
  return withRetry(async () => {
    const body: Record<string, string> = { image_url: imageUrl, media_type: 'STORIES' }
    if (caption) body.caption = caption

    const containerRes = await igFetch(`/${accountId()}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!containerRes.ok) {
      throw new Error(`IG story container failed: ${containerRes.status} ${await containerRes.text()}`)
    }

    const container = await containerRes.json() as { id: string }

    const publishRes = await igFetch(`/${accountId()}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id }),
    })

    if (!publishRes.ok) {
      throw new Error(`IG story publish failed: ${publishRes.status} ${await publishRes.text()}`)
    }

    const result = await publishRes.json() as { id: string }
    return { storyId: result.id }
  })
}

export async function getDMs(): Promise<
  Array<{ id: string; senderId: string; text: string; timestamp: string }>
> {
  return withRetry(async () => {
    const res = await igFetch(`/${accountId()}/conversations?fields=messages{message,from,created_time}`)

    if (!res.ok) {
      console.warn(`[instagram] getDMs failed: ${res.status}`)
      return []
    }

    const json = await res.json() as {
      data: Array<{
        messages: {
          data: Array<{ id: string; message: string; from: { id: string }; created_time: string }>
        }
      }>
    }

    const dms: Array<{ id: string; senderId: string; text: string; timestamp: string }> = []
    for (const conv of json.data ?? []) {
      for (const msg of conv.messages?.data ?? []) {
        dms.push({
          id: msg.id,
          senderId: msg.from.id,
          text: msg.message,
          timestamp: msg.created_time,
        })
      }
    }
    return dms
  })
}

export async function replyToDM(
  recipientId: string,
  text: string
): Promise<{ messageId: string }> {
  return withRetry(async () => {
    const res = await igFetch(`/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    })

    if (!res.ok) {
      throw new Error(`IG replyToDM failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as { message_id: string }
    return { messageId: json.message_id }
  })
}

export async function getMetrics(): Promise<{
  followers: number
  impressions: number
  engagementRate: number
}> {
  return withRetry(async () => {
    const res = await igFetch(
      `/${accountId()}?fields=followers_count,media_count`
    )

    if (!res.ok) {
      console.warn(`[instagram] getMetrics failed: ${res.status}`)
      return { followers: 0, impressions: 0, engagementRate: 0 }
    }

    const json = await res.json() as { followers_count: number; media_count: number }
    return {
      followers: json.followers_count,
      impressions: 0,
      engagementRate: 0,
    }
  })
}
