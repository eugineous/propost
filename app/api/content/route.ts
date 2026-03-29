export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Content Library API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'
import { desc, eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')

    const conditions = []
    if (status) conditions.push(eq(posts.status, status))
    if (platform) conditions.push(eq(posts.platform, platform))

    const rows = await db
      .select()
      .from(posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(100)

    const items = rows.map(row => ({
      id: row.id,
      platform: row.platform,
      content: row.content,
      mediaUrl: row.mediaUrls?.[0] ?? undefined,
      status: row.status,
      contentType: row.contentType ?? undefined,
      scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
      publishedAt: row.publishedAt?.toISOString() ?? undefined,
      performanceScore: row.impressions && row.impressions > 0
        ? Math.min(100, Math.round(((row.likes ?? 0) + (row.reposts ?? 0) * 2 + (row.replies ?? 0)) / Math.max(1, Number(row.impressions)) * 1000))
        : 0,
      agentName: row.agentName,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    }))

    return NextResponse.json({ ok: true, items })
  } catch (err) {
    console.error('[content GET]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      platform: string
      content: string
      mediaUrl?: string
      scheduledAt?: string
      contentType?: string
    }

    const { platform, content, mediaUrl, scheduledAt, contentType } = body

    if (!platform || !content) {
      return NextResponse.json({ ok: false, error: 'platform and content are required' }, { status: 400 })
    }

    const [row] = await db.insert(posts).values({
      platform,
      content,
      mediaUrls: mediaUrl ? [mediaUrl] : undefined,
      status: 'draft',
      agentName: 'manual',
      contentType: contentType ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      hawkApproved: false,
    }).returning()

    return NextResponse.json({
      ok: true,
      item: {
        id: row.id,
        platform: row.platform,
        content: row.content,
        status: row.status,
        contentType: row.contentType,
        scheduledAt: row.scheduledAt?.toISOString(),
        agentName: row.agentName,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        performanceScore: 0,
      },
    })
  } catch (err) {
    console.error('[content POST]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
