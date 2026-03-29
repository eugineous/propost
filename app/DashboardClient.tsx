'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import OfficeCanvas from '@/components/OfficeCanvas'
import ActivityFeed from '@/components/ActivityFeed'
import MetricsPanel from '@/components/MetricsPanel'
import CommandPanel from '@/components/CommandPanel'
import type { CharacterState } from '@/lib/types'

const NAV_LINKS = [
  { href: '/', label: '🏢 Empire' },
  { href: '/analytics', label: '📊 Analytics' },
  { href: '/messages', label: '💬 Messages' },
  { href: '/settings', label: '⚙️ Settings' },
]

export default function DashboardClient() {
  const [agentStates] = useState<Record<string, CharacterState>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [empireStatus, setEmpireStatus] = useState<'starting' | 'online'>('starting')

  // Fire autonomous startup on mount
  useEffect(() => {
    fetch('/api/agents/startup', { method: 'POST' })
      .then(() => setEmpireStatus('online'))
      .catch(() => setEmpireStatus('online'))
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
        <div className="flex items-center gap-8">
          <span className="pixel-text text-pp-gold" style={{ fontSize: 11 }}>
            PROPOST EMPIRE
          </span>
          <div className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-pp-muted hover:text-pp-text transition-colors"
                style={{ fontSize: 10, fontFamily: 'monospace' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
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
            <OfficeCanvas agentStates={agentStates} onAgentClick={handleAgentClick} />
          </div>

          <div className="flex-1 overflow-hidden" style={{ background: '#0D0D1A' }}>
            <ActivityFeed />
          </div>
        </main>

        {/* Right — Command Panel */}
        <aside
          className="border-l border-pp-border overflow-y-auto"
          style={{ background: '#12121F' }}
        >
          <CommandPanel agentStates={agentStates} />
        </aside>
      </div>
    </div>
  )
}
