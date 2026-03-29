'use client'

import { useState, useEffect, useCallback } from 'react'

type Platform = 'x' | 'instagram' | 'linkedin' | 'facebook'
type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'blocked' | 'failed'

interface ContentItem {
  id: string
  platform: Platform
  content: string
  mediaUrl?: string
  status: ContentStatus
  contentType?: string
  scheduledAt?: string
  publishedAt?: string
  performanceScore?: number
  agentName?: string
  hawkApproved?: boolean
  hawkRiskScore?: number
  blockedReason?: string
  createdAt: string
}

const PLATFORM_ICONS: Record<Platform, string> = {
  x: '𝕏',
  instagram: '📸',
  linkedin: '💼',
  facebook: '📘',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  x: '#1DA1F2',
  instagram: '#E1306C',
  linkedin: '#0077B5',
  facebook: '#1877F2',
}

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: '#FBBF24',
  approved: '#22C55E',
  scheduled: '#818CF8',
  published: '#64748B',
  blocked: '#EF4444',
  failed: '#F97316',
}

const MOCK_CONTENT: ContentItem[] = [
  { id: '1', platform: 'x', content: 'The Nairobi startup scene is moving faster than anyone expected. Here\'s what I\'ve seen in the last 6 months 🧵', status: 'draft', contentType: 'thread', agentName: 'blaze', createdAt: new Date().toISOString(), performanceScore: 0 },
  { id: '2', platform: 'instagram', content: 'Behind the scenes at PPP TV. This is what building a media empire looks like at 6AM. ☀️ #Nairobi #MediaLife', status: 'approved', contentType: 'feed_post', agentName: 'aurora', createdAt: new Date(Date.now() - 3600000).toISOString(), performanceScore: 82 },
  { id: '3', platform: 'linkedin', content: 'I failed my first business at 23. Here\'s the 5 lessons that turned that failure into the foundation of everything I\'ve built since.', status: 'scheduled', contentType: 'post', scheduledAt: new Date(Date.now() + 7200000).toISOString(), agentName: 'nova', createdAt: new Date(Date.now() - 7200000).toISOString(), performanceScore: 0 },
  { id: '4', platform: 'facebook', content: 'New episode of The Nairobi Podcast is LIVE. We\'re talking about the future of digital media in Kenya. Link in bio!', status: 'published', contentType: 'post', publishedAt: new Date(Date.now() - 86400000).toISOString(), agentName: 'chief', createdAt: new Date(Date.now() - 90000000).toISOString(), performanceScore: 67 },
  { id: '5', platform: 'x', content: 'Unpopular opinion: Most Kenyan brands are still sleeping on creator partnerships. The ROI is 10x better than traditional ads.', status: 'draft', contentType: 'hot_take', agentName: 'flint', createdAt: new Date(Date.now() - 1800000).toISOString(), performanceScore: 0 },
  { id: '6', platform: 'instagram', content: 'Reels idea: "A day in the life of a Nairobi media entrepreneur" — raw, unfiltered, real.', status: 'draft', contentType: 'reel', agentName: 'reel', createdAt: new Date(Date.now() - 5400000).toISOString(), performanceScore: 0 },
]

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (item: Partial<ContentItem>) => void }) {
  const [platform, setPlatform] = useState<Platform>('x')
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, mediaUrl: mediaUrl || undefined, scheduledAt: scheduledAt || undefined }),
      })
      const json = await res.json() as { ok: boolean; item?: ContentItem }
      if (json.ok && json.item) {
        onCreate(json.item)
      } else {
        onCreate({ id: Date.now().toString(), platform, content, mediaUrl: mediaUrl || undefined, scheduledAt: scheduledAt || undefined, status: 'draft', createdAt: new Date().toISOString() })
      }
    } catch {
      onCreate({ id: Date.now().toString(), platform, content, mediaUrl: mediaUrl || undefined, scheduledAt: scheduledAt || undefined, status: 'draft', createdAt: new Date().toISOString() })
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg p-6 w-full max-w-lg" style={{ background: '#1A1A2E', border: '1px solid #2D2D4A' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="pixel-text text-pp-gold" style={{ fontSize: 11 }}>CREATE NEW CONTENT</span>
          <button onClick={onClose} style={{ color: '#64748B', fontSize: 16 }}>✕</button>
        </div>

        <div className="mb-4">
          <label className="block mb-1" style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>PLATFORM</label>
          <div className="flex gap-2">
            {(['x', 'instagram', 'linkedin', 'facebook'] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className="px-3 py-1.5 rounded transition-all"
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  background: platform === p ? PLATFORM_COLORS[p] + '33' : '#12121F',
                  border: `1px solid ${platform === p ? PLATFORM_COLORS[p] : '#2D2D4A'}`,
                  color: platform === p ? PLATFORM_COLORS[p] : '#64748B',
                }}
              >
                {PLATFORM_ICONS[p]} {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1" style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>CONTENT</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="Write your content here..."
            className="w-full rounded p-3 resize-none"
            style={{ background: '#12121F', border: '1px solid #2D2D4A', color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace', textAlign: 'right' }}>{content.length} chars</div>
        </div>

        <div className="mb-4">
          <label className="block mb-1" style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>MEDIA URL (optional)</label>
          <input
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded p-2"
            style={{ background: '#12121F', border: '1px solid #2D2D4A', color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1" style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>SCHEDULE (optional)</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded p-2"
            style={{ background: '#12121F', border: '1px solid #2D2D4A', color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded" style={{ background: '#12121F', border: '1px solid #2D2D4A', color: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}>
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="px-4 py-2 rounded"
            style={{ background: '#FFD700', color: '#0A0A14', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, opacity: loading || !content.trim() ? 0.5 : 1 }}
          >
            {loading ? 'SAVING...' : 'CREATE DRAFT'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RepurposeModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRepurpose = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: item.content, sourcePlatform: item.platform }),
      })
      const json = await res.json() as { ok: boolean; versions?: Record<string, string> }
      if (json.ok && json.versions) setResults(json.versions)
    } catch {
      setResults({ error: 'Failed to repurpose content' })
    }
    setLoading(false)
  }

  useEffect(() => { handleRepurpose() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto" style={{ background: '#1A1A2E', border: '1px solid #2D2D4A' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="pixel-text text-pp-gold" style={{ fontSize: 11 }}>♻️ REPURPOSE CONTENT</span>
          <button onClick={onClose} style={{ color: '#64748B', fontSize: 16 }}>✕</button>
        </div>

        <div className="mb-4 p-3 rounded" style={{ background: '#12121F', border: '1px solid #2D2D4A' }}>
          <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace', marginBottom: 4 }}>ORIGINAL ({item.platform.toUpperCase()})</div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{item.content.slice(0, 150)}...</div>
        </div>

        {loading && (
          <div className="text-center py-8" style={{ color: '#FFD700', fontSize: 10, fontFamily: 'monospace' }}>
            🤖 Gemini is adapting your content for all platforms...
          </div>
        )}

        {results && !loading && (
          <div className="space-y-3">
            {Object.entries(results).map(([platform, text]) => (
              <div key={platform} className="p-3 rounded" style={{ background: '#12121F', border: `1px solid ${PLATFORM_COLORS[platform as Platform] ?? '#2D2D4A'}33` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 14 }}>{PLATFORM_ICONS[platform as Platform] ?? '📄'}</span>
                  <span style={{ fontSize: 9, color: PLATFORM_COLORS[platform as Platform] ?? '#94A3B8', fontFamily: 'monospace', fontWeight: 700 }}>{platform.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'monospace', lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded" style={{ background: '#FFD700', color: '#0A0A14', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>(MOCK_CONTENT)
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [repurposeItem, setRepurposeItem] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [seedingEmergency, setSeedingEmergency] = useState(false)
  const [governing, setGoverning] = useState(false)
  const [scheduling, setScheduling] = useState<Record<string, boolean>>({})
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({})

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content')
      const json = await res.json() as { ok: boolean; items?: ContentItem[] }
      if (json.ok && json.items && json.items.length > 0) setItems(json.items)
    } catch {
      // keep mock data
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  const filtered = items.filter(item => {
    if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (search && !item.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleApprove = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' as ContentStatus } : i))
    try {
      const res = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      })
      const json = await res.json() as { ok: boolean; item?: any }
      if (json.ok && json.item) {
        await fetchContent()
      } else {
        await fetchContent()
      }
    } catch {
      // keep optimistic UI
    }
  }

  const handleReject = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch(`/api/content?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      // keep optimistic UI
    }
  }

  const handleSchedule = async (id: string) => {
    const value = scheduleInputs[id]
    if (!value) return
    setScheduling((s) => ({ ...s, [id]: true }))
    try {
      await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'schedule', scheduledAt: value }),
      })
      await fetchContent()
    } finally {
      setScheduling((s) => ({ ...s, [id]: false }))
    }
  }

  const handleCreate = (item: Partial<ContentItem>) => {
    setItems(prev => [{ ...item, id: item.id ?? Date.now().toString(), status: 'draft', createdAt: new Date().toISOString() } as ContentItem, ...prev])
  }

  const draftCount = items.filter(i => i.status === 'draft').length
  const emergencyCount = items.filter(i => i.contentType === 'emergency').length

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ background: '#12121F', borderColor: '#2D2D4A' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" style={{ color: '#64748B', fontSize: 10, fontFamily: 'monospace' }}>← EMPIRE</a>
            <span className="pixel-text text-pp-gold" style={{ fontSize: 13 }}>📝 CONTENT LIBRARY</span>
            {draftCount > 0 && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#FBBF2422', color: '#FBBF24', fontSize: 9, fontFamily: 'monospace', border: '1px solid #FBBF2444' }}>
                {draftCount} PENDING APPROVAL
              </span>
            )}
            {emergencyCount > 0 && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#00F0FF22', color: '#00F0FF', fontSize: 9, fontFamily: 'monospace', border: '1px solid #00F0FF44' }}>
                {emergencyCount} EMERGENCY POSTS
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setGoverning(true)
                try {
                  await fetch('/api/content/govern', { method: 'POST' })
                  await fetchContent()
                } finally {
                  setGoverning(false)
                }
              }}
              className="px-3 py-2 rounded"
              style={{ background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
            >
              {governing ? 'GOVERNING...' : '🛡️ AUTO-GOVERN'}
            </button>
            <button
              onClick={async () => {
                setLoading(true)
                try {
                  await fetch('/api/content/calendar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days: 30 }),
                  })
                  await fetchContent()
                } finally {
                  setLoading(false)
                }
              }}
              className="px-3 py-2 rounded"
              style={{ background: '#818CF822', color: '#818CF8', border: '1px solid #818CF844', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
            >
              📅 BUILD 30-DAY CALENDAR
            </button>
            <button
              onClick={async () => {
                setSeedingEmergency(true)
                try {
                  await fetch('/api/content/emergency', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: 50 }),
                  })
                  await fetchContent()
                } finally {
                  setSeedingEmergency(false)
                }
              }}
              className="px-3 py-2 rounded"
              style={{ background: '#00F0FF22', color: '#00F0FF', border: '1px solid #00F0FF44', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
            >
              {seedingEmergency ? 'SEEDING...' : '⚡ EMERGENCY x50'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded"
              style={{ background: '#FFD700', color: '#0A0A14', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
            >
              + CREATE NEW
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b flex items-center gap-4 flex-wrap" style={{ background: '#0D0D1A', borderColor: '#2D2D4A' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search content..."
          className="rounded px-3 py-1.5"
          style={{ background: '#12121F', border: '1px solid #2D2D4A', color: '#E2E8F0', fontSize: 11, fontFamily: 'monospace', width: 220 }}
        />

        {/* Platform filter */}
        <div className="flex items-center gap-1">
          {(['all', 'x', 'instagram', 'linkedin', 'facebook'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className="px-2 py-1 rounded transition-all"
              style={{
                fontSize: 9,
                fontFamily: 'monospace',
                background: filterPlatform === p ? '#FFD70022' : '#12121F',
                border: `1px solid ${filterPlatform === p ? '#FFD700' : '#2D2D4A'}`,
                color: filterPlatform === p ? '#FFD700' : '#64748B',
              }}
            >
              {p === 'all' ? 'ALL' : `${PLATFORM_ICONS[p]} ${p.toUpperCase()}`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(['all', 'draft', 'approved', 'scheduled', 'published'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-2 py-1 rounded transition-all"
              style={{
                fontSize: 9,
                fontFamily: 'monospace',
                background: filterStatus === s ? (s === 'all' ? '#FFD70022' : STATUS_COLORS[s] + '22') : '#12121F',
                border: `1px solid ${filterStatus === s ? (s === 'all' ? '#FFD700' : STATUS_COLORS[s]) : '#2D2D4A'}`,
                color: filterStatus === s ? (s === 'all' ? '#FFD700' : STATUS_COLORS[s]) : '#64748B',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 9, color: '#64748B', fontFamily: 'monospace' }}>
          {loading ? 'Loading...' : `${filtered.length} items`}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filtered.map(item => (
          <div
            key={item.id}
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: '#12121F', border: '1px solid #2D2D4A' }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18, color: PLATFORM_COLORS[item.platform] }}>{PLATFORM_ICONS[item.platform]}</span>
                <span style={{ fontSize: 9, color: PLATFORM_COLORS[item.platform], fontFamily: 'monospace', fontWeight: 700 }}>{item.platform.toUpperCase()}</span>
                {item.contentType && (
                  <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: '#1E1E3A', color: '#818CF8', fontFamily: 'monospace' }}>
                    {item.contentType.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </div>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ fontSize: 8, background: STATUS_COLORS[item.status] + '22', color: STATUS_COLORS[item.status], border: `1px solid ${STATUS_COLORS[item.status]}44`, fontFamily: 'monospace' }}
              >
                {item.status.toUpperCase()}
              </span>
            </div>

            {/* Content preview */}
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', lineHeight: 1.6, minHeight: 60 }}>
              {item.content.slice(0, 140)}{item.content.length > 140 ? '...' : ''}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>
              {item.agentName && <span>🤖 {item.agentName}</span>}
              {item.scheduledAt && <span>⏰ {new Date(item.scheduledAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
              {item.publishedAt && <span>✅ {new Date(item.publishedAt).toLocaleDateString('en-KE')}</span>}
              {item.hawkRiskScore !== undefined && <span style={{ color: item.hawkRiskScore >= 70 ? '#EF4444' : item.hawkRiskScore >= 40 ? '#FBBF24' : '#22C55E' }}>🛡️ risk {item.hawkRiskScore}</span>}
              {item.performanceScore !== undefined && item.performanceScore > 0 && (
                <span style={{ color: item.performanceScore >= 80 ? '#22C55E' : item.performanceScore >= 50 ? '#FBBF24' : '#EF4444' }}>
                  ⚡ {item.performanceScore}
                </span>
              )}
            </div>
            {item.status === 'blocked' && item.blockedReason && (
              <div className="rounded px-2 py-1" style={{ background: '#EF444422', border: '1px solid #EF444444', color: '#FCA5A5', fontSize: 8, fontFamily: 'monospace' }}>
                BLOCKED: {item.blockedReason}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: '#2D2D4A' }}>
              {item.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44', fontSize: 9, fontFamily: 'monospace' }}
                  >
                    ✓ APPROVE
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-2 py-1 rounded"
                    style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444', fontSize: 9, fontFamily: 'monospace' }}
                  >
                    ✕ REJECT
                  </button>
                </>
              )}
              {(item.status === 'approved' || item.status === 'draft') && (
                <>
                  <input
                    type="datetime-local"
                    value={scheduleInputs[item.id] ?? ''}
                    onChange={(e) => setScheduleInputs((v) => ({ ...v, [item.id]: e.target.value }))}
                    className="rounded px-1 py-1"
                    style={{ background: '#0A0A14', border: '1px solid #2D2D4A', color: '#E2E8F0', fontSize: 8, fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => handleSchedule(item.id)}
                    disabled={scheduling[item.id] || !(scheduleInputs[item.id] ?? '').trim()}
                    className="px-2 py-1 rounded disabled:opacity-50"
                    style={{ background: '#818CF822', color: '#818CF8', border: '1px solid #818CF844', fontSize: 9, fontFamily: 'monospace' }}
                  >
                    {scheduling[item.id] ? 'SCHED...' : '⏰ SCHEDULE'}
                  </button>
                </>
              )}
              <button
                onClick={() => setRepurposeItem(item)}
                className="px-2 py-1 rounded ml-auto"
                style={{ background: '#818CF822', color: '#818CF8', border: '1px solid #818CF844', fontSize: 9, fontFamily: 'monospace' }}
              >
                ♻️ REPURPOSE
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16" style={{ color: '#64748B', fontSize: 11, fontFamily: 'monospace' }}>
            No content found. Create your first post!
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {repurposeItem && <RepurposeModal item={repurposeItem} onClose={() => setRepurposeItem(null)} />}
    </div>
  )
}
