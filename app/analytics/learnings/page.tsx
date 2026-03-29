'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Learning {
  id: string
  agentName: string
  learningType: string
  content: string
  confidenceScore: number
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  voice: '#FFD700',
  timing: '#00F0FF',
  format: '#E1306C',
  topic: '#22C55E',
  engagement: '#1DA1F2',
}

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/learnings')
      .then((r) => r.json())
      .then((data) => setLearnings(data.learnings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = learnings.reduce<Record<string, Learning[]>>((acc, l) => {
    const key = l.agentName
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center gap-6 px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <Link href="/analytics" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>
          ← ANALYTICS
        </Link>
        <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>WEEKLY LEARNINGS</span>
      </nav>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <p className="text-pp-muted" style={{ fontSize: 10 }}>
          MEMORY agent extracts these patterns every Sunday from post performance data.
        </p>

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="pixel-card p-3 animate-pulse">
                <div className="h-3 bg-pp-border rounded w-1/3 mb-2" />
                <div className="h-2 bg-pp-border rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && learnings.length === 0 && (
          <div className="pixel-card p-6 text-center text-pp-muted" style={{ fontSize: 10 }}>
            No learnings yet. MEMORY runs every Sunday at 2AM EAT.
          </div>
        )}

        {Object.entries(grouped).map(([agent, items]) => (
          <div key={agent} className="pixel-card p-4">
            <h3 className="pixel-text text-pp-gold mb-3" style={{ fontSize: 9 }}>
              {agent.toUpperCase()}
            </h3>
            <div className="space-y-2">
              {items.map((l) => (
                <div key={l.id} className="flex items-start gap-3 py-2 border-b border-pp-border last:border-0">
                  <span
                    className="px-1.5 py-0.5 rounded text-pp-bg flex-shrink-0"
                    style={{ fontSize: 7, background: TYPE_COLORS[l.learningType] ?? '#64748B', fontFamily: 'monospace' }}
                  >
                    {l.learningType}
                  </span>
                  <span className="flex-1 text-pp-text" style={{ fontSize: 9 }}>
                    {l.content}
                  </span>
                  <span className="text-pp-muted flex-shrink-0 font-mono" style={{ fontSize: 8 }}>
                    {(Number(l.confidenceScore) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
