import { NextRequest, NextResponse } from 'next/server'
import { analyticsEngine } from '@/lib/analytics/engine'
import type { Platform } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = (searchParams.get('platform') ?? 'x') as Platform
  const period = (searchParams.get('period') ?? '7d') as '7d' | '30d' | '90d'

  try {
    const periodMap = { '7d': '7d', '30d': '30d', '90d': '30d' } as const
    const [topPosts, growth] = await Promise.all([
      analyticsEngine.getTopPosts(platform, periodMap[period]),
      analyticsEngine.getFollowerGrowth(platform, period === '90d' ? 12 : period === '30d' ? 4 : 1),
    ])

    return NextResponse.json({ platform, period, topPosts, growth })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analytics fetch failed' },
      { status: 500 }
    )
  }
}
