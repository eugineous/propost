export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'
import { and, desc, eq, gte, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const top = await db
      .select()
      .from(posts)
      .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, sevenDaysAgo)))
      .orderBy(desc(posts.impressions), desc(posts.likes))
      .limit(8)

    const scheduled: Array<typeof posts.$inferInsert> = []
    const now = Date.now()
    for (let i = 0; i < top.length; i++) {
      const p = top[i]
      const scheduledAt = new Date(now + (i + 1) * 6 * 60 * 60 * 1000) // every 6 hours
      scheduled.push({
        platform: p.platform,
        content: `${p.content}\n\n(Refreshed for new audience window)`,
        status: 'scheduled',
        contentType: 'recycled',
        topicCategory: p.topicCategory,
        agentName: 'memory',
        hawkApproved: true,
        hawkRiskScore: p.hawkRiskScore ?? 15,
        scheduledAt,
      })
    }

    if (scheduled.length > 0) await db.insert(posts).values(scheduled)
    return NextResponse.json({ ok: true, recycledFromTopPosts: top.length, scheduled: scheduled.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

