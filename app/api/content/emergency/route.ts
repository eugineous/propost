export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'
import { and, desc, eq, sql } from 'drizzle-orm'

const PLATFORMS = ['x', 'instagram', 'linkedin', 'facebook'] as const

function emergencyTemplate(i: number, platform: typeof PLATFORMS[number]) {
  const base = [
    'Consistency beats hype. Keep building daily.',
    'Nairobi creators are rewriting the playbook. Respect.',
    'Your next breakthrough usually comes after the boring reps.',
    'Media is changing fast. Adapt before you are forced to.',
    'Authenticity scales better than perfection.',
  ][i % 5]

  if (platform === 'x') return `${base} #Kenya #CreatorEconomy`.slice(0, 275)
  if (platform === 'instagram') return `${base}\n\nIf this resonates, share with someone building in silence.`
  if (platform === 'linkedin') return `Hard truth: ${base} In my experience, teams that document and iterate win over teams that wait for perfect conditions.`
  return `${base} What do you think, fam?`
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.contentType, 'emergency'), eq(posts.status, 'approved')))
      .orderBy(desc(posts.createdAt))
      .limit(100)

    return NextResponse.json({ ok: true, count: rows.length, items: rows })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { count?: number }
    const targetCount = Math.max(1, Math.min(200, body.count ?? 50))

    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.contentType, 'emergency'), eq(posts.status, 'approved')))
    const existingCount = Number(existing[0]?.count ?? 0)

    if (existingCount >= targetCount) {
      return NextResponse.json({ ok: true, created: 0, total: existingCount })
    }

    const toCreate = targetCount - existingCount
    const values: Array<typeof posts.$inferInsert> = []
    for (let i = 0; i < toCreate; i++) {
      const platform = PLATFORMS[i % PLATFORMS.length]
      values.push({
        platform,
        content: emergencyTemplate(i, platform),
        status: 'approved',
        contentType: 'emergency',
        topicCategory: 'emergency_library',
        agentName: 'scribe',
        hawkApproved: true,
        hawkRiskScore: 10,
      })
    }

    await db.insert(posts).values(values)
    return NextResponse.json({ ok: true, created: toCreate, total: targetCount })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

