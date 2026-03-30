'use client'

import { useEffect, useRef, useState } from 'react'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import type { ActivityEvent, Corp } from '@/lib/types'

const CORP_COLORS: Record<Corp, string> = {
  intelcore: '#FFD700',
  xforce: '#1DA1F2',
  linkedelite: '#0077B5',
  gramgod: '#E1306C',
  pagepower: '#1877F2',
  webboss: '#22C55E',
  hrforce: '#A855F7',
  legalshield: '#EF4444',
  financedesk: '#10B981',
}

function outcomeIcon(event: ActivityEvent): string {
  if (event.type === 'crisis_alert') return '🚨'
  if (event.type === 'hawk_block') return '⚠️'
  const outcome = (event.data?.outcome as string) ?? ''
  if (outcome === 'success') return '✅'
  if (outcome === 'blocked') return '⚠️'
  if (outcome === 'error') return '❌'
  return '•'
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return ts }
}

export default function ActivityFeed() {
  const { events, connectionStatus, refresh } = useActivityFeed()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [events])

  const handleRunAgents = async () => {
    if (running) return
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch('/api/agents/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ['CHAT', 'BLAZE', 'SCOUT', 'SCRIBE', 'MEMORY'] }),
      })
      const json = await res.json() as { ok: boolean; results?: Record<string, unknown>; errors?: Record<string, string> }
      if (json.ok) {
        const done = Object.keys(json.results ?? {}).join(', ') || 'none'
        setRunResult(`✅ Ran: ${done}`)
      } else {
        const errs = Object.entries(json.errors ?? {}).map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`).join(' | ')
        setRunResult(`⚠️ ${errs || 'Some agents failed'}`)
      }
      // Refresh feed after run
      setTimeout(() => refresh(), 2000)
    } catch (err) {
      setRunResult(`❌ ${String(err).slice(0, 80)}`)
    } finally {
      setRunning(false)
      setTimeout(() => setRunResult(null), 8000)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-pp-border flex-shrink-0">
        <h2 className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>ACTIVITY FEED</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAgents}
            disabled={running}
            className="px-2 py-1 rounded text-black font-bold disabled:opacity-50"
            style={{ fontSize: 8, background: running ? '#16A34A' : '#22C55E', minWidth: 80 }}
          >
            {running ? '⚙️ RUNNING…' : '▶ RUN AGENTS'}
          </button>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: connectionStatus === 'connected' ? '#22C55E' : connectionStatus === 'connecting' ? '#F59E0B' : '#EF4444' }} />
            <span className="text-pp-muted" style={{ fontSize: 8 }}>
              {connectionStatus === 'connected' ? '🟢 LIVE' : connectionStatus === 'connecting' ? '🟡 CONNECTING' : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {runResult && (
        <div className="px-3 py-1 border-b border-pp-border flex-shrink-0" style={{ background: '#0D1117', fontSize: 8, color: '#94A3B8', fontFamily: 'monospace' }}>
          {runResult}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
        {events.length === 0 && (
          <div className="text-pp-muted text-center py-4" style={{ fontSize: 9 }}>Waiting for activity...</div>
        )}
        {events.map((event, i) => {
          const isCrisis = event.type === 'crisis_alert'
          const color = CORP_COLORS[event.company] ?? '#E2E8F0'
          return (
            <div key={`sse-${i}`} className={`flex items-start gap-2 py-1 px-2 rounded ${isCrisis ? 'crisis-pulse' : ''}`} style={{ background: isCrisis ? 'rgba(239,68,68,0.1)' : 'transparent', borderLeft: isCrisis ? '2px solid #EF4444' : `2px solid ${color}33` }}>
              <span className="text-pp-muted flex-shrink-0 font-mono" style={{ fontSize: 8 }}>{formatTime(event.timestamp)}</span>
              <span className="font-mono flex-shrink-0" style={{ fontSize: 8, color, minWidth: 60 }}>{event.agentName}</span>
              <span className="text-pp-text flex-1 min-w-0 break-words" style={{ fontSize: 8 }}>{event.summary}</span>
              <span className="flex-shrink-0" style={{ fontSize: 10 }}>{outcomeIcon(event)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
