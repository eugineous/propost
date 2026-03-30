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
import { getMetricsLastSynced } from '@/lib/metricsState'

interface PlatformMetrics {
  platform: string
  status: 'ok' | 'stale' | 'no_data' | 'not_connected'
  followers: number | null
  impressions: number | null
  engagementRate: number | null
  postsPublished: number | null
  date: string | null
  lastSyncedAt: string | null
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
    const tokenMap: Record<string, boolean> = {
      x: Boolean(process.env.X_BEARER_TOKEN || process.env.X_ACCESS_TOKEN || process.env.TWITTER_BEARER_TOKEN || process.env.TWITTER_ACCESS_TOKEN),
      instagram: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID),
      linkedin: Boolean(process.env.LINKEDIN_ACCESS_TOKEN),
      facebook: Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID),
    }

    for (const platform of platforms) {
      const rows = await db
        .select()
        .from(dailyMetrics)
        .where(eq(dailyMetrics.platform, platform))
        .orderBy(desc(dailyMetrics.date))
        .limit(1)

      const row = rows[0]
      const lastSyncedAt = await getMetricsLastSynced(platform)
      const hasToken = tokenMap[platform]
      let status: PlatformMetrics['status'] = 'no_data'
      if (!hasToken) status = 'not_connected'
      else if (!row) status = 'no_data'
      else if (!lastSyncedAt) status = 'stale'
      else {
        const staleMs = Date.now() - new Date(lastSyncedAt).getTime()
        status = staleMs > 2 * 60 * 60 * 1000 ? 'stale' : 'ok'
      }

      platformMetrics.push({
        platform,
        status,
        followers: row ? (row.followers ?? null) : null,
        impressions: row ? Number(row.impressions ?? 0) : null,
        engagementRate: row ? Number(row.engagementRate ?? 0) : null,
        postsPublished: row ? (row.postsPublished ?? null) : null,
        date: row ? row.date : null,
        lastSyncedAt,
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

