export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Metrics API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { dailyMetrics } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'

interface PlatformMetrics {
  platform: string
  followers: number
  impressions: number
  engagementRate: number
  postsPublished: number
  date: string
}

interface MetricsData {
  platforms: PlatformMetrics[]
  xImpressionsToday: number
  goalCompletionPct: number
}

const X_IMPRESSIONS_GOAL = 5_000_000

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get latest metrics per platform
    const platforms = ['x', 'instagram', 'linkedin', 'facebook']
    const platformMetrics: PlatformMetrics[] = []

    for (const platform of platforms) {
      const rows = await db
        .select()
        .from(dailyMetrics)
        .where(eq(dailyMetrics.platform, platform))
        .orderBy(desc(dailyMetrics.date))
        .limit(1)

      const row = rows[0]
      platformMetrics.push({
        platform,
        followers: row?.followers ?? 0,
        impressions: Number(row?.impressions ?? 0),
        engagementRate: Number(row?.engagementRate ?? 0),
        postsPublished: row?.postsPublished ?? 0,
        date: row?.date ?? '',
      })
    }

    const xMetrics = platformMetrics.find((p) => p.platform === 'x')
    const xImpressionsToday = xMetrics?.impressions ?? 0
    const goalCompletionPct = Math.min(100, (xImpressionsToday / X_IMPRESSIONS_GOAL) * 100)

    const data: MetricsData = {
      platforms: platformMetrics,
      xImpressionsToday,
      goalCompletionPct,
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[metrics]', err)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

