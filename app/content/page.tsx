'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ContentItem {
  id: string
  platform: string
  content_pillar: string
  content: string
  status: string
  scheduled_at?: string
  published_at?: string
  created_by: string
}

const PLATFORM_COLOR: Record<string, string> = {
  x: '#1d9bf0', instagram: '#e1306c', facebook: '#1877f2', linkedin: '#0a66c2', website: '#22c55e',
}

const PILLAR_LABELS: Record<string, string> = {
  ai_news: 'AI News', youth_empowerment: 'Youth', trending_topics: 'Trending',
  elite_conversations: 'Elite', kenyan_entertainment: 'Kenya', fashion: 'Fashion',
  media_journalism: 'Media', personal_story: 'Story', entrepreneurship: 'Biz', culture_identity: 'Culture',
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ platform: 'x', contentPillar: 'ai_news', content: '', scheduledAt: '' })

  const fetchItems = () => {
    const from = new Date().toISOString()
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    setLoading(true)
    fetch(`/api/content/calendar?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const addItem = async () => {
    if (!form.content || !form.scheduledAt) return
    await fetch('/api/content/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowAdd(false)
    setForm({ platform: 'x', contentPillar: 'ai_news', content: '', scheduledAt: '' })
    fetchItems()
  }

  // Group by date
  const grouped: Record<string, ContentItem[]> = {}
  for (const item of items) {
    const date = item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : 'Unscheduled'
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(item)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Content Calendar</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="ml-auto px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold"
        >
          + Add Content
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 space-y-3">
          <div className="text-xs text-gray-400 font-bold tracking-wider">NEW CONTENT ITEM</div>
          <div className="grid grid-cols-3 gap-3">
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none">
              {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select value={form.contentPillar} onChange={(e) => setForm({ ...form, contentPillar: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none">
              {Object.entries(PILLAR_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="datetime-local" value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none" />
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Content..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={addItem} className="px-4 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-20">Loading calendar...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center text-gray-600 py-20">No content scheduled. Add some above.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <div className="text-xs text-gray-500 font-bold tracking-wider mb-2 border-b border-gray-800 pb-1">{date}</div>
              <div className="grid grid-cols-4 gap-3">
                {dateItems.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: PLATFORM_COLOR[item.platform] ?? '#888' }}>
                        {item.platform}
                      </span>
                      <span className={`text-xs px-1 rounded ${
                        item.status === 'published' ? 'bg-green-900 text-green-400' :
                        item.status === 'scheduled' ? 'bg-blue-900 text-blue-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>{item.status}</span>
                    </div>
                    <div className="text-xs text-gray-300 line-clamp-3">{item.content}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{PILLAR_LABELS[item.content_pillar] ?? item.content_pillar}</span>
                      {item.scheduled_at && (
                        <span className="text-xs text-gray-600">{new Date(item.scheduled_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
