'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import OfficeCanvas from '@/components/OfficeCanvas'
import ActivityFeed from '@/components/ActivityFeed'
import MetricsPanel from '@/components/MetricsPanel'
import CommandPanel from '@/components/CommandPanel'
import type { CharacterState } from '@/lib/types'

const NAV_LINKS = [
  { href: '/', label: 'Empire' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Settings' },
]

export default function DashboardPage() {
  const [agentStates] = useState<Record<string, CharacterState>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

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
        <div className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>
          👑 EUGINE MICAH — FOUNDER
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
          {/* Canvas */}
          <div
            className="flex-shrink-0 p-3 border-b border-pp-border"
            style={{ background: '#0A0A14' }}
          >
            {selectedAgent && (
              <div
                className="mb-2 px-2 py-1 rounded text-pp-gold pixel-text"
                style={{ fontSize: 8, background: '#1E1E3A' }}
              >
                Selected: {selectedAgent}{' '}
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-pp-muted ml-2 hover:text-pp-text"
                >
                  ✕
                </button>
              </div>
            )}
            <OfficeCanvas agentStates={agentStates} onAgentClick={handleAgentClick} />
          </div>

          {/* Activity Feed */}
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
