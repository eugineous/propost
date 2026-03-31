// AnalyticsEngine — Tier 5, system
// Pulls platform metrics, stores snapshots, and flags underperforming posts

import { getPlatformAdapter } from '../platforms/index'
import { getDb, withRetry } from '../db/client'
import { logInfo, logWarn, logError } from '../logger'
import type { Platform } from '../types'

export interface AnalyticsSnapshot {
  id: string
  platform: Platform
  metricType: string
  value: number
  postId?: string
  snapshotDate: Date
  createdAt: Date
}

export interface GrowthDataPoint {
  week: string
  followers: number
  growth: number
  growthPercent: number
}

const ALL_PLATFORMS: Platform[] = ['x', 'instagram', 'facebook', 'linkedin']
const UNDERPERFORM_THRESHOLD = 0.1 // 10% of platform average

export class AnalyticsEngine {
  /** Pull metrics for a single platform and store in analytics_snapshots */
  async pullPlatformMetrics(platform: Platform): Promise<void> {
    logInfo(`[AnalyticsEngine] Pulling metrics for ${platform}`)

    try {
      const adapter = getPlatformAdapter(platform)
      const db = getDb()

      // Get recent successful posts for this platform
      const recentPosts = await db`
        SELECT platform_post_id, content
        FROM actions
        WHERE platform = ${platform}
          AND status = 'success'
          AND platform_post_id IS NOT NULL
          AND timestamp >= NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
        LIMIT 20
      `

      const today = new Date().toISOString().split('T')[0]

      for (const post of recentPosts as Array<{ platform_post_id: string; content: string }>) {
        try {
          const metrics = await adapter.getMetrics(post.platform_post_id)

          const metricEntries: Array<{ type: string; value: number }> = []
          if (metrics.impressions != null) metricEntries.push({ type: 'impressions', value: metrics.impressions })
          if (metrics.likes != null) metricEntries.push({ type: 'likes', value: metrics.likes })
          if (metrics.replies != null) metricEntries.push({ type: 'replies', value: metrics.replies })
          if (metrics.reposts != null) metricEntries.push({ type: 'reposts', value: metrics.reposts })

          for (const entry of metricEntries) {
            await withRetry(async () => {
              const db2 = getDb()
              await db2`
                INSERT INTO analytics_snapshots (platform, metric_type, value, post_id, snapshot_date)
                VALUES (${platform}, ${entry.type}, ${entry.value}, ${post.platform_post_id}, ${today})
                ON CONFLICT DO NOTHING
              `
            })
          }
        } catch (err) {
          logWarn(`[AnalyticsEngine] Failed to get metrics for post ${post.platform_post_id}`, {
            platform,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      logInfo(`[AnalyticsEngine] Metrics pulled for ${platform}: ${recentPosts.length} posts`)
    } catch (err) {
      logError(`[AnalyticsEngine] Failed to pull metrics for ${platform}`, err)
    }
  }

  /** Pull metrics for all platforms */
  async pullAllPlatforms(): Promise<void> {
    logInfo('[AnalyticsEngine] Pulling metrics for all platforms')
    await Promise.allSettled(ALL_PLATFORMS.map((p) => this.pullPlatformMetrics(p)))
  }

  /** Get top performing posts for a platform in a given period */
  async getTopPosts(platform: Platform, period: '7d' | '30d'): Promise<AnalyticsSnapshot[]> {
    const days = period === '7d' ? 7 : 30
    const db = getDb()

    const rows = await db`
      SELECT id, platform, metric_type, value, post_id, snapshot_date, created_at
      FROM analytics_snapshots
      WHERE platform = ${platform}
        AND metric_type = 'impressions'
        AND snapshot_date >= NOW() - INTERVAL '${db.unsafe(String(days))} days'
        AND post_id IS NOT NULL
      ORDER BY value DESC
      LIMIT 10
    `

    return (rows as Array<{
      id: string
      platform: string
      metric_type: string
      value: bigint
      post_id: string | null
      snapshot_date: Date
      created_at: Date
    }>).map((row) => ({
      id: row.id,
      platform: row.platform as Platform,
      metricType: row.metric_type,
      value: Number(row.value),
      postId: row.post_id ?? undefined,
      snapshotDate: row.snapshot_date,
      createdAt: row.created_at,
    }))
  }

  /** Get follower growth data points for a platform over N weeks */
  async getFollowerGrowth(platform: Platform, weeks: number): Promise<GrowthDataPoint[]> {
    const db = getDb()

    const rows = await db`
      SELECT
        DATE_TRUNC('week', snapshot_date) AS week,
        MAX(value) AS followers
      FROM analytics_snapshots
      WHERE platform = ${platform}
        AND metric_type = 'followers'
        AND snapshot_date >= NOW() - INTERVAL '${db.unsafe(String(weeks * 7))} days'
      GROUP BY DATE_TRUNC('week', snapshot_date)
      ORDER BY week ASC
    `

    const data = rows as Array<{ week: Date; followers: bigint }>
    return data.map((row, i) => {
      const followers = Number(row.followers)
      const prevFollowers = i > 0 ? Number(data[i - 1].followers) : followers
      const growth = followers - prevFollowers
      const growthPercent = prevFollowers > 0 ? (growth / prevFollowers) * 100 : 0

      return {
        week: new Date(row.week).toISOString().split('T')[0],
        followers,
        growth,
        growthPercent: Math.round(growthPercent * 100) / 100,
      }
    })
  }

  /** Flag posts performing below 10% of platform average */
  async flagUnderperformingPosts(): Promise<void> {
    logInfo('[AnalyticsEngine] Checking for underperforming posts')

    for (const platform of ALL_PLATFORMS) {
      try {
        const db = getDb()

        // Get platform average impressions for last 30 days
        const avgRows = await db`
          SELECT AVG(value)::float AS avg_impressions
          FROM analytics_snapshots
          WHERE platform = ${platform}
            AND metric_type = 'impressions'
            AND snapshot_date >= NOW() - INTERVAL '30 days'
        `

        const avgImpressions = (avgRows as Array<{ avg_impressions: number }>)[0]?.avg_impressions ?? 0
        if (avgImpressions === 0) continue

        const threshold = avgImpressions * UNDERPERFORM_THRESHOLD

        // Find posts below threshold
        const underperforming = await db`
          SELECT post_id, value
          FROM analytics_snapshots
          WHERE platform = ${platform}
            AND metric_type = 'impressions'
            AND value < ${threshold}
            AND snapshot_date >= NOW() - INTERVAL '7 days'
            AND post_id IS NOT NULL
        `

        if ((underperforming as unknown[]).length > 0) {
          logWarn(`[AnalyticsEngine] ${underperforming.length} underperforming posts on ${platform}`, {
            threshold,
            avgImpressions,
          })
        }
      } catch (err) {
        logError(`[AnalyticsEngine] Failed to flag underperforming posts for ${platform}`, err)
      }
    }
  }
}

export const analyticsEngine = new AnalyticsEngine()
