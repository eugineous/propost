'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts'

type Range = '1' | '7' | '30'

interface Metric {
  date: string
  platform: string
  followers: number | null
  impressions: number | null
  engagementRate: string | null
  postsPublished: number | null
}

interface AgentActivity {
  agentName: string
  company: string
  count: number
}

interface TopPost {
  id: string
  platform: string
  content: string
  impressions: number
  likes: number
  reposts: number
  publishedAt: string | null
}

interface BrandDeal {
  id: string
  brandName: string
  stage: string
  estimatedValue: number
  createdAt: string | null
}

interface TrendItem {
  id: string
  text: string
  relevance: number
  actioned: boolean | null
  detectedAt: string | null
}

interface SummaryData {
  ok: boolean
  range: number
  totalActions: number
  metrics: Metric[]
  agentActivity: AgentActivity[]
  topPosts: TopPost[]
  brandDeals: BrandDeal[]
  trends: TrendItem[]
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  x: '#1DA1F2',
  linkedin: '#0077B5',
  website: '#22C55E',
}

const COMPANY_COLORS: Record<string, string> = {
  xforce: '#1DA1F2',
  gramgod: '#E1306C',
  linkedelite: '#0077B5',
  pagepower: '#1877F2',
  webboss: '#22C55E',
  intelcore: '#FFD700',
  hrforce: '#F97316',
  legalshield: '#EF4444',
  financedesk: '#10B981',
}

const DEAL_STAGES = ['incoming', 'screening', 'negotiating', 'agreed', 'closed']

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('7')
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [igLive, setIgLive] = useState<{ ok: boolean; account?: { username: string; followers: number; mediaCount: number }; dmsPending?: number } | null>(null)

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true)
    try {
      const [summaryRes, igRes] = await Promise.all([
        fetch(`/api/analytics/summary?range=${r}`),
        fetch('/api/monitor/ig-live'),
      ])
      const summary = await summaryRes.json() as SummaryData
      const ig = await igRes.json() as typeof igLive
      setData(summary)
      setIgLive(ig)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(range)
  }, [range, fetchData])

  const exportData = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propost-analytics-${range}d-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Build follower growth chart data
  const followerChartData = data?.metrics
    .filter((m) => m.followers != null)
    .reduce<Record<string, Record<string, unknown>>>((acc, m) => {
      const date = m.date
      if (!acc[date]) acc[date] = { date: date.slice(5) }
      acc[date][m.platform] = m.followers ?? 0
      return acc
    }, {})
  const followerData = followerChartData ? Object.values(followerChartData) : []

  // Agent activity bar chart
  const agentChartData = (data?.agentActivity ?? []).slice(0, 10).map((a) => ({
    name: a.agentName.toUpperCase().slice(0, 8),
    actions: a.count,
    company: a.company,
  }))

  // Brand deal funnel
  const funnelData = DEAL_STAGES.map((stage) => ({
    name: stage.toUpperCase(),
    value: (data?.brandDeals ?? []).filter((d) => d.stage === stage).length,
    fill: stage === 'closed' ? '#FFD700' : stage === 'agreed' ? '#22C55E' : stage === 'negotiating' ? '#F59E0B' : stage === 'screening' ? '#3B82F6' : '#64748B',
  }))

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>📊 ANALYTICS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['1', '7', '30'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2 py-1 rounded pixel-text"
                style={{
                  fontSize: 7,
                  background: range === r ? '#FFD700' : '#1E1E3A',
                  color: range === r ? '#0A0A14' : '#94A3B8',
                }}
              >
                {r === '1' ? 'TODAY' : r === '7' ? '7 DAYS' : '30 DAYS'}
              </button>
            ))}
          </div>
          <button
            onClick={exportData}
            disabled={!data}
            className="px-2 py-1 rounded pixel-text"
            style={{ fontSize: 7, background: '#1E1E3A', color: '#00F0FF', border: '1px solid #00F0FF44' }}
          >
            ⬇ EXPORT JSON
          </button>
          <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>👑 EUGINE MICAH</span>
        </div>
      </nav>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Platform performance cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Instagram live card */}
          <div className="pixel-card p-3" style={{ border: '1px solid #E1306C44' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#E1306C' }} />
              <span className="pixel-text" style={{ fontSize: 7, color: '#E1306C' }}>INSTAGRAM (LIVE)</span>
            </div>
            {igLive?.ok && igLive.account ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-pp-muted" style={{ fontSize: 9 }}>@{igLive.account.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pp-muted" style={{ fontSize: 9 }}>Followers</span>
                  <span className="font-mono" style={{ fontSize: 9 }}>{igLive.account.followers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pp-muted" style={{ fontSize: 9 }}>Posts</span>
                  <span className="font-mono" style={{ fontSize: 9 }}>{igLive.account.mediaCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pp-muted" style={{ fontSize: 9 }}>DMs Pending</span>
                  <span className="font-mono" style={{ fontSize: 9, color: '#F59E0B' }}>{igLive.dmsPending ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-pp-muted" style={{ fontSize: 8 }}>
                {igLive?.ok === false ? 'API unavailable' : 'Loading...'}
              </div>
            )}
          </div>

          {/* DB metrics cards */}
          {(['facebook', 'x', 'linkedin'] as const).map((platform) => {
            const m = data?.metrics.find((p) => p.platform === platform)
            const color = PLATFORM_COLORS[platform]
            return (
              <div key={platform} className="pixel-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="pixel-text" style={{ fontSize: 7, color }}>{platform.toUpperCase()}</span>
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
                      <span className="font-mono" style={{ fontSize: 9 }}>{m?.followers?.toLocaleString() ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Impressions</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>{m?.impressions?.toLocaleString() ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pp-muted" style={{ fontSize: 9 }}>Engagement</span>
                      <span className="font-mono" style={{ fontSize: 9 }}>
                        {m?.engagementRate != null ? `${Number(m.engagementRate).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Total actions badge */}
        {data && (
          <div className="flex items-center gap-4">
            <div className="pixel-card px-4 py-2 flex items-center gap-2">
              <span className="text-pp-muted" style={{ fontSize: 9 }}>Total Agent Actions ({range === '1' ? 'Today' : `${range} days`}):</span>
              <span className="font-mono text-pp-gold" style={{ fontSize: 12 }}>{data.totalActions.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Follower growth chart */}
          <div className="pixel-card p-4">
            <h3 className="pixel-text text-pp-accent mb-4" style={{ fontSize: 9 }}>FOLLOWER GROWTH BY PLATFORM</h3>
            {loading ? (
              <div className="animate-pulse h-40 bg-pp-border rounded" />
            ) : followerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={followerData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E3A" />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 8 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 8 }} />
                  <Tooltip contentStyle={{ background: '#12121F', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 9 }} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  {(['instagram', 'facebook', 'x', 'linkedin'] as const).map((p) => (
                    <Line key={p} type="monotone" dataKey={p} stroke={PLATFORM_COLORS[p]} strokeWidth={1.5} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-pp-muted" style={{ fontSize: 9 }}>
                No follower data for this period
              </div>
            )}
          </div>

          {/* Agent activity chart */}
          <div className="pixel-card p-4">
            <h3 className="pixel-text text-pp-accent mb-4" style={{ fontSize: 9 }}>TOP AGENT ACTIVITY</h3>
            {loading ? (
              <div className="animate-pulse h-40 bg-pp-border rounded" />
            ) : agentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E3A" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 7 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 8 }} />
                  <Tooltip
                    contentStyle={{ background: '#12121F', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 9 }}
                    formatter={(value, name, props) => [value, props.payload.name]}
                  />
                  <Bar
                    dataKey="actions"
                    radius={[2, 2, 0, 0]}
                    fill="#00F0FF"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-pp-muted" style={{ fontSize: 9 }}>
                No agent activity data
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top performing content */}
          <div className="pixel-card p-4">
            <h3 className="pixel-text text-pp-accent mb-3" style={{ fontSize: 9 }}>TOP PERFORMING CONTENT</h3>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-pp-border rounded" />)}
              </div>
            ) : (data?.topPosts ?? []).length > 0 ? (
              <div className="space-y-2">
                {(data?.topPosts ?? []).map((post, i) => (
                  <div key={post.id} className="flex items-start gap-2 p-2 rounded" style={{ background: '#0A0A14' }}>
                    <span className="font-mono" style={{ fontSize: 9, color: '#FFD700', minWidth: 16 }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[post.platform] ?? '#64748B' }} />
                        <span className="font-mono" style={{ fontSize: 7, color: PLATFORM_COLORS[post.platform] }}>{post.platform}</span>
                        <span className="font-mono ml-auto" style={{ fontSize: 7, color: '#64748B' }}>
                          {post.impressions.toLocaleString()} impr
                        </span>
                      </div>
                      <p style={{ fontSize: 8, color: '#94A3B8' }}>{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-pp-muted text-center py-4" style={{ fontSize: 9 }}>No posts data</div>
            )}
          </div>

          {/* Brand deal funnel */}
          <div className="pixel-card p-4">
            <h3 className="pixel-text text-pp-accent mb-3" style={{ fontSize: 9 }}>BRAND DEAL FUNNEL</h3>
            {loading ? (
              <div className="animate-pulse h-40 bg-pp-border rounded" />
            ) : (data?.brandDeals ?? []).length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <FunnelChart>
                    <Tooltip contentStyle={{ background: '#12121F', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 9 }} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="#E2E8F0" stroke="none" dataKey="name" style={{ fontSize: 8 }} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="mt-2 text-center font-mono" style={{ fontSize: 9, color: '#FFD700' }}>
                  Total Pipeline: KES {(data?.brandDeals ?? []).reduce((s, d) => s + d.estimatedValue, 0).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-pp-muted text-center py-4" style={{ fontSize: 9 }}>No brand deals yet</div>
            )}
          </div>
        </div>

        {/* Trend performance */}
        <div className="pixel-card p-4">
          <h3 className="pixel-text text-pp-accent mb-3" style={{ fontSize: 9 }}>TREND PERFORMANCE</h3>
          {loading ? (
            <div className="animate-pulse h-20 bg-pp-border rounded" />
          ) : (data?.trends ?? []).length > 0 ? (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {(data?.trends ?? []).map((t) => (
                <div key={t.id} className="p-2 rounded" style={{ background: '#0A0A14', border: '1px solid #1E1E3A' }}>
                  <div className="font-mono" style={{ fontSize: 8, color: '#E2E8F0' }}>{t.text}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono" style={{ fontSize: 7, color: '#64748B' }}>
                      {(t.relevance * 100).toFixed(0)}% rel
                    </span>
                    <span
                      className="px-1 rounded"
                      style={{
                        fontSize: 6,
                        background: t.actioned ? '#22C55E22' : '#F59E0B22',
                        color: t.actioned ? '#22C55E' : '#F59E0B',
                      }}
                    >
                      {t.actioned ? 'ACTIONED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-pp-muted text-center py-4" style={{ fontSize: 9 }}>No trend data</div>
          )}
        </div>

        {/* Quick links */}
        <div className="flex gap-3">
          <Link
            href="/analytics/learnings"
            className="pixel-card px-4 py-2 pixel-text text-pp-gold hover:bg-pp-surface transition-colors"
            style={{ fontSize: 8 }}
          >
            📚 WEEKLY LEARNINGS →
          </Link>
          <Link
            href="/brand-deals"
            className="pixel-card px-4 py-2 pixel-text text-pp-gold hover:bg-pp-surface transition-colors"
            style={{ fontSize: 8 }}
          >
            💰 BRAND DEALS PIPELINE →
          </Link>
        </div>
      </div>
    </div>
  )
}
