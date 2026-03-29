export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const BASE_URL = 'https://graph.facebook.com/v25.0'

function token() {
  return process.env.INSTAGRAM_ACCESS_TOKEN ?? ''
}

function accountId() {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? ''
}

async function igGet(path: string) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${sep}access_token=${token()}`)
  if (!res.ok) throw new Error(`IG API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function GET() {
  if (!token() || !accountId()) {
    return NextResponse.json({ ok: false, error: 'Instagram credentials not configured' }, { status: 503 })
  }

  try {
    // Account info: followers, media count
    const account = await igGet(`/${accountId()}?fields=followers_count,media_count,name,username`) as {
      followers_count: number
      media_count: number
      name: string
      username: string
    }

    // Recent media with engagement
    const media = await igGet(
      `/${accountId()}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=5`
    ) as {
      data: Array<{
        id: string
        caption?: string
        media_type: string
        timestamp: string
        like_count: number
        comments_count: number
        permalink: string
      }>
    }

    // Conversations (DMs) — count unread
    let dmCount = 0
    try {
      const convos = await igGet(`/${accountId()}/conversations?fields=unread_count`) as {
        data: Array<{ unread_count: number }>
      }
      dmCount = convos.data?.reduce((sum, c) => sum + (c.unread_count ?? 0), 0) ?? 0
    } catch {
      // DM access may not be available on all accounts
      dmCount = 0
    }

    return NextResponse.json({
      ok: true,
      account: {
        name: account.name,
        username: account.username,
        followers: account.followers_count,
        mediaCount: account.media_count,
      },
      dmsPending: dmCount,
      recentPosts: media.data?.map((m) => ({
        id: m.id,
        caption: (m.caption ?? '').slice(0, 80),
        mediaType: m.media_type,
        timestamp: m.timestamp,
        likes: m.like_count,
        comments: m.comments_count,
        permalink: m.permalink,
      })) ?? [],
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[ig-live] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
