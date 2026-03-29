export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'

const PLATFORMS = ['x', 'instagram', 'linkedin', 'facebook'] as const

export async function GET() {
  try {
    const scheduled = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'scheduled'))
      .orderBy(asc(posts.scheduledAt))
      .limit(200)
    return NextResponse.json({ ok: true, items: scheduled })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { days?: number }
    const days = Math.max(1, Math.min(90, body.days ?? 30))

    const source = await db
      .select()
      .from(posts)
      .where(and(inArray(posts.status, ['approved', 'published']), inArray(posts.platform, [...PLATFORMS])))
      .limit(500)

    if (source.length === 0) {
      return NextResponse.json({ ok: false, error: 'No approved/published content available to build calendar.' }, { status: 400 })
    }

    const entries: Array<typeof posts.$inferInsert> = []
    const now = Date.now()
    const start = new Date(now + 60 * 60 * 1000) // start in one hour

    for (let d = 0; d < days; d++) {
      for (let p = 0; p < PLATFORMS.length; p++) {
        const platform = PLATFORMS[p]
        const pick = source[(d * PLATFORMS.length + p) % source.length]
        const scheduledAt = new Date(start.getTime() + d * 24 * 60 * 60 * 1000 + p * 2 * 60 * 60 * 1000)
        entries.push({
          platform,
          content: pick.content,
          mediaUrls: pick.mediaUrls ?? undefined,
          status: 'scheduled',
          scheduledAt,
          agentName: 'scribe',
          hawkApproved: true,
          hawkRiskScore: pick.hawkRiskScore ?? 15,
          contentType: 'calendar',
          topicCategory: 'calendar_30_day',
        })
      }
    }

    await db.insert(posts).values(entries)
    return NextResponse.json({ ok: true, days, scheduled: entries.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

