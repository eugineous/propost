'use client'

import { useEffect, useState } from 'react'

interface PlatformMetrics {
  platform: string
  followers: number
  impressions: number
  engagementRate: number
  postsPublished: number
}

interface MetricsData {
  platforms: PlatformMetrics[]
  xImpressionsToday: number
  goalCompletionPct: number
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  x: { label: 'X', color: '#1DA1F2', icon: '𝕏' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: '📸' },
  linkedin: { label: 'LinkedIn', color: '#0077B5', icon: '💼' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: '👥' },
  website: { label: 'Website', color: '#22C55E', icon: '🌐' },
}

const X_IMPRESSIONS_GOAL = 5_000_000

function SkeletonRow() {
  return (
    <div className="animate-pulse space-y-1 mb-3">
      <div className="h-3 bg-pp-border rounded w-3/4" />
      <div className="h-2 bg-pp-border rounded w-1/2" />
    </div>
  )
}

export default function MetricsPanel() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silently fail — keep showing last data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60_000)
    return () => clearInterval(interval)
  }, [])

  const xMetrics = data?.platforms.find((p) => p.platform === 'x')
  const xImpressions = xMetrics?.impressions ?? data?.xImpressionsToday ?? 0
  const xProgressPct = Math.min((xImpressions / X_IMPRESSIONS_GOAL) * 100, 100)

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto p-3">
      <h2 className="pixel-text text-pp-gold text-xs">LIVE METRICS</h2>

      {loading ? (
        <>
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </>
      ) : (
        <>
          {/* Per-platform metrics */}
          {(['x', 'instagram', 'linkedin', 'facebook', 'website'] as const).map((key) => {
            const cfg = PLATFORM_CONFIG[key]
            const m = data?.platforms.find((p) => p.platform === key)
            return (
              <div key={key} className="pixel-card p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cfg.color }}
                  />
                  <span className="pixel-text text-pp-text" style={{ fontSize: 7 }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="space-y-0.5 pl-4">
                  <div className="flex justify-between">
                    <span className="text-pp-muted" style={{ fontSize: 9 }}>Followers</span>
                    <span className="text-pp-text font-mono" style={{ fontSize: 9 }}>
                      {m ? m.followers.toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pp-muted" style={{ fontSize: 9 }}>Impressions</span>
                    <span className="text-pp-text font-mono" style={{ fontSize: 9 }}>
                      {m ? m.impressions.toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pp-muted" style={{ fontSize: 9 }}>Engagement</span>
                    <span className="text-pp-text font-mono" style={{ fontSize: 9 }}>
                      {m ? `${m.engagementRate.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* X Monetization Progress */}
          <div className="pixel-card p-2">
            <div className="pixel-text text-pp-gold mb-2" style={{ fontSize: 7 }}>
              X MONETIZATION
            </div>
            <div className="text-pp-muted mb-1" style={{ fontSize: 9 }}>
              Impressions to 5M
            </div>
            <div className="w-full bg-pp-border rounded-full h-2 mb-1">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${xProgressPct}%`, background: '#1DA1F2' }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                {xImpressions.toLocaleString()}
              </span>
              <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                {X_IMPRESSIONS_GOAL.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Today's Goal */}
          <div className="pixel-card p-2">
            <div className="pixel-text text-pp-accent mb-1" style={{ fontSize: 7 }}>
              TODAY&apos;S GOAL
            </div>
            <div className="w-full bg-pp-border rounded-full h-2 mb-1">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${data?.goalCompletionPct ?? 0}%`,
                  background: '#00F0FF',
                }}
              />
            </div>
            <div className="text-pp-text font-mono text-right" style={{ fontSize: 9 }}>
              {data?.goalCompletionPct ?? 0}%
            </div>
          </div>
        </>
      )}
    </div>
  )
}
