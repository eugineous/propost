'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MemoryEntry {
  id: string
  agent_name: string
  context_summary: string
  platform?: string
  tags?: string[]
  created_at: string
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [agent, setAgent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [platform, setPlatform] = useState('')

  const fetchEntries = () => {
    const params = new URLSearchParams()
    if (agent) params.set('agent', agent)
    if (keyword) params.set('keyword', keyword)
    if (platform) params.set('platform', platform)
    setLoading(true)
    fetch(`/api/memory?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEntries() }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Memory Browser</h1>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Agent name..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-xs text-gray-300 focus:outline-none w-40" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Keyword..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-xs text-gray-300 focus:outline-none w-40" />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none">
          <option value="">All Platforms</option>
          {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button onClick={fetchEntries} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold">Search</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-20">Loading memory...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-gray-600 py-20">No memory entries found.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-purple-400">{entry.agent_name}</span>
                {entry.platform && <span className="text-xs text-gray-500">{entry.platform}</span>}
                <span className="text-xs text-gray-600 ml-auto">{new Date(entry.created_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-300 leading-relaxed">{entry.context_summary}</div>
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
