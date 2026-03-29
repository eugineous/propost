'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

interface DailyMetric {
  date: string
  platform: string
  followers: number
  impressions: number
  engagementRate: number
  postsPublished: number
}

interface AnalyticsData {
  metrics: DailyMetric[]
  xFollowers: number
  xImpressions: number
  xFollowersGoal: number
  xImpressionsGoal: number
}

const PLATFORM_COLORS: Record<string, string> = {
  x: '#1DA1F2',
  instagram: '#E1306C',
  linkedin: '#0077B5',
  facebook: '#1877F2',
  website: '#22C55E',
}

const X_IMPRESSIONS_GOAL = 5_000_000
const X_FOLLOWERS_GOAL = 500

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then((json) => {
        const platforms = json.platforms ?? []
        const xPlatform = platforms.find((p: { platform: string }) => p.platform === 'x')
        setData({
          metrics: platforms,
          xFollowers: xPlatform?.followers ?? 0,
          xImpressions: xPlatform?.impressions ?? 0,
          xFollowersGoal: X_FOLLOWERS_GOAL,
          xImpressionsGoal: X_IMPRESSIONS_GOAL,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const xFollowersPct = data ? Math.min((data.xFollowers / X_FOLLOWERS_GOAL) * 100, 100) : 0
  const xImpressionsPct = data ? Math.min((data.xImpressions / X_IMPRESSIONS_GOAL) * 100, 100) : 0

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>
            ← PROPOST EMPIRE
          </Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>ANALYTICS</span>
        </div>
        <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>👑 EUGINE MICAH</span>
      </nav>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* X Monetization Progress */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-4" style={{ fontSize: 10 }}>
            X MONETIZATION SPRINT — 90 DAY GOAL
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 10 }}>Impressions</span>
                <span className="font-mono text-pp-x" style={{ fontSize: 10 }}>
                  {data?.xImpressions.toLocaleString() ?? '—'} / {X_IMPRESSIONS_GOAL.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-pp-border rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${xImpressionsPct}%`, background: '#1DA1F2' }}
                />
              </div>
              <div className="text-pp-muted mt-1" style={{ fontSize: 9 }}>
                {xImpressionsPct.toFixed(1)}% complete
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 10 }}>Followers</span>
                <span className="font-mono text-pp-x" style={{ fontSize: 10 }}>
                  {data?.xFollowers.toLocaleString() ?? '—'} / {X_FOLLOWERS_GOAL}
                </span>
              </div>
              <div className="w-full bg-pp-border rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${xFollowersPct}%`, background: '#1DA1F2' }}
                />
              </div>
              <div className="text-pp-muted mt-1" style={{ fontSize: 9 }}>
                {xFollowersPct.toFixed(1)}% complete
              </div>
            </div>
          </div>
        </div>

        {/* Platform Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {(['x', 'instagram', 'linkedin', 'facebook', 'website'] as const).map((platform) => {
            const m = data?.metrics.find((p) => p.platform === platform)
            const color = PLATFORM_COLORS[platform]
            return (
              <div key={platform} className="pixel-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="pixel-text" style={{ fontSize: 7, color }}>
                    {platform.toUpperCase()}
                  </span>
                </div>
                {loading ? (
                  <div className="animate-pulse space-y-1">
                    <div className="h-3 bg-pp-border rounded w-3/4" />
                    <div className="h-3 bg-pp-border rounded w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Followers</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>
                        {m?.followers?.toLocaleString() ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Impressions</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>
                        {m?.impressions?.toLocaleString() ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Engagement</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>
                        {m?.engagementRate != null ? `${Number(m.engagementRate).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Posts</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>
                        {m?.postsPublished ?? '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Followers Chart */}
        {!loading && data && data.metrics.length > 0 && (
          <div className="pixel-card p-4">
            <h3 className="pixel-text text-pp-accent mb-4" style={{ fontSize: 9 }}>
              FOLLOWERS BY PLATFORM
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.metrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E3A" />
                <XAxis dataKey="platform" tick={{ fill: '#64748B', fontSize: 9 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: '#12121F', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 10 }}
                />
                <Bar dataKey="followers" fill="#00F0FF" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-3">
          <Link
            href="/analytics/learnings"
            className="pixel-card px-4 py-2 pixel-text text-pp-gold hover:bg-pp-surface transition-colors"
            style={{ fontSize: 8 }}
          >
            📚 WEEKLY LEARNINGS →
          </Link>
        </div>
      </div>
    </div>
  )
}
