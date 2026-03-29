export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions, dailyMetrics, posts, trends } from '@/lib/schema'
import { desc, gte, eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') ?? '7'
    const days = parseInt(range, 10)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    // Follower growth from daily_metrics
    const metrics = await db
      .select()
      .from(dailyMetrics)
      .orderBy(desc(dailyMetrics.date))
      .limit(days * 5)

    // Agent activity: actions per agent per day
    const agentActivity = await db
      .select({
        agentName: agentActions.agentName,
        company: agentActions.company,
        count: sql<number>`count(*)::int`,
      })
      .from(agentActions)
      .where(gte(agentActions.createdAt, new Date(sinceStr)))
      .groupBy(agentActions.agentName, agentActions.company)
      .orderBy(desc(sql`count(*)`))
      .limit(20)

    // Top posts
    const topPosts = await db
      .select()
      .from(posts)
      .where(gte(posts.createdAt, new Date(sinceStr)))
      .orderBy(desc(posts.impressions))
      .limit(5)

    // Brand deal funnel
    const brandDeals = await db
      .select()
      .from(agentActions)
      .where(and(
        eq(agentActions.actionType, 'brand_deal'),
        gte(agentActions.createdAt, new Date(sinceStr))
      ))
      .orderBy(desc(agentActions.createdAt))
      .limit(50)

    // Trend performance
    const trendData = await db
      .select()
      .from(trends)
      .where(gte(trends.detectedAt, new Date(sinceStr)))
      .orderBy(desc(trends.relevanceScore))
      .limit(10)

    // Total actions
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(agentActions)
      .where(gte(agentActions.createdAt, new Date(sinceStr)))

    return NextResponse.json({
      ok: true,
      range: days,
      totalActions: total,
      metrics,
      agentActivity,
      topPosts: topPosts.map((p) => ({
        id: p.id,
        platform: p.platform,
        content: (p.content ?? '').slice(0, 100),
        impressions: p.impressions ?? 0,
        likes: p.likes ?? 0,
        reposts: p.reposts ?? 0,
        publishedAt: p.publishedAt,
      })),
      brandDeals: brandDeals.map((r) => {
        const d = (r.details ?? {}) as Record<string, unknown>
        return {
          id: r.id,
          brandName: d.brandName ?? 'Unknown',
          stage: d.stage ?? 'incoming',
          estimatedValue: Number(d.estimatedValue ?? 0),
          createdAt: r.createdAt,
        }
      }),
      trends: trendData.map((t) => ({
        id: t.id,
        text: t.trendText,
        relevance: Number(t.relevanceScore ?? 0),
        actioned: t.actioned,
        detectedAt: t.detectedAt,
      })),
    })
  } catch (err) {
    console.error('[analytics/summary GET]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
