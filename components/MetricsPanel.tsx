'use client'

import { useEffect, useState, useCallback } from 'react'

interface PlatformData {
  platform: string
  label: string
  icon: string
  color: string
  followers: number | null
  impressions: number | null
  engagement: number | null
  posts: number | null
  dms: number | null
  error?: string
}

interface LiveMetrics {
  platforms: PlatformData[]
  xImpressionsToday: number
  goalPct: number
  actionsToday: number
  postsToday: number
  trendsToday: number
  lastUpdated: string
}

const X_GOAL = 5_000_000

export default function MetricsPanel() {
  const [data, setData] = useState<LiveMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPulse, setLastPulse] = useState(0)

  const fetchAll = useCallback(async () => {
    setLastPulse(Date.now())
    try {
      // Fetch live data from all sources in parallel
      const [igRes, monRes] = await Promise.allSettled([
        fetch('/api/monitor/ig-live'),
        fetch('/api/monitor/live'),
      ])

      const ig = igRes.status === 'fulfilled' && igRes.value.ok
        ? await igRes.value.json() as { ok: boolean; followers?: number; mediaCount?: number; username?: string; dmCount?: number; recentPosts?: Array<{ likes: number; comments: number }> }
        : null

      const mon = monRes.status === 'fulfilled' && monRes.value.ok
        ? await monRes.value.json() as { ok: boolean; totalActionsToday?: number; postsToday?: number; trendsToday?: number }
        : null

      // Calculate Instagram engagement from recent posts
      let igEngagement: number | null = null
      if (ig?.recentPosts && ig.recentPosts.length > 0) {
        const totalEng = ig.recentPosts.reduce((s: number, p: { likes: number; comments: number }) => s + p.likes + p.comments, 0)
        igEngagement = ig.followers ? (totalEng / ig.recentPosts.length / ig.followers) * 100 : null
      }

      const platforms: PlatformData[] = [
        {
          platform: 'instagram',
          label: 'Instagram',
          icon: '📸',
          color: '#E1306C',
          followers: ig?.followers ?? null,
          impressions: ig?.mediaCount ?? null,
          engagement: igEngagement,
          posts: ig?.mediaCount ?? null,
          dms: ig?.dmCount ?? null,
        },
        {
          platform: 'x',
          label: 'X / Twitter',
          icon: '𝕏',
          color: '#1DA1F2',
          followers: null,
          impressions: null,
          engagement: null,
          posts: mon?.postsToday ?? null,
          dms: null,
        },
        {
          platform: 'linkedin',
          label: 'LinkedIn',
          icon: '💼',
          color: '#0077B5',
          followers: null,
          impressions: null,
          engagement: null,
          posts: null,
          dms: null,
        },
        {
          platform: 'facebook',
          label: 'Facebook',
          icon: '👥',
          color: '#1877F2',
          followers: null,
          impressions: null,
          engagement: null,
          posts: null,
          dms: null,
        },
      ]

      setData({
        platforms,
        xImpressionsToday: 0,
        goalPct: 0,
        actionsToday: mon?.totalActionsToday ?? 0,
        postsToday: mon?.postsToday ?? 0,
        trendsToday: mon?.trendsToday ?? 0,
        lastUpdated: new Date().toLocaleTimeString('en-KE'),
      })
    } catch (err) {
      console.error('[MetricsPanel]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const iv = setInterval(fetchAll, 60_000)
    return () => clearInterval(iv)
  }, [fetchAll])

  const fmt = (n: number | null, suffix = '') => {
    if (n === null) return <span style={{ color: '#64748B' }}>—</span>
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K${suffix}`
    return `${n}${suffix}`
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="pixel-text text-pp-gold" style={{ fontSize: 8 }}>LIVE METRICS</h2>
        <div className="flex items-center gap-1">
          <span
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: loading ? '#F59E0B' : '#22C55E',
              display: 'inline-block',
              boxShadow: loading ? '0 0 4px #F59E0B' : '0 0 4px #22C55E',
            }}
          />
          <span style={{ fontSize: 7, color: '#64748B', fontFamily: 'monospace' }}>
            {data?.lastUpdated ?? 'loading...'}
          </span>
        </div>
      </div>

      {/* Today's stats bar */}
      {data && (
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Actions', value: data.actionsToday, color: '#FFD700' },
            { label: 'Posts', value: data.postsToday, color: '#E1306C' },
            { label: 'Trends', value: data.trendsToday, color: '#00F0FF' },
          ].map(s => (
            <div key={s.label} className="rounded p-1 text-center" style={{ background: '#12121F', border: `1px solid ${s.color}33` }}>
              <div style={{ fontSize: 12, color: s.color, fontFamily: 'monospace', fontWeight: 'bold' }}>{s.value}</div>
              <div style={{ fontSize: 7, color: '#64748B' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Platform cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded p-2" style={{ background: '#12121F', height: 70 }} />
          ))}
        </div>
      ) : (
        data?.platforms.map(p => (
          <div key={p.platform} className="rounded p-2" style={{ background: '#12121F', border: `1px solid ${p.color}33` }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 12 }}>{p.icon}</span>
              <span style={{ fontSize: 8, color: p.color, fontFamily: '"Press Start 2P", monospace' }}>{p.label}</span>
              {p.dms !== null && p.dms > 0 && (
                <span className="ml-auto rounded px-1" style={{ background: '#EF444433', color: '#EF4444', fontSize: 7, fontFamily: 'monospace' }}>
                  {p.dms} DMs
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <div className="flex justify-between">
                <span style={{ fontSize: 8, color: '#64748B' }}>Followers</span>
                <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.followers)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 8, color: '#64748B' }}>Posts</span>
                <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.posts)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 8, color: '#64748B' }}>Engagement</span>
                <span style={{ fontSize: 8, color: p.engagement ? '#22C55E' : '#64748B', fontFamily: 'monospace' }}>
                  {p.engagement !== null ? `${p.engagement.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 8, color: '#64748B' }}>Impressions</span>
                <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.impressions)}</span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* X Monetization */}
      <div className="rounded p-2" style={{ background: '#12121F', border: '1px solid #1DA1F233' }}>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 7, color: '#1DA1F2', fontFamily: '"Press Start 2P", monospace' }}>X MONETIZATION</span>
          <span style={{ fontSize: 7, color: '#64748B', fontFamily: 'monospace' }}>5M goal</span>
        </div>
        <div className="w-full rounded-full h-2 mb-1" style={{ background: '#1E1E3A' }}>
          <div className="h-2 rounded-full" style={{ width: `${data?.goalPct ?? 0}%`, background: '#1DA1F2', minWidth: 2 }} />
        </div>
        <div className="flex justify-between">
          <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>{(data?.xImpressionsToday ?? 0).toLocaleString()}</span>
          <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>{X_GOAL.toLocaleString()}</span>
        </div>
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchAll}
        className="w-full rounded py-1"
        style={{ background: '#1E1E3A', border: '1px solid #1E1E3A', color: '#64748B', fontSize: 8, fontFamily: 'monospace', cursor: 'pointer' }}
      >
        ↻ Refresh ({data?.lastUpdated ?? '—'})
      </button>
    </div>
  )
}
