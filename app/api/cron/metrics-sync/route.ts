export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { getMetrics as getXMetrics } from '@/lib/platforms/x'
import { getMetrics as getIGMetrics } from '@/lib/platforms/instagram'
import { getMetrics as getLIMetrics } from '@/lib/platforms/linkedin'
import { getMetrics as getFBMetrics } from '@/lib/platforms/facebook'
import { db } from '@/lib/db'
import { dailyMetrics } from '@/lib/schema'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const [xMetrics, igMetrics, liMetrics, fbMetrics] = await Promise.allSettled([
      getXMetrics(),
      getIGMetrics(),
      getLIMetrics(),
      getFBMetrics(),
    ])

    const platforms = [
      { platform: 'x', metrics: xMetrics.status === 'fulfilled' ? xMetrics.value : null },
      { platform: 'instagram', metrics: igMetrics.status === 'fulfilled' ? igMetrics.value : null },
      { platform: 'linkedin', metrics: liMetrics.status === 'fulfilled' ? liMetrics.value : null },
      { platform: 'facebook', metrics: fbMetrics.status === 'fulfilled' ? fbMetrics.value : null },
    ]

    for (const { platform, metrics } of platforms) {
      if (!metrics) continue
      await db
        .insert(dailyMetrics)
        .values({
          date: today,
          platform,
          followers: metrics.followers,
          impressions: metrics.impressions,
          engagementRate: metrics.engagementRate.toString(),
        })
        .onConflictDoUpdate({
          target: [dailyMetrics.date, dailyMetrics.platform],
          set: {
            followers: metrics.followers,
            impressions: metrics.impressions,
            engagementRate: metrics.engagementRate.toString(),
          },
        })
    }

    return NextResponse.json({ ok: true, synced: platforms.map((p) => p.platform) })
  } catch (err) {
    console.error('[cron/metrics-sync]', err)
    return NextResponse.json({ error: 'Metrics sync failed' }, { status: 500 })
  }
}

