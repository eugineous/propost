'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import HQOffice from '@/components/hq/HQOffice'
import ActivityFeed from '@/components/ActivityFeed'
import MetricsPanel from '@/components/MetricsPanel'
import CommandPanel from '@/components/CommandPanel'
import WatercoolerChat from '@/components/WatercoolerChat'
import type { CharacterState } from '@/lib/types'

const NAV_LINKS = [
  { href: '/', label: '🏢 Empire' },
  { href: '/monitor', label: '🖥️ Monitor' },
  { href: '/analytics', label: '📊 Analytics' },
  { href: '/inbox', label: '📥 Inbox' },
  { href: '/content', label: '📝 Content' },
  { href: '/brand-deals', label: '💰 Brand Deals' },
  { href: '/messages', label: '💬 Messages' },
  { href: '/settings', label: '⚙️ Settings' },
]

function NairobiClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const eat = new Intl.DateTimeFormat('en-KE', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now)
      setTime(eat)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="font-mono" style={{ fontSize: 8, color: '#64748B' }}>
      🕐 {time} EAT
    </span>
  )
}

export default function DashboardClient() {
  const [agentStates, setAgentStates] = useState<Record<string, CharacterState>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [empireStatus, setEmpireStatus] = useState<'starting' | 'online'>('starting')
  const [liveStats, setLiveStats] = useState<{ totalActionsToday: number; postsToday: number; trendsToday: number } | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // Poll agent states from live monitor every 15s
  useEffect(() => {
    const fetchAgentStates = async () => {
      try {
        const res = await fetch('/api/monitor/live')
        const json = await res.json() as { ok: boolean; agents?: Array<{ agentName: string; status: 'active' | 'idle' }> }
        if (json.ok && json.agents) {
          const states: Record<string, CharacterState> = {}
          for (const agent of json.agents) {
            states[agent.agentName.toUpperCase()] = agent.status === 'active' ? 'active' : 'idle'
          }
          setAgentStates(states)
        }
      } catch {
        // ignore
      }
    }
    fetchAgentStates()
    const interval = setInterval(fetchAgentStates, 15000)
    return () => clearInterval(interval)
  }, [])

  // Fire autonomous startup on mount
  useEffect(() => {
    fetch('/api/agents/startup', { method: 'POST' })
      .then(() => setEmpireStatus('online'))
      .catch(() => setEmpireStatus('online'))
  }, [])

  // Poll live stats every 60s
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/monitor/live')
        const json = await res.json() as { ok: boolean; totalActionsToday?: number; postsToday?: number; trendsToday?: number }
        if (json.ok) {
          setLiveStats({
            totalActionsToday: json.totalActionsToday ?? 0,
            postsToday: json.postsToday ?? 0,
            trendsToday: json.trendsToday ?? 0,
          })
        }
      } catch {
        // ignore
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  // Poll pending messages for notification count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/inbox')
        const json = await res.json() as { ok: boolean; messages?: Array<{ status: string }> }
        if (json.ok) {
          const pending = (json.messages ?? []).filter((m) => m.status === 'pending').length
          setNotifCount(pending)
        }
      } catch {
        // ignore
      }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [])

  // Poll pending content approvals
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch('/api/content?status=draft')
        const json = await res.json() as { ok: boolean; items?: Array<unknown> }
        if (json.ok) setPendingApprovals((json.items ?? []).length)
      } catch {
        // ignore
      }
    }
    fetchApprovals()
    const interval = setInterval(fetchApprovals, 120000)
    return () => clearInterval(interval)
  }, [])

  const handleAgentClick = useCallback((agentName: string) => {
    setSelectedAgent(agentName)
  }, [])

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: '#0A0A14', color: '#E2E8F0' }}
    >
      {/* Top Navbar */}
      <nav
        className="flex items-center justify-between px-6 py-3 border-b border-pp-border flex-shrink-0"
        style={{ background: '#12121F' }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="pixel-text text-pp-gold" style={{ fontSize: 11 }}>
              PROPOST EMPIRE
            </span>
            <span
              className="px-1.5 py-0.5 rounded pixel-text"
              style={{ fontSize: 6, background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70044' }}
            >
              9 COMPANIES ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-pp-muted hover:text-pp-text transition-colors relative"
                style={{ fontSize: 10, fontFamily: 'monospace' }}
              >
                {link.label}
                {link.href === '/content' && pendingApprovals > 0 && (
                  <span
                    className="absolute -top-1 -right-2 flex items-center justify-center rounded-full font-mono font-bold"
                    style={{ width: 12, height: 12, background: '#FBBF24', color: '#0A0A14', fontSize: 6 }}
                  >
                    {pendingApprovals > 9 ? '9+' : pendingApprovals}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NairobiClock />
          {liveStats && (
            <div className="flex items-center gap-3" style={{ fontSize: 8, fontFamily: 'monospace' }}>
              <span style={{ color: '#FFD700' }}>{liveStats.totalActionsToday} actions</span>
              <span style={{ color: '#1DA1F2' }}>{liveStats.postsToday} posts</span>
              <span style={{ color: '#E1306C' }}>{liveStats.trendsToday} trends</span>
            </div>
          )}
          {/* Notification bell */}
          <Link href="/inbox" className="relative flex items-center" style={{ fontSize: 14 }}>
            🔔
            {notifCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-mono font-bold"
                style={{
                  width: 14,
                  height: 14,
                  background: '#EF4444',
                  color: '#fff',
                  fontSize: 7,
                }}
              >
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>
          <div
            className="flex items-center gap-2 px-2 py-1 rounded"
            style={{ background: empireStatus === 'online' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', fontSize: 8, fontFamily: 'monospace' }}
          >
            <div
              className="rounded-full"
              style={{
                width: 6, height: 6,
                background: empireStatus === 'online' ? '#22C55E' : '#FBBF24',
                boxShadow: empireStatus === 'online' ? '0 0 6px #22C55E' : '0 0 6px #FBBF24',
              }}
            />
            <span style={{ color: empireStatus === 'online' ? '#22C55E' : '#FBBF24' }}>
              {empireStatus === 'online' ? '31 AGENTS ACTIVE' : 'STARTING UP...'}
            </span>
          </div>
          <div className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>
            👑 EUGINE MICAH — FOUNDER
          </div>
        </div>
      </nav>

      {/* 3-column grid */}
      <div
        className="flex-1 grid overflow-hidden"
        style={{
          gridTemplateColumns: '280px 1fr 320px',
          minHeight: 0,
        }}
      >
        {/* Left — Metrics Panel */}
        <aside
          className="border-r border-pp-border overflow-y-auto"
          style={{ background: '#12121F' }}
        >
          <MetricsPanel />
        </aside>

        {/* Center — Canvas + Activity Feed */}
        <main className="flex flex-col overflow-hidden">
          <div
            className="flex-shrink-0 p-2 border-b border-pp-border"
            style={{ background: '#0A0A14' }}
          >
            {selectedAgent && (
              <div
                className="mb-2 px-2 py-1 rounded text-pp-gold pixel-text flex items-center justify-between"
                style={{ fontSize: 8, background: '#1E1E3A' }}
              >
                <span>Agent: {selectedAgent}</span>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-pp-muted hover:text-pp-text ml-4"
                >
                  ✕
                </button>
              </div>
            )}
            <HQOffice agentStates={agentStates} onAgentClick={handleAgentClick} />
          </div>

          <div className="flex-1 overflow-hidden" style={{ background: '#0D0D1A' }}>
            <ActivityFeed />
          </div>
        </main>

        {/* Right — Command Panel + Watercooler */}
        <aside
          className="border-l border-pp-border overflow-y-auto flex flex-col"
          style={{ background: '#12121F' }}
        >
          <div className="flex-1 overflow-y-auto">
            <CommandPanel agentStates={agentStates} />
          </div>
          <div className="border-t border-pp-border flex-shrink-0">
            <WatercoolerChat />
          </div>
        </aside>
      </div>
    </div>
  )
}
