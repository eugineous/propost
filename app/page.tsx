'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
  name: string
  status: string
  currentTask?: string
}

interface ActivityItem {
  id?: string
  type?: string
  agentName?: string
  company?: string
  platform?: string
  contentPreview?: string
  timestamp?: string
  action?: Record<string, unknown>
}

interface PlatformConn {
  platform: string
  status: string
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────

function safeTime(ts?: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString()
  } catch {
    return ''
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANIES = [
  { id: 'xforce',      label: 'XForce Corp',     ceo: 'ZARA',   color: '#1d9bf0', icon: 'X',  room: 'War Room',       href: '/monitor?company=xforce' },
  { id: 'linkedelite', label: 'LinkedElite Corp', ceo: 'NOVA',   color: '#0a66c2', icon: 'in', room: 'Boardroom',      href: '/monitor?company=linkedelite' },
  { id: 'gramgod',     label: 'GramGod Corp',     ceo: 'AURORA', color: '#e1306c', icon: 'IG', room: 'Studio',         href: '/monitor?company=gramgod' },
  { id: 'pagepower',   label: 'PagePower Corp',   ceo: 'CHIEF',  color: '#1877f2', icon: 'FB', room: 'Community Hall', href: '/monitor?company=pagepower' },
  { id: 'webboss',     label: 'WebBoss Corp',     ceo: 'ROOT',   color: '#22c55e', icon: 'WB', room: 'Engine Room',    href: '/monitor?company=webboss' },
  { id: 'intelcore',   label: 'IntelCore HQ',     ceo: 'ORACLE', color: '#a855f7', icon: 'HQ', room: 'Situation Room', href: '/monitor?company=intelcore' },
]

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  unresponsive: 'bg-orange-500',
}

// ─── Post Now Panel ───────────────────────────────────────────────────────────

function PostNowPanel() {
  const [posting, setPosting] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch('/api/post/now').then(r => r.json()).then(setStatus).catch(() => {})
  }, [])

  const firePost = async (platform: 'x' | 'linkedin' | 'instagram' | 'facebook' | 'all') => {
    setPosting(platform)
    setLastResult(null)
    try {
      const res = await fetch('/api/post/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json().catch(() => ({})) as Record<string, unknown>
      const results = (data.results as Array<{ platform: string; success: boolean; postId?: string; error?: string; url?: string }>) ?? []
      const msgs = results.map((r) =>
        r.success
          ? `✅ ${r.platform.toUpperCase()} — ${r.url ?? r.postId ?? 'posted'}`
          : `❌ ${r.platform.toUpperCase()} — ${r.error ?? 'failed'}`
      )
      setLastResult(msgs.join('\n') || (data.error as string) || 'Done')
    } catch (err) {
      setLastResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPosting(null)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-blue-400 mb-3 font-bold tracking-wider">⚡ POST NOW</div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => firePost('all')} disabled={!!posting}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 rounded text-xs font-bold transition-colors">
          {posting === 'all' ? '⏳ Posting...' : '🚀 All Platforms'}
        </button>
        <button onClick={() => firePost('x')} disabled={!!posting}
          className="px-3 py-2 bg-sky-800 hover:bg-sky-700 disabled:bg-gray-700 rounded text-xs font-bold transition-colors">
          {posting === 'x' ? '⏳' : '𝕏'} X
        </button>
        <button onClick={() => firePost('linkedin')} disabled={!!posting}
          className="px-3 py-2 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-700 rounded text-xs font-bold transition-colors">
          {posting === 'linkedin' ? '⏳' : '💼'} LinkedIn
        </button>
        <button onClick={() => firePost('instagram')} disabled={!!posting}
          className="px-3 py-2 bg-pink-900 hover:bg-pink-800 disabled:bg-gray-700 rounded text-xs font-bold transition-colors">
          {posting === 'instagram' ? '⏳' : '📸'} Instagram
        </button>
        <button onClick={() => firePost('facebook')} disabled={!!posting}
          className="px-3 py-2 bg-blue-950 hover:bg-blue-900 disabled:bg-gray-700 rounded text-xs font-bold transition-colors">
          {posting === 'facebook' ? '⏳' : '📘'} Facebook
        </button>
        <a href="/inbox" className="px-3 py-2 bg-yellow-800 hover:bg-yellow-700 rounded text-xs font-bold transition-colors">
          📋 Queue
        </a>
      </div>
      {lastResult && (
        <div className="mt-3 p-2 bg-gray-800 rounded text-xs text-gray-300 whitespace-pre-line border-l-2 border-blue-500">
          {lastResult}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmpireOverview() {
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({})
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [connections, setConnections] = useState<PlatformConn[]>([])
  const [command, setCommand] = useState('')
  const [commandResult, setCommandResult] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const activityRef = useRef<HTMLDivElement>(null)

  // SSE: agent statuses — fully defensive
  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        es = new EventSource('/api/agents/status')

        es.onopen = () => setSseStatus('connected')

        es.onmessage = (e) => {
          try {
            const data = safeJson(e.data)
            if (!data || typeof data !== 'object') return
            const d = data as Record<string, unknown>
            if (d.type === 'initial' && Array.isArray(d.agents)) {
              const map: Record<string, AgentStatus> = {}
              for (const a of d.agents as AgentStatus[]) {
                if (a?.name) map[a.name] = { name: a.name, status: a.status ?? 'idle' }
              }
              setAgents(map)
            } else if (d.type === 'update' && d.agentName) {
              setAgents((prev) => ({
                ...prev,
                [d.agentName as string]: {
                  name: d.agentName as string,
                  status: (d.status as string) ?? 'idle',
                  currentTask: d.currentTask as string | undefined,
                },
              }))
            }
          } catch { /* ignore parse errors */ }
        }

        es.onerror = () => {
          setSseStatus('error')
          es?.close()
          // Retry after 5s
          retryTimer = setTimeout(connect, 5000)
        }
      } catch { /* EventSource not available */ }
    }

    connect()
    return () => {
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  // SSE: activity feed — fully defensive
  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        es = new EventSource('/api/activity')

        es.onmessage = (e) => {
          try {
            const data = safeJson(e.data)
            if (!data || typeof data !== 'object') return
            const d = data as Record<string, unknown>

            let item: ActivityItem | null = null

            if (d.type === 'initial' && d.action && typeof d.action === 'object') {
              item = d.action as ActivityItem
            } else if (d.agentName) {
              item = d as ActivityItem
            }

            if (item) {
              setActivity((prev) => [item!, ...prev].slice(0, 100))
            }
          } catch { /* ignore */ }
        }

        es.onerror = () => {
          es?.close()
          retryTimer = setTimeout(connect, 5000)
        }
      } catch { /* EventSource not available */ }
    }

    connect()
    return () => {
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  // Platform connections — defensive fetch
  useEffect(() => {
    fetch('/api/connections')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => Array.isArray(data) ? setConnections(data) : null)
      .catch(() => {})
  }, [])

  const sendCommand = useCallback(async () => {
    if (!command.trim()) return
    setCommandLoading(true)
    setCommandResult(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: command }),
      })
      const data = await res.json().catch(() => ({}))
      setCommandResult((data as Record<string, string>).plan ?? (data as Record<string, string>).error ?? 'Command received.')
    } catch {
      setCommandResult('Command failed — check system status.')
    } finally {
      setCommandLoading(false)
      setCommand('')
    }
  }, [command])

  const getCEOStatus = (ceoName: string) => agents[ceoName]?.status ?? 'idle'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Nav */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 text-xl font-bold tracking-widest">PROPOST</span>
          <span className="text-gray-600 text-xs">EMPIRE COMMAND CENTER</span>
          {sseStatus === 'error' && (
            <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">SSE reconnecting...</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <Link href="/monitor" className="hover:text-white transition-colors">Monitor</Link>
          <Link href="/tasks" className="hover:text-white transition-colors">Tasks</Link>
          <Link href="/inbox" className="hover:text-white transition-colors">Inbox</Link>
          <Link href="/content" className="hover:text-white transition-colors">Calendar</Link>
          <Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          <Link href="/memory" className="hover:text-white transition-colors">Memory</Link>
          <Link href="/office" className="hover:text-white transition-colors">Office</Link>
          <Link href="/connect" className="hover:text-white transition-colors text-blue-400">Connect</Link>
          <Link href="/make" className="hover:text-white transition-colors text-yellow-400">Make.com</Link>
          <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
        </div>
      </nav>

      <div className="p-6 grid grid-cols-12 gap-4">
        {/* Left */}
        <div className="col-span-8 space-y-4">
          {/* Command */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-2 font-bold tracking-wider">SOVEREIGN COMMAND</div>
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                placeholder="Give SOVEREIGN a command..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={sendCommand}
                disabled={commandLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded text-sm font-bold transition-colors"
              >
                {commandLoading ? '...' : 'SEND'}
              </button>
            </div>
            {commandResult && (
              <div className="mt-3 p-3 bg-gray-800 rounded text-xs text-gray-300 leading-relaxed border-l-2 border-purple-500">
                {commandResult}
              </div>
            )}
          </div>

          {/* POST NOW — immediate fire buttons */}
          <PostNowPanel />

          {/* Company Map */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">COMPANY MAP</div>
            <div className="grid grid-cols-3 gap-3">
              {COMPANIES.map((co) => {
                const ceoStatus = getCEOStatus(co.ceo)
                return (
                  <Link key={co.id} href={co.href}>
                    <div
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                      style={{ borderColor: co.color + '44' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: co.color, backgroundColor: co.color + '22' }}>{co.icon}</span>
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[ceoStatus] ?? 'bg-gray-500'} ${ceoStatus === 'active' ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="text-xs font-bold text-gray-200">{co.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">CEO: {co.ceo}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{co.room}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Office preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-bold tracking-wider">VIRTUAL OFFICE</div>
              <Link href="/office" className="text-xs text-purple-400 hover:text-purple-300">Open Full View →</Link>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {COMPANIES.map((co) => {
                const s = getCEOStatus(co.ceo)
                return (
                  <div key={co.id} className="rounded p-2 border text-center" style={{ borderColor: co.color + '33', backgroundColor: co.color + '11' }}>
                    <div className="text-lg mb-1">{s === 'active' ? '🟢' : s === 'error' ? '🔴' : '💤'}</div>
                    <div className="text-xs font-bold truncate" style={{ color: co.color }}>{co.ceo}</div>
                    <div className="text-xs text-gray-600">{s}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="col-span-4 space-y-4">
          {/* Platform Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">PLATFORM STATUS</div>
            <div className="space-y-2">
              {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => {
                const conn = connections.find((c) => c?.platform === p)
                const status = conn?.status ?? 'not configured'
                return (
                  <div key={p} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 capitalize">{p}</span>
                    <span className={`text-xs font-bold ${
                      status === 'connected' ? 'text-green-400' :
                      status === 'expired' ? 'text-yellow-400' :
                      status === 'error' ? 'text-red-400' : 'text-gray-500'
                    }`}>{status}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col" style={{ height: '460px' }}>
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider flex items-center gap-2">
              LIVE ACTIVITY
              <span className={`w-1.5 h-1.5 rounded-full ${sseStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            </div>
            <div ref={activityRef} className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {activity.length === 0 ? (
                <div className="text-xs text-gray-600 text-center py-8">Waiting for agent activity...</div>
              ) : (
                activity.map((item, i) => (
                  <div key={`${item?.id ?? ''}-${i}`} className="border border-gray-800 rounded p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-400 font-bold">{item?.agentName ?? '—'}</span>
                      {item?.platform && <span className="text-gray-500 text-xs">{item.platform}</span>}
                    </div>
                    <div className="text-gray-400">{(item?.type ?? '').replace(/_/g, ' ')}</div>
                    {item?.contentPreview && (
                      <div className="text-gray-500 mt-1 truncate">{item.contentPreview}</div>
                    )}
                    <div className="text-gray-700 mt-1">{safeTime(item?.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">QUICK ACCESS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/inbox', label: 'Approval Inbox', color: 'text-yellow-400' },
                { href: '/tasks', label: 'Task Board', color: 'text-blue-400' },
                { href: '/analytics', label: 'Analytics', color: 'text-green-400' },
                { href: '/memory', label: 'Memory', color: 'text-purple-400' },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className={`text-xs ${link.color} hover:underline p-2 bg-gray-800 rounded text-center`}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
