'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
  name: string
  status: 'idle' | 'active' | 'paused' | 'error' | 'unresponsive'
  currentTask?: string
  lastActionTime?: string
}

interface ActivityItem {
  id: string
  type: string
  agentName: string
  company: string
  platform?: string
  contentPreview?: string
  timestamp: string
}

interface PlatformConn {
  platform: string
  status: string
  last_verified?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANIES = [
  { id: 'xforce',      label: 'XForce Corp',      ceo: 'ZARA',    color: '#1d9bf0', icon: '𝕏',  room: 'War Room',       href: '/monitor?company=xforce' },
  { id: 'linkedelite', label: 'LinkedElite Corp',  ceo: 'NOVA',    color: '#0a66c2', icon: 'in', room: 'Boardroom',      href: '/monitor?company=linkedelite' },
  { id: 'gramgod',     label: 'GramGod Corp',      ceo: 'AURORA',  color: '#e1306c', icon: '◈',  room: 'Studio',         href: '/monitor?company=gramgod' },
  { id: 'pagepower',   label: 'PagePower Corp',    ceo: 'CHIEF',   color: '#1877f2', icon: 'f',  room: 'Community Hall', href: '/monitor?company=pagepower' },
  { id: 'webboss',     label: 'WebBoss Corp',      ceo: 'ROOT',    color: '#22c55e', icon: '⬡',  room: 'Engine Room',    href: '/monitor?company=webboss' },
  { id: 'intelcore',   label: 'IntelCore HQ',      ceo: 'ORACLE',  color: '#a855f7', icon: '◎',  room: 'Situation Room', href: '/monitor?company=intelcore' },
]

const STATUS_COLOR: Record<string, string> = {
  idle: 'bg-gray-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  unresponsive: 'bg-orange-500',
}

const PLATFORM_ICON: Record<string, string> = {
  x: '𝕏', instagram: '◈', facebook: 'f', linkedin: 'in', website: '⬡',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmpireOverview() {
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({})
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [connections, setConnections] = useState<PlatformConn[]>([])
  const [command, setCommand] = useState('')
  const [commandResult, setCommandResult] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)
  const activityRef = useRef<HTMLDivElement>(null)

  // SSE: agent statuses
  useEffect(() => {
    const es = new EventSource('/api/agents/status')
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'initial' && Array.isArray(data.agents)) {
        const map: Record<string, AgentStatus> = {}
        for (const a of data.agents) map[a.name] = { name: a.name, status: a.status }
        setAgents(map)
      } else if (data.type === 'update') {
        setAgents((prev) => ({ ...prev, [data.agentName]: { name: data.agentName, status: data.status, currentTask: data.currentTask } }))
      }
    }
    return () => es.close()
  }, [])

  // SSE: activity feed
  useEffect(() => {
    const es = new EventSource('/api/activity')
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'initial' && data.action) {
        setActivity((prev) => [data.action, ...prev].slice(0, 100))
      } else if (data.agentName) {
        setActivity((prev) => [data, ...prev].slice(0, 100))
      }
    }
    return () => es.close()
  }, [])

  // Platform connections
  useEffect(() => {
    fetch('/api/connections').then((r) => r.json()).then(setConnections).catch(() => {})
  }, [])

  // Auto-scroll activity
  useEffect(() => {
    if (activityRef.current) activityRef.current.scrollTop = 0
  }, [activity])

  const sendCommand = async () => {
    if (!command.trim()) return
    setCommandLoading(true)
    setCommandResult(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: command }),
      })
      const data = await res.json()
      setCommandResult(data.plan ?? data.error ?? 'Command received.')
    } catch {
      setCommandResult('Command failed — check system status.')
    } finally {
      setCommandLoading(false)
      setCommand('')
    }
  }

  const getCEOStatus = (ceoName: string) => agents[ceoName]?.status ?? 'idle'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Nav */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 text-xl font-bold tracking-widest">PROPOST</span>
          <span className="text-gray-600 text-xs">EMPIRE COMMAND CENTER</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <Link href="/monitor" className="hover:text-white transition-colors">Monitor</Link>
          <Link href="/tasks" className="hover:text-white transition-colors">Tasks</Link>
          <Link href="/inbox" className="hover:text-white transition-colors">Inbox</Link>
          <Link href="/content" className="hover:text-white transition-colors">Calendar</Link>
          <Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          <Link href="/memory" className="hover:text-white transition-colors">Memory</Link>
          <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
        </div>
      </nav>

      <div className="p-6 grid grid-cols-12 gap-4">
        {/* Left: Company Map + Command */}
        <div className="col-span-8 space-y-4">
          {/* Command Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-2 font-bold tracking-wider">SOVEREIGN COMMAND</div>
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                placeholder="Give SOVEREIGN a command... e.g. 'Draft a thread on the latest AI news'"
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

          {/* Company Map */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">COMPANY MAP</div>
            <div className="grid grid-cols-3 gap-3">
              {COMPANIES.map((co) => {
                const ceoStatus = getCEOStatus(co.ceo)
                const activeAgents = Object.values(agents).filter(
                  (a) => a.status === 'active' && a.name !== co.ceo
                ).length
                return (
                  <Link key={co.id} href={co.href}>
                    <div
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                      style={{ borderColor: co.color + '44' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold" style={{ color: co.color }}>{co.icon}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${STATUS_COLOR[ceoStatus]}`} />
                          {ceoStatus === 'active' && (
                            <div className={`w-2 h-2 rounded-full ${STATUS_COLOR[ceoStatus]} animate-ping absolute`} />
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-200">{co.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">CEO: {co.ceo}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{co.room}</div>
                      {activeAgents > 0 && (
                        <div className="mt-2 text-xs" style={{ color: co.color }}>
                          {activeAgents} agent{activeAgents > 1 ? 's' : ''} active
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Virtual Office Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-bold tracking-wider">VIRTUAL OFFICE</div>
              <Link href="/office" className="text-xs text-purple-400 hover:text-purple-300">Open Full View →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COMPANIES.map((co) => {
                const ceoStatus = getCEOStatus(co.ceo)
                return (
                  <div
                    key={co.id}
                    className="rounded p-2 border text-center"
                    style={{ borderColor: co.color + '33', backgroundColor: co.color + '11' }}
                  >
                    <div className="text-2xl mb-1">{getAgentEmoji(ceoStatus)}</div>
                    <div className="text-xs font-bold" style={{ color: co.color }}>{co.room}</div>
                    <div className="text-xs text-gray-500">{co.ceo}</div>
                    <div className={`text-xs mt-1 ${ceoStatus === 'active' ? 'text-green-400' : 'text-gray-600'}`}>
                      {ceoStatus}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Activity Feed + Platform Status */}
        <div className="col-span-4 space-y-4">
          {/* Platform Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">PLATFORM STATUS</div>
            <div className="space-y-2">
              {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => {
                const conn = connections.find((c) => c.platform === p)
                const status = conn?.status ?? 'unknown'
                return (
                  <div key={p} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center text-gray-400">{PLATFORM_ICON[p]}</span>
                      <span className="text-xs text-gray-300 capitalize">{p}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        status === 'connected' ? 'bg-green-500' :
                        status === 'expired' ? 'bg-yellow-500' :
                        status === 'error' ? 'bg-red-500' : 'bg-gray-600'
                      }`} />
                      <span className={`text-xs ${
                        status === 'connected' ? 'text-green-400' :
                        status === 'expired' ? 'text-yellow-400' :
                        status === 'error' ? 'text-red-400' : 'text-gray-500'
                      }`}>{status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col" style={{ height: '480px' }}>
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider flex items-center gap-2">
              LIVE ACTIVITY
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div ref={activityRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
              {activity.length === 0 ? (
                <div className="text-xs text-gray-600 text-center py-8">Waiting for agent activity...</div>
              ) : (
                activity.map((item, i) => (
                  <div key={item.id ?? i} className="border border-gray-800 rounded p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-400 font-bold">{item.agentName}</span>
                      {item.platform && (
                        <span className="text-gray-500">{PLATFORM_ICON[item.platform] ?? item.platform}</span>
                      )}
                    </div>
                    <div className="text-gray-400">{item.type?.replace(/_/g, ' ')}</div>
                    {item.contentPreview && (
                      <div className="text-gray-500 mt-1 truncate">{item.contentPreview}</div>
                    )}
                    <div className="text-gray-700 mt-1">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                    </div>
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

function getAgentEmoji(status: string): string {
  switch (status) {
    case 'active': return '🟢'
    case 'idle': return '💤'
    case 'paused': return '⏸️'
    case 'error': return '🔴'
    case 'unresponsive': return '⚠️'
    default: return '⬜'
  }
}
