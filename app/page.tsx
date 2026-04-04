'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
  name: string
  status: string
  currentTask?: string
  last_heartbeat?: string
}

interface ActivityItem {
  id?: string
  type?: string
  agentName?: string
  company?: string
  platform?: string
  contentPreview?: string
  timestamp?: string
}

interface PlatformConn {
  platform: string
  status: string
  error_message?: string
}

interface TaskStats {
  queued: number
  active: number
  completed: number
  failed: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeTime(ts?: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANIES = [
  { id: 'xforce',      label: 'XForce',      ceo: 'ZARA',   color: '#1d9bf0', icon: '𝕏',  agents: ['ZARA','BLAZE','ECHO','SCOUT'] },
  { id: 'linkedelite', label: 'LinkedElite', ceo: 'NOVA',   color: '#0a66c2', icon: '💼', agents: ['NOVA','ORATOR','BRIDGE'] },
  { id: 'gramgod',     label: 'GramGod',     ceo: 'AURORA', color: '#e1306c', icon: '📸', agents: ['AURORA','CAPTION','REEL','STORY','CHAT'] },
  { id: 'pagepower',   label: 'PagePower',   ceo: 'CHIEF',  color: '#1877f2', icon: '📘', agents: ['CHIEF','REACH','COMMUNITY','PULSE'] },
  { id: 'webboss',     label: 'WebBoss',     ceo: 'ROOT',   color: '#22c55e', icon: '🌐', agents: ['ROOT','BUILD','CRAWL','SPEED','SHIELD'] },
  { id: 'intelcore',   label: 'IntelCore',   ceo: 'ORACLE', color: '#a855f7', icon: '🧠', agents: ['ORACLE','SENTRY','MEMORY','RISK'] },
]

const STATUS_DOT: Record<string, string> = {
  idle:         'bg-gray-500',
  active:       'bg-green-500',
  paused:       'bg-yellow-500',
  error:        'bg-red-500',
  unresponsive: 'bg-orange-500',
}

const PLATFORM_ICONS: Record<string, string> = {
  x: '𝕏', instagram: '📸', facebook: '📘', linkedin: '💼',
  website: '🌐', tiktok: '🎵', youtube: '▶️', reddit: '🟠', make: '⚙️',
}

// ─── System Controls ──────────────────────────────────────────────────────────

function SystemControls({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const run = async (label: string, url: string, method = 'POST') => {
    setLoading(label)
    setResult(null)
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } })
      const d = await res.json().catch(() => ({})) as Record<string, unknown>
      if (d.ok || d.success || res.ok) {
        const msg = d.agents ? `✅ ${label} — ${d.agents} agents ready` : `✅ ${label} done`
        setResult(msg)
        onRefresh()
      } else {
        setResult(`⚠️ ${(d.error as string) || 'check logs'}`)
      }
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : 'failed'}`)
    } finally {
      setLoading(null)
    }
  }

  const firePost = async (platform: string) => {
    setLoading(`post-${platform}`)
    setResult(null)
    try {
      const res = await fetch('/api/post/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const d = await res.json().catch(() => ({})) as Record<string, unknown>
      const results = (d.results as Array<{ platform: string; success: boolean; error?: string; url?: string }>) ?? []
      const msgs = results.map(r =>
        r.success ? `✅ ${r.platform.toUpperCase()} posted${r.url ? ` → ${r.url}` : ''}` : `❌ ${r.platform}: ${r.error ?? 'failed'}`
      )
      setResult(msgs.join('\n') || (d.error as string) || '✅ Done')
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : 'failed'}`)
    } finally {
      setLoading(null)
    }
  }

  const busy = !!loading

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      {/* System actions */}
      <div>
        <div className="text-xs text-gray-500 mb-2 font-bold tracking-wider">🔧 SYSTEM CONTROLS</div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => run('Initialize', '/api/agents/startup')} disabled={busy}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'Initialize' ? '⏳' : '🔌'} Initialize
          </button>
          <button onClick={() => run('Work Loop', '/api/agents/work')} disabled={busy}
            className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'Work Loop' ? '⏳' : '⚡'} Run Work Loop
          </button>
          <button onClick={() => run('Replies', '/api/cron/replies')} disabled={busy}
            className="px-3 py-1.5 bg-pink-900 hover:bg-pink-800 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'Replies' ? '⏳' : '💬'} Run Replies
          </button>
          <button onClick={() => run('Workflows', '/api/cron/daily-workflows')} disabled={busy}
            className="px-3 py-1.5 bg-teal-900 hover:bg-teal-800 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'Workflows' ? '⏳' : '📅'} Daily Workflows
          </button>
          <button onClick={() => run('Health Check', '/api/cron/health')} disabled={busy}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'Health Check' ? '⏳' : '🏥'} Health
          </button>
        </div>
      </div>

      {/* Post now */}
      <div>
        <div className="text-xs text-gray-500 mb-2 font-bold tracking-wider">⚡ POST NOW</div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => firePost('all')} disabled={busy}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded text-xs font-bold transition-colors">
            {loading === 'post-all' ? '⏳' : '🚀'} All Platforms
          </button>
          {['instagram', 'facebook', 'linkedin', 'x'].map(p => (
            <button key={p} onClick={() => firePost(p)} disabled={busy}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded text-xs font-bold transition-colors">
              {loading === `post-${p}` ? '⏳' : PLATFORM_ICONS[p]}{' '}
              {p === 'x' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <Link href="/inbox" className="px-3 py-1.5 bg-yellow-900 hover:bg-yellow-800 rounded text-xs font-bold transition-colors">
            📋 Queue
          </Link>
        </div>
      </div>

      {result && (
        <div className="p-2 bg-gray-800 rounded text-xs text-gray-300 whitespace-pre-line border-l-2 border-blue-500">
          {result}
        </div>
      )}
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ agents }: { agents: Record<string, AgentStatus> }) {
  const [tasks, setTasks] = useState<TaskStats>({ queued: 0, active: 0, completed: 0, failed: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tasks?limit=200')
        if (!res.ok) return
        const d = await res.json() as Array<{ status: string }>
        if (!Array.isArray(d)) return
        setTasks({
          queued: d.filter(t => t.status === 'queued').length,
          active: d.filter(t => t.status === 'active').length,
          completed: d.filter(t => t.status === 'completed').length,
          failed: d.filter(t => t.status === 'failed').length,
        })
      } catch {}
    }
    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [])

  const totalAgents = Object.keys(agents).length
  const activeAgents = Object.values(agents).filter(a => a.status === 'active').length
  const errorAgents = Object.values(agents).filter(a => a.status === 'error').length

  return (
    <div className="grid grid-cols-6 gap-2">
      {[
        { label: 'Agents Online', value: totalAgents, color: 'text-gray-300' },
        { label: 'Active', value: activeAgents, color: 'text-green-400' },
        { label: 'Errors', value: errorAgents, color: errorAgents > 0 ? 'text-red-400' : 'text-gray-600' },
        { label: 'Tasks Queued', value: tasks.queued, color: 'text-yellow-400' },
        { label: 'Running', value: tasks.active, color: 'text-blue-400' },
        { label: 'Done Today', value: tasks.completed, color: 'text-green-400' },
      ].map(s => (
        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded p-3 text-center">
          <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Company Grid ─────────────────────────────────────────────────────────────

function CompanyGrid({ agents }: { agents: Record<string, AgentStatus> }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-400 font-bold tracking-wider">🏢 AGENT EMPIRE</div>
        <Link href="/monitor" className="text-xs text-gray-500 hover:text-gray-300">Full view →</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {COMPANIES.map(co => {
          const ceoStatus = agents[co.ceo]?.status ?? 'idle'
          const activeCount = co.agents.filter(n => agents[n]?.status === 'active').length
          const errorCount = co.agents.filter(n => agents[n]?.status === 'error').length
          const ceoTask = agents[co.ceo]?.currentTask

          return (
            <Link key={co.id} href={`/monitor?company=${co.id}`}>
              <div className="border rounded-lg p-3 hover:bg-gray-800 transition-colors cursor-pointer"
                style={{ borderColor: co.color + '44' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold" style={{ color: co.color }}>{co.icon} {co.label}</span>
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[ceoStatus] ?? 'bg-gray-500'} ${ceoStatus === 'active' ? 'animate-pulse' : ''}`} />
                </div>
                <div className="text-xs text-gray-600 mb-2">CEO: {co.ceo} · {co.agents.length} agents</div>
                {/* Agent pips */}
                <div className="flex gap-1">
                  {co.agents.map(name => {
                    const s = agents[name]?.status ?? 'idle'
                    return (
                      <div key={name} title={`${name}: ${s}`}
                        className={`w-2 h-2 rounded-full ${STATUS_DOT[s] ?? 'bg-gray-700'} ${s === 'active' ? 'animate-pulse' : ''}`} />
                    )
                  })}
                </div>
                {ceoTask && <div className="text-xs text-gray-600 mt-1 truncate">{ceoTask}</div>}
                {(activeCount > 0 || errorCount > 0) && (
                  <div className="text-xs mt-1 space-x-2">
                    {activeCount > 0 && <span className="text-green-400">{activeCount} active</span>}
                    {errorCount > 0 && <span className="text-red-400">{errorCount} err</span>}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Platform Status ──────────────────────────────────────────────────────────

function PlatformStatus({ connections, refreshKey }: { connections: PlatformConn[]; refreshKey: number }) {
  const platforms = ['instagram', 'facebook', 'linkedin', 'x', 'website']

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-400 font-bold tracking-wider">📡 PLATFORMS</div>
        <Link href="/connect" className="text-xs text-blue-400 hover:text-blue-300">Manage →</Link>
      </div>
      <div className="space-y-2">
        {platforms.map(p => {
          const conn = connections.find(c => c?.platform === p)
          const status = conn?.status ?? 'not_configured'
          const ok = status === 'connected'
          const warn = status === 'expired'
          const err = status === 'error' || status === 'disconnected'

          return (
            <div key={p} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{PLATFORM_ICONS[p]}</span>
                <span className="text-xs text-gray-300 capitalize">{p === 'x' ? 'X (Twitter)' : p}</span>
              </div>
              <span className={`text-xs font-bold ${ok ? 'text-green-400' : warn ? 'text-yellow-400' : err ? 'text-red-400' : 'text-gray-500'}`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Make Status ──────────────────────────────────────────────────────────────

function MakeStatus() {
  const [status, setStatus] = useState<{ ok: boolean; platforms: Record<string, { configured: boolean }> } | null>(null)

  useEffect(() => {
    fetch('/api/make/status').then(r => r.ok ? r.json() : null).then(d => d && setStatus(d)).catch(() => {})
  }, [])

  if (!status) return null

  const platforms = Object.entries(status.platforms ?? {})
  const configured = platforms.filter(([, v]) => v.configured).length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-400 font-bold tracking-wider">⚙️ MAKE.COM WEBHOOKS</div>
        <Link href="/make" className="text-xs text-yellow-400 hover:text-yellow-300">Setup →</Link>
      </div>
      <div className="text-xs text-gray-500 mb-2">{configured}/{platforms.length} configured</div>
      <div className="flex flex-wrap gap-1">
        {platforms.map(([name, v]) => (
          <span key={name} className={`px-1.5 py-0.5 rounded text-xs ${
            v.configured ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-600'
          }`}>{name}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed({ activity, sseConnected }: { activity: ActivityItem[]; sseConnected: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  const COMPANY_COLOR: Record<string, string> = {
    xforce: 'text-sky-400', linkedelite: 'text-blue-400', gramgod: 'text-pink-400',
    pagepower: 'text-blue-300', webboss: 'text-green-400', intelcore: 'text-purple-400',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col" style={{ height: '400px' }}>
      <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider flex items-center gap-2">
        📊 LIVE ACTIVITY
        <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-gray-600 font-normal ml-1">{activity.length}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
        {activity.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-10">
            <div className="text-3xl mb-3">🤖</div>
            <div className="font-bold text-gray-500">Agents are standing by</div>
            <div className="text-gray-700 mt-1">Click Initialize → Run Work Loop to activate</div>
          </div>
        ) : (
          activity.map((item, i) => (
            <div key={`${item?.id ?? ''}-${i}`}
              className="border border-gray-800 rounded p-2 text-xs hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-bold ${COMPANY_COLOR[item?.company ?? ''] ?? 'text-purple-400'}`}>
                  {item?.agentName ?? '—'}
                </span>
                <div className="flex items-center gap-1.5">
                  {item?.platform && <span>{PLATFORM_ICONS[item.platform] ?? item.platform}</span>}
                  <span className="text-gray-700">{safeTime(item?.timestamp)}</span>
                </div>
              </div>
              <div className="text-gray-500">{(item?.type ?? '').replace(/_/g, ' ')}</div>
              {item?.contentPreview && (
                <div className="text-gray-400 mt-0.5 line-clamp-2">{item.contentPreview}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Sovereign Command ────────────────────────────────────────────────────────

function SovereignCommand() {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const send = useCallback(async () => {
    if (!command.trim()) return
    setLoading(true)
    setResult(null)
    const cmd = command
    setCommand('')
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cmd }),
      })
      const d = await res.json().catch(() => ({})) as Record<string, string>
      setResult(d.plan ?? d.error ?? 'Command received.')
      setHistory(h => [cmd, ...h].slice(0, 5))
    } catch {
      setResult('Command failed — check system status.')
    } finally {
      setLoading(false)
    }
  }, [command])

  const QUICK = [
    'Post AI news update to Instagram and LinkedIn',
    'Analyze trending AI topics and create 3 posts',
    'Reply to all pending Instagram DMs',
    'Create a LinkedIn thought leadership post',
    'Run full content cycle for all platforms',
  ]

  return (
    <div className="bg-gray-900 border border-purple-900/50 rounded-lg p-4">
      <div className="text-xs text-purple-400 mb-3 font-bold tracking-wider">👑 SOVEREIGN COMMAND</div>
      <div className="flex gap-2">
        <input
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Command SOVEREIGN — your AI empire awaits..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button onClick={send} disabled={loading || !command.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded text-sm font-bold transition-colors">
          {loading ? '...' : 'SEND'}
        </button>
      </div>

      <div className="flex gap-1 flex-wrap mt-2">
        {QUICK.map(cmd => (
          <button key={cmd} onClick={() => setCommand(cmd)}
            className="text-xs text-gray-600 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors truncate max-w-[200px]">
            {cmd}
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-3 p-3 bg-gray-800 rounded text-xs text-gray-300 leading-relaxed border-l-2 border-purple-500 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {result}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-2 text-xs text-gray-700 truncate">
          Recent:{' '}
          {history.slice(0, 3).map((h, i) => (
            <button key={i} onClick={() => setCommand(h)}
              className="hover:text-gray-500 mr-2 underline underline-offset-2">
              {h.slice(0, 20)}…
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EmpireOverview() {
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({})
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [connections, setConnections] = useState<PlatformConn[]>([])
  const [sseConnected, setSseConnected] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Auto-init on cold start
  useEffect(() => {
    fetch('/api/agents/startup', { method: 'POST' }).catch(() => {})
  }, [])

  // SSE: agent statuses
  useEffect(() => {
    let es: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        es = new EventSource('/api/agents/status')
        es.onopen = () => setSseConnected(true)
        es.onmessage = (e) => {
          try {
            const d = safeJson(e.data) as Record<string, unknown> | null
            if (!d) return
            if (d.type === 'initial' && Array.isArray(d.agents)) {
              const map: Record<string, AgentStatus> = {}
              for (const a of d.agents as AgentStatus[]) {
                if (a?.name) map[a.name] = { name: a.name, status: a.status ?? 'idle', last_heartbeat: a.last_heartbeat }
              }
              setAgents(map)
            } else if (d.type === 'update' && d.agentName) {
              setAgents(prev => ({
                ...prev,
                [d.agentName as string]: {
                  name: d.agentName as string,
                  status: (d.status as string) ?? 'idle',
                  currentTask: d.currentTask as string | undefined,
                },
              }))
            }
          } catch {}
        }
        es.onerror = () => {
          setSseConnected(false)
          es?.close()
          timer = setTimeout(connect, 5000)
        }
      } catch {}
    }

    connect()
    return () => { es?.close(); if (timer) clearTimeout(timer) }
  }, [])

  // SSE: activity
  useEffect(() => {
    let es: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        es = new EventSource('/api/activity')
        es.onmessage = (e) => {
          try {
            const d = safeJson(e.data) as Record<string, unknown> | null
            if (!d) return
            let item: ActivityItem | null = null
            if (d.type === 'initial' && d.action && typeof d.action === 'object') {
              item = d.action as ActivityItem
            } else if (d.agentName) {
              item = d as ActivityItem
            }
            if (item) setActivity(prev => [item!, ...prev].slice(0, 200))
          } catch {}
        }
        es.onerror = () => { es?.close(); timer = setTimeout(connect, 5000) }
      } catch {}
    }

    connect()
    return () => { es?.close(); if (timer) clearTimeout(timer) }
  }, [])

  // Platform connections (refresh every 60s)
  useEffect(() => {
    const load = () => {
      fetch('/api/connections')
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? setConnections(d) : null)
        .catch(() => {})
    }
    load()
    const i = setInterval(load, 60000)
    return () => clearInterval(i)
  }, [refreshKey])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 font-black tracking-widest">PROPOST</span>
          <span className="text-gray-700 text-xs hidden md:block">EMPIRE</span>
          <div className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}
            title={sseConnected ? 'Live connection' : 'Reconnecting'} />
        </div>
        <div className="flex items-center gap-0.5 text-xs flex-wrap">
          {[
            { href: '/monitor', label: 'Monitor' },
            { href: '/tasks', label: 'Tasks' },
            { href: '/inbox', label: 'Inbox' },
            { href: '/content', label: 'Calendar' },
            { href: '/analytics', label: 'Analytics' },
            { href: '/memory', label: 'Memory' },
            { href: '/office', label: 'Office' },
            { href: '/connect', label: 'Connect', color: 'text-blue-400' },
            { href: '/make', label: 'Make.com', color: 'text-yellow-400' },
            { href: '/settings', label: 'Settings' },
          ].map(link => (
            <Link key={link.href} href={link.href}
              className={`px-2 py-1 rounded hover:bg-gray-800 transition-colors ${link.color ?? 'text-gray-400 hover:text-white'}`}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <StatsBar agents={agents} />

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left: 8 cols */}
          <div className="col-span-8 space-y-4">
            <SovereignCommand />
            <SystemControls onRefresh={refresh} />
            <CompanyGrid agents={agents} />
          </div>

          {/* Right: 4 cols */}
          <div className="col-span-4 space-y-4">
            <PlatformStatus connections={connections} refreshKey={refreshKey} />
            <MakeStatus />
            <ActivityFeed activity={activity} sseConnected={sseConnected} />

            {/* Quick access grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/inbox', label: '📋 Approval Queue', color: 'text-yellow-400' },
                { href: '/monitor', label: '🖥️ Agent Monitor', color: 'text-blue-400' },
                { href: '/analytics', label: '📈 Analytics', color: 'text-green-400' },
                { href: '/memory', label: '🧠 Memory', color: 'text-purple-400' },
                { href: '/tasks', label: '✅ Task Board', color: 'text-cyan-400' },
                { href: '/content', label: '🗓️ Calendar', color: 'text-pink-400' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className={`text-xs ${link.color} bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded p-2 text-center transition-colors`}>
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
