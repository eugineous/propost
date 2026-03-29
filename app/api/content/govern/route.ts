export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { hawkReview } from '@/lib/hawk'

const PLATFORM_WINDOWS: Record<string, Array<{ h: number; m: number }>> = {
  x: [{ h: 6, m: 30 }, { h: 12, m: 30 }, { h: 18, m: 30 }],
  instagram: [{ h: 9, m: 0 }, { h: 13, m: 0 }, { h: 20, m: 0 }],
  linkedin: [{ h: 8, m: 30 }, { h: 12, m: 0 }, { h: 17, m: 30 }],
  facebook: [{ h: 10, m: 0 }, { h: 15, m: 0 }, { h: 21, m: 0 }],
}

function nextSlot(platform: string, offsetDays = 0) {
  const now = new Date()
  const slots = PLATFORM_WINDOWS[platform] ?? PLATFORM_WINDOWS.x
  for (const s of slots) {
    const d = new Date(now)
    d.setDate(d.getDate() + offsetDays)
    d.setHours(s.h, s.m, 0, 0)
    if (d.getTime() > now.getTime()) return d
  }
  const first = slots[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1 + offsetDays)
  tomorrow.setHours(first.h, first.m, 0, 0)
  return tomorrow
}

export async function POST() {
  try {
    const drafts = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'draft'))
      .orderBy(asc(posts.createdAt))
      .limit(30)

    let approved = 0
    let blocked = 0

    for (const d of drafts) {
      const decision = await hawkReview(d.content, d.platform, d.agentName)
      if (decision.approved) {
        approved++
        await db.update(posts).set({
          status: 'approved',
          hawkApproved: true,
          hawkRiskScore: decision.riskScore,
          lessonsExtracted: null,
        }).where(eq(posts.id, d.id))
      } else {
        blocked++
        await db.update(posts).set({
          status: 'blocked',
          hawkApproved: false,
          hawkRiskScore: decision.riskScore,
          lessonsExtracted: decision.blockedReasons.join(' | '),
        }).where(eq(posts.id, d.id))
      }
    }

    const approvedUnsheduled = await db
      .select()
      .from(posts)
      .where(and(eq(posts.status, 'approved'), isNull(posts.scheduledAt)))
      .orderBy(asc(posts.createdAt))
      .limit(40)

    let scheduled = 0
    const perPlatformOffset: Record<string, number> = { x: 0, instagram: 0, linkedin: 0, facebook: 0 }

    for (const p of approvedUnsheduled) {
      const offset = perPlatformOffset[p.platform] ?? 0
      const slot = nextSlot(p.platform, offset)
      perPlatformOffset[p.platform] = offset + (scheduled % 3 === 2 ? 1 : 0)
      await db.update(posts).set({ status: 'scheduled', scheduledAt: slot }).where(eq(posts.id, p.id))
      scheduled++
    }

    await db.insert(agentActions).values({
      agentName: 'scribe',
      company: 'intelcore',
      actionType: 'content_governance_manual',
      details: { summary: `Manual governance: approved ${approved}, blocked ${blocked}, scheduled ${scheduled}` },
      outcome: 'success',
    })

    return NextResponse.json({ ok: true, approved, blocked, scheduled })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

