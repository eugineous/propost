'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface InboxMessage {
  id: string
  platform: string
  senderId: string
  senderUsername: string
  content: string
  replyContent: string | null
  isBrandDeal: boolean
  status: string
  receivedAt: string
  repliedAt: string | null
  responseTimeMs: number | null
  agentName: string | null
}

type FilterType = 'all' | 'instagram' | 'facebook' | 'pending' | 'brand_deals'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  x: '#1DA1F2',
  linkedin: '#0077B5',
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '👥',
  x: '🐦',
  linkedin: '💼',
}

function getSLAColor(receivedAt: string, status: string): string {
  if (status === 'replied') return '#22C55E'
  const mins = (Date.now() - new Date(receivedAt).getTime()) / 60000
  if (mins < 5) return '#22C55E'
  if (mins < 15) return '#F59E0B'
  return '#EF4444'
}

function getSLALabel(receivedAt: string, status: string): string {
  if (status === 'replied') return 'REPLIED'
  const mins = (Date.now() - new Date(receivedAt).getTime()) / 60000
  if (mins < 1) return '<1m'
  if (mins < 60) return `${Math.floor(mins)}m`
  return `${Math.floor(mins / 60)}h`
}

function ReplyModal({
  message,
  onClose,
  onSent,
}: {
  message: InboxMessage
  onClose: () => void
  onSent: () => void
}) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id, reply }),
      })
      onSent()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="pixel-card p-4 w-full max-w-md"
        style={{ background: '#12121F' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>REPLY TO @{message.senderUsername}</span>
          <button onClick={onClose} className="text-pp-muted hover:text-pp-text">✕</button>
        </div>
        <div className="mb-3 p-2 rounded" style={{ background: '#0A0A14', fontSize: 9, color: '#94A3B8' }}>
          {message.content}
        </div>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={4}
          className="w-full p-2 rounded mb-3 font-mono resize-none"
          style={{ background: '#0A0A14', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 10 }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded pixel-text"
            style={{ fontSize: 8, background: '#1E1E3A', color: '#94A3B8' }}
          >
            CANCEL
          </button>
          <button
            onClick={send}
            disabled={sending || !reply.trim()}
            className="px-3 py-1 rounded pixel-text"
            style={{ fontSize: 8, background: '#FFD700', color: '#0A0A14', opacity: sending ? 0.6 : 1 }}
          >
            {sending ? 'SENDING...' : 'SEND REPLY'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyTarget, setReplyTarget] = useState<InboxMessage | null>(null)
  const [replyingAll, setReplyingAll] = useState(false)
  const [igData, setIgData] = useState<{ dmsPending: number; account?: { username: string; followers: number } } | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox')
      const data = await res.json() as { ok: boolean; messages?: InboxMessage[] }
      if (data.ok) setMessages(data.messages ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIgLive = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/ig-live')
      const data = await res.json() as { ok: boolean; dmsPending?: number; account?: { username: string; followers: number } }
      if (data.ok) setIgData({ dmsPending: data.dmsPending ?? 0, account: data.account })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    fetchIgLive()
    const interval = setInterval(() => {
      fetchMessages()
      fetchIgLive()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages, fetchIgLive])

  const filtered = messages.filter((m) => {
    if (filter === 'instagram') return m.platform === 'instagram'
    if (filter === 'facebook') return m.platform === 'facebook'
    if (filter === 'pending') return m.status === 'pending'
    if (filter === 'brand_deals') return m.isBrandDeal
    return true
  })

  const pendingCount = messages.filter((m) => m.status === 'pending').length
  const brandDealCount = messages.filter((m) => m.isBrandDeal).length

  const replyAllPending = async () => {
    setReplyingAll(true)
    try {
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'Reply to all pending DMs using CHAT agent', agent: 'chat' }),
      })
      setTimeout(fetchMessages, 3000)
    } catch {
      // ignore
    } finally {
      setReplyingAll(false)
    }
  }

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'ALL', count: messages.length },
    { key: 'instagram', label: '📸 INSTAGRAM' },
    { key: 'facebook', label: '👥 FACEBOOK' },
    { key: 'pending', label: '⏳ PENDING', count: pendingCount },
    { key: 'brand_deals', label: '💰 BRAND DEALS', count: brandDealCount },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      {replyTarget && (
        <ReplyModal
          message={replyTarget}
          onClose={() => setReplyTarget(null)}
          onSent={() => { setReplyTarget(null); fetchMessages() }}
        />
      )}

      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>📥 UNIFIED INBOX</span>
        </div>
        <div className="flex items-center gap-4">
          {igData?.account && (
            <span className="font-mono" style={{ fontSize: 8, color: '#E1306C' }}>
              @{igData.account.username} · {igData.account.followers.toLocaleString()} followers
            </span>
          )}
          {igData && igData.dmsPending > 0 && (
            <span className="px-2 py-0.5 rounded font-mono" style={{ fontSize: 8, background: '#E1306C22', color: '#E1306C', border: '1px solid #E1306C44' }}>
              {igData.dmsPending} IG DMs pending
            </span>
          )}
          <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>👑 EUGINE MICAH</span>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {/* Filters + Reply All */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1 rounded pixel-text transition-colors flex items-center gap-1"
              style={{
                fontSize: 8,
                background: filter === f.key ? '#FFD700' : '#1E1E3A',
                color: filter === f.key ? '#0A0A14' : '#E2E8F0',
              }}
            >
              {f.label}
              {f.count !== undefined && (
                <span
                  className="px-1 rounded-full"
                  style={{
                    fontSize: 7,
                    background: filter === f.key ? '#0A0A14' : '#2a2a4a',
                    color: filter === f.key ? '#FFD700' : '#94A3B8',
                  }}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
              {filtered.length} messages · auto-refresh 30s
            </span>
            {pendingCount > 0 && (
              <button
                onClick={replyAllPending}
                disabled={replyingAll}
                className="px-3 py-1 rounded pixel-text"
                style={{ fontSize: 8, background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44', opacity: replyingAll ? 0.6 : 1 }}
              >
                {replyingAll ? '⏳ REPLYING...' : `⚡ REPLY ALL PENDING (${pendingCount})`}
              </button>
            )}
          </div>
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
          <div className="pixel-card p-8 text-center">
            <div style={{ fontSize: 24 }}>📭</div>
            <div className="text-pp-muted mt-2" style={{ fontSize: 10 }}>No messages found.</div>
          </div>
        )}

        {filtered.map((msg) => {
          const slaColor = getSLAColor(msg.receivedAt, msg.status)
          const slaLabel = getSLALabel(msg.receivedAt, msg.status)
          const isExpanded = expanded === msg.id
          const isBrandDeal = msg.isBrandDeal

          return (
            <div
              key={msg.id}
              className="pixel-card p-3 cursor-pointer transition-all"
              style={{
                border: isBrandDeal ? '1px solid #FFD70066' : undefined,
                background: isBrandDeal ? '#0A0A14' : undefined,
              }}
              onClick={() => setExpanded(isExpanded ? null : msg.id)}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>{PLATFORM_ICONS[msg.platform] ?? '💬'}</span>
                <span className="font-mono" style={{ fontSize: 9, color: PLATFORM_COLORS[msg.platform] ?? '#94A3B8' }}>
                  {msg.platform.toUpperCase()}
                </span>
                <span className="text-pp-text font-mono font-semibold" style={{ fontSize: 9 }}>
                  @{msg.senderUsername}
                </span>
                {isBrandDeal && (
                  <span className="px-1.5 py-0.5 rounded pixel-text" style={{ fontSize: 6, background: '#FFD700', color: '#0A0A14' }}>
                    💰 BRAND DEAL
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{ fontSize: 7, background: slaColor + '22', color: slaColor, border: `1px solid ${slaColor}44` }}
                  >
                    {slaLabel}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{
                      fontSize: 7,
                      background: msg.status === 'replied' ? '#22C55E22' : '#F59E0B22',
                      color: msg.status === 'replied' ? '#22C55E' : '#F59E0B',
                    }}
                  >
                    {msg.status.toUpperCase()}
                  </span>
                </span>
              </div>

              <p className="mt-2 text-pp-text" style={{ fontSize: 10 }}>
                {isExpanded ? msg.content : (msg.content.length > 120 ? msg.content.slice(0, 120) + '…' : msg.content)}
              </p>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {msg.replyContent && (
                    <div className="border-l-2 border-pp-accent pl-3">
                      <span className="text-pp-muted" style={{ fontSize: 8 }}>
                        {msg.agentName ? msg.agentName.toUpperCase() : 'AGENT'} replied:
                      </span>
                      <p className="text-pp-accent mt-0.5" style={{ fontSize: 9 }}>{msg.replyContent}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                      {new Date(msg.receivedAt).toLocaleString('en-KE')}
                    </span>
                    {msg.responseTimeMs && (
                      <span className="text-pp-muted font-mono" style={{ fontSize: 8 }}>
                        Response: {(msg.responseTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setReplyTarget(msg) }}
                      className="ml-auto px-3 py-1 rounded pixel-text"
                      style={{ fontSize: 8, background: '#1877F222', color: '#1877F2', border: '1px solid #1877F244' }}
                    >
                      ↩ REPLY
                    </button>
                  </div>
                </div>
              )}

              {!isExpanded && (
                <div className="mt-1 text-pp-muted font-mono" style={{ fontSize: 8 }}>
                  {new Date(msg.receivedAt).toLocaleString('en-KE')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
