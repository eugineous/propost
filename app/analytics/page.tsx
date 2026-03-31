'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TopPost {
  post_id: string
  value: number
  snapshot_date: string
}

interface GrowthPoint {
  snapshot_date: string
  value: number
}

interface AnalyticsSummary {
  platform: string
  period: string
  topPosts: TopPost[]
  growth: GrowthPoint[]
}

const PLATFORMS = ['x', 'instagram', 'facebook', 'linkedin', 'website']
const PLATFORM_COLOR: Record<string, string> = {
  x: '#1d9bf0', instagram: '#e1306c', facebook: '#1877f2', linkedin: '#0a66c2', website: '#22c55e',
}

export default function AnalyticsPage() {
  const [platform, setPlatform] = useState('x')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/analytics/summary?platform=${platform}&period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
  }, [platform, period])

  const maxGrowth = data?.growth?.length ? Math.max(...data.growth.map((g) => g.value), 1) : 1

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Analytics</h1>
        <div className="ml-auto flex gap-2">
          <div className="flex gap-1">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${platform === p ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                style={platform === p ? { backgroundColor: PLATFORM_COLOR[p] + '33', color: PLATFORM_COLOR[p] } : {}}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2 py-1 rounded text-xs ${period === p ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-gray-600 py-20">Loading analytics...</div>}
      {error && <div className="text-center text-red-400 py-20">{error}</div>}

      {data && !loading && (
        <div className="grid grid-cols-12 gap-4">
          {/* Follower Growth Chart */}
          <div className="col-span-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-4">FOLLOWER GROWTH — {platform.toUpperCase()}</div>
            {data.growth.length === 0 ? (
              <div className="text-xs text-gray-600 py-8 text-center">No growth data yet. Analytics pull runs daily at 02:00 UTC.</div>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {data.growth.map((g, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max(4, (g.value / maxGrowth) * 120)}px`,
                        backgroundColor: PLATFORM_COLOR[platform] ?? '#888',
                        opacity: 0.7,
                      }}
                    />
                    <div className="text-xs text-gray-600 truncate w-full text-center" style={{ fontSize: '9px' }}>
                      {new Date(g.snapshot_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Posts */}
          <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-4">TOP POSTS THIS WEEK</div>
            {data.topPosts.length === 0 ? (
              <div className="text-xs text-gray-600 py-4 text-center">No post data yet.</div>
            ) : (
              <div className="space-y-3">
                {data.topPosts.map((post, i) => (
                  <div key={post.post_id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-300 truncate">{post.post_id}</div>
                      <div className="text-xs font-bold" style={{ color: PLATFORM_COLOR[platform] }}>
                        {post.value.toLocaleString()} engagements
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="col-span-12 grid grid-cols-4 gap-3">
            {[
              { label: 'Total Growth Points', value: data.growth.length },
              { label: 'Top Post Engagements', value: data.topPosts[0]?.value?.toLocaleString() ?? '—' },
              { label: 'Platform', value: platform.toUpperCase() },
              { label: 'Period', value: period },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className="text-xl font-bold" style={{ color: PLATFORM_COLOR[platform] }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
