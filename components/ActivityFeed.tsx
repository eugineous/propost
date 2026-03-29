'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import type { ActivityEvent, Corp } from '@/lib/types'

const CORP_COLORS: Record<Corp, string> = {
  intelcore: '#FFD700',
  xforce: '#1DA1F2',
  linkedelite: '#0077B5',
  gramgod: '#E1306C',
  pagepower: '#1877F2',
  webboss: '#22C55E',
}

interface LiveAction {
  id: string
  agentName: string
  company: string
  actionType: string
  outcome: string | null
  createdAt: string
  outputPreview: string
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
    return new Date(ts).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

export default function ActivityFeed() {
  const { events, connectionStatus } = useActivityFeed()
  const [liveActions, setLiveActions] = useState<LiveAction[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/live')
      const json = await res.json() as { ok: boolean; recentActions?: LiveAction[] }
      if (json.ok && json.recentActions) {
        setLiveActions(json.recentActions)
      }
    } catch {
      // silent fail
    }
  }, [])

  useEffect(() => {
    fetchLive()
    const interval = setInterval(fetchLive, 30000)
    return () => clearInterval(interval)
  }, [fetchLive])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, liveActions])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-pp-border flex-shrink-0">
        <h2 className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>
          ACTIVITY FEED
        </h2>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 rounded"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#22C55E',
                display: 'inline-block',
                animation: 'livePulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 7, color: '#22C55E', fontFamily: 'monospace', letterSpacing: 1 }}>
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  connectionStatus === 'connected'
                    ? '#22C55E'
                    : connectionStatus === 'connecting'
                    ? '#F59E0B'
                    : '#EF4444',
              }}
            />
            <span className="text-pp-muted" style={{ fontSize: 8 }}>
              {connectionStatus === 'connected'
                ? '🟢 LIVE'
                : connectionStatus === 'connecting'
                ? '🟡 CONNECTING'
                : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {events.length === 0 && liveActions.length === 0 && (
          <div className="text-pp-muted text-center py-4" style={{ fontSize: 9 }}>
            Waiting for activity...
          </div>
        )}

        {events.map((event, i) => {
          const isCrisis = event.type === 'crisis_alert'
          const color = CORP_COLORS[event.company] ?? '#E2E8F0'
          return (
            <div
              key={`sse-${i}`}
              className={`flex items-start gap-2 py-1 px-2 rounded ${isCrisis ? 'crisis-pulse' : ''}`}
              style={{
                background: isCrisis ? 'rgba(239,68,68,0.1)' : 'transparent',
                borderLeft: isCrisis ? '2px solid #EF4444' : `2px solid ${color}33`,
              }}
            >
              <span className="text-pp-muted flex-shrink-0 font-mono" style={{ fontSize: 8 }}>
                {formatTime(event.timestamp)}
              </span>
              <span className="font-mono flex-shrink-0" style={{ fontSize: 8, color, minWidth: 60 }}>
                {event.agentName}
              </span>
              <span className="text-pp-text flex-1" style={{ fontSize: 8 }}>
                {event.summary}
              </span>
              <span className="flex-shrink-0" style={{ fontSize: 10 }}>
                {outcomeIcon(event)}
              </span>
            </div>
          )
        })}

        {events.length === 0 &&
          liveActions.map((a) => {
            const color = CORP_COLORS[a.company as Corp] ?? '#E2E8F0'
            return (
              <div
                key={`live-${a.id}`}
                className="flex items-start gap-2 py-1 px-2 rounded"
                style={{ borderLeft: `2px solid ${color}33` }}
              >
                <span className="text-pp-muted flex-shrink-0 font-mono" style={{ fontSize: 8 }}>
                  {formatTime(a.createdAt)}
                </span>
                <span className="font-mono flex-shrink-0" style={{ fontSize: 8, color, minWidth: 60 }}>
                  {a.agentName}
                </span>
                <span className="text-pp-text flex-1" style={{ fontSize: 8 }}>
                  {a.actionType}: {a.outputPreview}
                </span>
                <span className="flex-shrink-0" style={{ fontSize: 10 }}>
                  {a.outcome === 'success' ? '✅' : a.outcome === 'error' ? '❌' : '•'}
                </span>
              </div>
            )
          })}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}