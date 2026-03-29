'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Message {
  id: string
  platform: string
  senderUsername: string
  content: string
  replyContent: string | null
  isBrandDeal: boolean
  status: string
  receivedAt: string
  repliedAt: string | null
  responseTimeMs: number | null
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  x: '#1DA1F2',
  linkedin: '#0077B5',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  replied: '#22C55E',
  escalated: '#FFD700',
  ignored: '#64748B',
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'brand_deal'>('all')

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = messages.filter((m) => {
    if (filter === 'pending') return m.status === 'pending'
    if (filter === 'brand_deal') return m.isBrandDeal
    return true
  })

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>MESSAGES</span>
        </div>
        <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>👑 EUGINE MICAH</span>
      </nav>

      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'pending', 'brand_deal'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded pixel-text transition-colors"
              style={{
                fontSize: 8,
                background: filter === f ? '#FFD700' : '#1E1E3A',
                color: filter === f ? '#0A0A14' : '#E2E8F0',
              }}
            >
              {f.replace('_', ' ').toUpperCase()}
            </button>
          ))}
          <span className="ml-auto text-pp-muted" style={{ fontSize: 9 }}>
            {filtered.length} messages
          </span>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="pixel-card p-3 animate-pulse">
                <div className="h-3 bg-pp-border rounded w-1/4 mb-2" />
                <div className="h-2 bg-pp-border rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="pixel-card p-6 text-center text-pp-muted" style={{ fontSize: 10 }}>
            No messages found.
          </div>
        )}

        {filtered.map((msg) => (
          <div key={msg.id} className="pixel-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: PLATFORM_COLORS[msg.platform] ?? '#64748B' }}
              />
              <span className="font-mono" style={{ fontSize: 9, color: PLATFORM_COLORS[msg.platform] }}>
                {msg.platform.toUpperCase()}
              </span>
              <span className="text-pp-text font-mono" style={{ fontSize: 9 }}>
                @{msg.senderUsername}
              </span>
              {msg.isBrandDeal && (
                <span className="px-1.5 py-0.5 rounded text-pp-bg pixel-text" style={{ fontSize: 6, background: '#FFD700' }}>
                  BRAND DEAL
                </span>
              )}
              <span
                className="ml-auto px-1.5 py-0.5 rounded font-mono"
                style={{ fontSize: 7, background: STATUS_COLORS[msg.status] ?? '#64748B', color: '#0A0A14' }}
              >
                {msg.status.toUpperCase()}
              </span>
            </div>
            <p className="text-pp-text mb-2" style={{ fontSize: 10 }}>{msg.content}</p>
            {msg.replyContent && (
              <div className="border-l-2 border-pp-accent pl-2 mt-1">
                <span className="text-pp-muted" style={{ fontSize: 8 }}>CHAT replied: </span>
                <span className="text-pp-accent" style={{ fontSize: 9 }}>{msg.replyContent}</span>
              </div>
            )}
            <div className="flex gap-4 mt-2">
              <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                {new Date(msg.receivedAt).toLocaleString('en-KE')}
              </span>
              {msg.responseTimeMs && (
                <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                  Response: {(msg.responseTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
