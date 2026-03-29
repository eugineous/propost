export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Content Library API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'
import { desc, eq, and } from 'drizzle-orm'
import { hawkReview } from '@/lib/hawk'

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string
      action: 'approve' | 'schedule' | 'publish' | 'set_status'
      status?: string
      scheduledAt?: string | null
      agentName?: string
    }

    const { id, action } = body
    if (!id || !action) {
      return NextResponse.json({ ok: false, error: 'id and action are required' }, { status: 400 })
    }

    const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

    if (action === 'approve') {
      const requestingAgent = body.agentName ?? row.agentName ?? 'manual'
      const decision = await hawkReview(row.content, row.platform, requestingAgent)
      if (!decision.approved) {
        const [updated] = await db.update(posts).set({
          status: 'blocked',
          hawkApproved: false,
          hawkRiskScore: decision.riskScore,
        }).where(eq(posts.id, id)).returning()
        return NextResponse.json({ ok: true, item: updated, hawk: decision })
      }

      const [updated] = await db.update(posts).set({
        status: 'approved',
        hawkApproved: true,
        hawkRiskScore: decision.riskScore,
      }).where(eq(posts.id, id)).returning()
      return NextResponse.json({ ok: true, item: updated, hawk: decision })
    }

    if (action === 'schedule') {
      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
      const [updated] = await db.update(posts).set({
        status: scheduledAt ? 'scheduled' : row.status,
        scheduledAt,
      }).where(eq(posts.id, id)).returning()
      return NextResponse.json({ ok: true, item: updated })
    }

    if (action === 'set_status') {
      const status = body.status
      if (!status) return NextResponse.json({ ok: false, error: 'status is required' }, { status: 400 })
      const [updated] = await db.update(posts).set({ status }).where(eq(posts.id, id)).returning()
      return NextResponse.json({ ok: true, item: updated })
    }

    return NextResponse.json({ ok: false, error: 'unsupported action' }, { status: 400 })
  } catch (err) {
    console.error('[content PATCH]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })

    await db.delete(posts).where(eq(posts.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[content DELETE]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
