'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMessage {
  id: string
  agentName: string
  company: string
  message: string
  createdAt: string | null
}

const COMPANY_COLORS: Record<string, string> = {
  xforce: '#1DA1F2',
  gramgod: '#E1306C',
  linkedelite: '#0077B5',
  pagepower: '#1877F2',
  webboss: '#22C55E',
  intelcore: '#FFD700',
  hrforce: '#F97316',
  legalshield: '#EF4444',
  financedesk: '#10B981',
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function WatercoolerChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/culture/chat')
      const data = await res.json() as { ok: boolean; messages?: ChatMessage[] }
      if (data.ok) {
        setMessages((data.messages ?? []).slice(-10))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 60000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const generateChat = async () => {
    setGenerating(true)
    try {
      await fetch('/api/culture/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      await fetchMessages()
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 280 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-pp-border flex-shrink-0">
        <span className="pixel-text text-pp-gold" style={{ fontSize: 8 }}>💬 WATERCOOLER</span>
        <button
          onClick={generateChat}
          disabled={generating}
          className="px-2 py-0.5 rounded pixel-text transition-opacity"
          style={{
            fontSize: 7,
            background: '#1E1E3A',
            color: '#00F0FF',
            border: '1px solid #00F0FF44',
            opacity: generating ? 0.5 : 1,
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? '⏳' : '⚡ GENERATE'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E1E3A transparent' }}
      >
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-pp-border flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-pp-border rounded w-1/3" />
                  <div className="h-2 bg-pp-border rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center text-pp-muted py-4" style={{ fontSize: 8 }}>
            No chats yet. Generate one!
          </div>
        )}

        {messages.map((msg) => {
          const color = COMPANY_COLORS[msg.company] ?? '#64748B'
          return (
            <div key={msg.id} className="flex gap-2">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full font-mono font-bold"
                style={{
                  width: 22,
                  height: 22,
                  background: color + '33',
                  border: `1px solid ${color}66`,
                  color,
                  fontSize: 7,
                }}
              >
                {getInitials(msg.agentName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-mono font-semibold" style={{ fontSize: 8, color }}>
                    {msg.agentName.toUpperCase()}
                  </span>
                  <span className="text-pp-muted font-mono" style={{ fontSize: 7 }}>
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 9, color: '#CBD5E1', lineHeight: 1.4 }}>{msg.message}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
