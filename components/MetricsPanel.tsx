'use client'

import { useCallback, useEffect, useState } from 'react'

type ApiPlatform = {
  platform: string
  status: 'ok' | 'stale' | 'no_data' | 'not_connected'
  followers: number | null
  impressions: number | null
  engagementRate: number | null
  postsPublished: number | null
  date: string | null
  lastSyncedAt: string | null
}

type MetricsResponse = {
  platforms: ApiPlatform[]
  xImpressionsToday: number
  goalCompletionPct: number
}

const META: Record<string, { label: string; icon: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C' },
  x: { label: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: '#0077B5' },
  facebook: { label: 'Facebook', icon: '👥', color: '#1877F2' },
}

function statusColor(status: ApiPlatform['status']) {
  if (status === 'ok') return '#22C55E'
  if (status === 'stale') return '#F59E0B'
  if (status === 'no_data') return '#64748B'
  return '#EF4444'
}

function statusLabel(status: ApiPlatform['status']) {
  if (status === 'ok') return '● LIVE'
  if (status === 'stale') return '○ STALE'
  if (status === 'no_data') return '○ NO DATA'
  return '✗ DISCONNECTED'
}

export default function MetricsPanel() {
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [syncing, setSyncing] = useState(false)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`)
      const json = (await res.json()) as MetricsResponse
      setData(json)
      setLastUpdated(new Date().toLocaleTimeString('en-KE'))
    } catch (err) {
      console.error('[MetricsPanel]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    // Poll every 30 seconds for near-real-time updates
    const iv = setInterval(fetchMetrics, 30_000)
    return () => clearInterval(iv)
  }, [fetchMetrics])

  const handleSyncNow = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const cronSecret = ''  // server-side, will work if CRON_SECRET not required
      await fetch('/api/cron/metrics-sync', {
        headers: { 'x-cron-secret': cronSecret },
      })
      await new Promise(r => setTimeout(r, 2000))
      await fetchMetrics()
    } finally {
      setSyncing(false)
    }
  }

  const fmt = (n: number | null) => {
    if (n === null) return '—'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return `${n}`
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-3 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="pixel-text text-pp-gold" style={{ fontSize: 8 }}>LIVE METRICS</h2>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 7, color: '#64748B', fontFamily: 'monospace' }}>{lastUpdated}</span>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="rounded px-1.5 py-0.5 disabled:opacity-50"
            style={{ fontSize: 7, background: '#1E1E3A', color: '#94A3B8', border: '1px solid #334155', cursor: 'pointer' }}
            title="Force sync metrics from all platforms"
          >
            {syncing ? '⟳ syncing' : '↻ sync'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded p-2" style={{ background: '#12121F', height: 70 }} />
          ))}
        </div>
      ) : (
        data?.platforms.map((p) => {
          const meta = META[p.platform] ?? { label: p.platform, icon: '•', color: '#64748B' }
          return (
            <div key={p.platform} className="rounded p-2" style={{ background: '#12121F', border: `1px solid ${meta.color}33` }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 12 }}>{meta.icon}</span>
                <span style={{ fontSize: 8, color: meta.color, fontFamily: '"Press Start 2P", monospace' }}>{meta.label}</span>
                <span className="ml-auto rounded px-1" style={{ background: '#1E1E3A', color: statusColor(p.status), fontSize: 7, fontFamily: 'monospace' }}>
                  {statusLabel(p.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div className="flex justify-between">
                  <span style={{ fontSize: 8, color: '#64748B' }}>Followers</span>
                  <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.followers)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 8, color: '#64748B' }}>Posts</span>
                  <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.postsPublished)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 8, color: '#64748B' }}>Engagement</span>
                  <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>
                    {p.engagementRate === null ? '—' : `${(p.engagementRate * 100).toFixed(2)}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 8, color: '#64748B' }}>Impressions</span>
                  <span style={{ fontSize: 8, color: '#E2E8F0', fontFamily: 'monospace' }}>{fmt(p.impressions)}</span>
                </div>
              </div>
              {p.lastSyncedAt && (
                <div style={{ fontSize: 7, color: '#334155', fontFamily: 'monospace', marginTop: 4 }}>
                  synced {new Date(p.lastSyncedAt).toLocaleTimeString('en-KE')}
                </div>
              )}
              {p.status === 'not_connected' && (
                <div style={{ fontSize: 7, color: '#EF4444', fontFamily: 'monospace', marginTop: 4 }}>
                  Set env var in Vercel to connect
                </div>
              )}
            </div>
          )
        })
      )}

      <div className="rounded p-2" style={{ background: '#12121F', border: '1px solid #1DA1F233' }}>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 7, color: '#1DA1F2', fontFamily: '"Press Start 2P", monospace' }}>X MONETIZATION</span>
          <span style={{ fontSize: 7, color: '#64748B', fontFamily: 'monospace' }}>5M goal</span>
        </div>
        <div className="w-full rounded-full h-2 mb-1" style={{ background: '#1E1E3A' }}>
          <div className="h-2 rounded-full" style={{ width: `${data?.goalCompletionPct ?? 0}%`, background: '#1DA1F2', minWidth: 2 }} />
        </div>
        <div className="flex justify-between">
          <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>{(data?.xImpressionsToday ?? 0).toLocaleString()}</span>
          <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>{(5_000_000).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
