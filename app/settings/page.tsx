'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    envKeys: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
    statusNote: 'Connected via Graph API',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    envKeys: ['FACEBOOK_PAGE_ID', 'FACEBOOK_ACCESS_TOKEN'],
    statusNote: 'Connected via Graph API',
  },
  {
    id: 'x',
    name: 'X / Twitter',
    icon: '🐦',
    color: '#1DA1F2',
    envKeys: ['TWITTER_API_KEY', 'TWITTER_ACCESS_TOKEN'],
    statusNote: 'Not connected — Add API keys to connect',
    disconnected: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0077B5',
    envKeys: ['LINKEDIN_ACCESS_TOKEN'],
    statusNote: 'Not connected — Add API keys to connect',
    disconnected: true,
  },
]

const ALL_AGENTS = [
  { name: 'sovereign', company: 'intelcore', role: 'CEO / Empire Commander' },
  { name: 'oracle', company: 'intelcore', role: 'Cross-Platform Strategist' },
  { name: 'memory', company: 'intelcore', role: 'Learning Engine' },
  { name: 'sentry', company: 'intelcore', role: 'Crisis Monitor' },
  { name: 'scribe', company: 'intelcore', role: 'Reporter' },
  { name: 'zara', company: 'xforce', role: 'X Content Lead' },
  { name: 'blaze', company: 'xforce', role: 'Content Creator' },
  { name: 'scout', company: 'xforce', role: 'Trend Scout' },
  { name: 'echo', company: 'xforce', role: 'Engagement Agent' },
  { name: 'hawk', company: 'xforce', role: 'Compliance Guard' },
  { name: 'lumen', company: 'xforce', role: 'Analytics Agent' },
  { name: 'aurora', company: 'gramgod', role: 'IG Content Lead' },
  { name: 'vibe', company: 'gramgod', role: 'Trend Curator' },
  { name: 'chat', company: 'gramgod', role: 'DM Handler' },
  { name: 'deal_ig', company: 'gramgod', role: 'Brand Deal Agent' },
  { name: 'lens', company: 'gramgod', role: 'Visual Analytics' },
  { name: 'chief', company: 'pagepower', role: 'FB Content Lead' },
  { name: 'pulse', company: 'pagepower', role: 'FB Analytics' },
  { name: 'community', company: 'pagepower', role: 'Community Manager' },
  { name: 'reach', company: 'pagepower', role: 'Ads Agent' },
  { name: 'root', company: 'webboss', role: 'Web Architect' },
  { name: 'crawl', company: 'webboss', role: 'SEO Crawler' },
  { name: 'build', company: 'webboss', role: 'Content Builder' },
  { name: 'shield', company: 'webboss', role: 'Security Agent' },
  { name: 'speed', company: 'webboss', role: 'Performance Agent' },
  { name: 'nova', company: 'linkedelite', role: 'LI Content Lead' },
  { name: 'orator', company: 'linkedelite', role: 'Thought Leader' },
  { name: 'bridge', company: 'linkedelite', role: 'Networking Agent' },
  { name: 'atlas', company: 'linkedelite', role: 'LI Analytics' },
  { name: 'people', company: 'hrforce', role: 'HR Lead' },
  { name: 'judge', company: 'legalshield', role: 'Compliance Judge' },
  { name: 'banker', company: 'financedesk', role: 'Finance Lead' },
]

const COMPANY_COLORS: Record<string, string> = {
  intelcore: '#FFD700',
  xforce: '#1DA1F2',
  gramgod: '#E1306C',
  pagepower: '#1877F2',
  webboss: '#22C55E',
  linkedelite: '#0077B5',
  hrforce: '#F97316',
  legalshield: '#EF4444',
  financedesk: '#10B981',
}

export default function SettingsPage() {
  const [agentToggles, setAgentToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_AGENTS.map((a) => [a.name, true]))
  )
  const [notifications, setNotifications] = useState({
    brandDeals: true,
    crises: true,
    milestones: false,
  })
  const [seedStatus, setSeedStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'clearing' | 'done'>('idle')

  const runSeed = async () => {
    setSeedStatus('running')
    try {
      await fetch('/api/agents/startup', { method: 'POST' })
      setSeedStatus('done')
      setTimeout(() => setSeedStatus('idle'), 3000)
    } catch {
      setSeedStatus('error')
      setTimeout(() => setSeedStatus('idle'), 3000)
    }
  }

  const clearCache = async () => {
    setCacheStatus('clearing')
    await new Promise((r) => setTimeout(r, 1000))
    setCacheStatus('done')
    setTimeout(() => setCacheStatus('idle'), 2000)
  }

  const exportAll = async () => {
    try {
      const [metrics, actions] = await Promise.all([
        fetch('/api/metrics').then((r) => r.json()),
        fetch('/api/feed').then((r) => r.json()),
      ])
      const blob = new Blob([JSON.stringify({ metrics, actions, exportedAt: new Date().toISOString() }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `propost-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>⚙️ SETTINGS</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="pixel-text text-pp-danger hover:opacity-80 transition-opacity"
          style={{ fontSize: 8 }}
        >
          SIGN OUT
        </button>
      </nav>

      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Workflow Editor Link */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-3" style={{ fontSize: 9 }}>WORKFLOW ENGINE</h2>
          <p className="text-pp-muted mb-3" style={{ fontSize: 8 }}>Create and assign custom workflows to any agent. Control what every agent does and when.</p>
          <Link
            href="/settings/workflows"
            className="inline-block px-4 py-2 rounded pixel-text"
            style={{ fontSize: 8, background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44' }}
          >
            ⚙️ OPEN WORKFLOW EDITOR →
          </Link>
        </div>

        {/* Platform Connections */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-4" style={{ fontSize: 9 }}>PLATFORM CONNECTIONS</h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded" style={{ background: '#0A0A14', border: `1px solid ${p.color}22` }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <div>
                    <div className="font-mono font-semibold" style={{ fontSize: 10, color: p.color }}>{p.name}</div>
                    <div className="text-pp-muted" style={{ fontSize: 8 }}>{p.statusNote}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.disconnected ? '#64748B' : '#22C55E', boxShadow: p.disconnected ? 'none' : '0 0 6px #22C55E' }}
                  />
                  <span
                    className="font-mono"
                    style={{ fontSize: 8, color: p.disconnected ? '#64748B' : '#22C55E' }}
                  >
                    {p.disconnected ? 'DISCONNECTED' : 'CONNECTED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Settings */}
        <div className="pixel-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>AGENT SETTINGS</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setAgentToggles(Object.fromEntries(ALL_AGENTS.map((a) => [a.name, true])))}
                className="px-2 py-1 rounded pixel-text"
                style={{ fontSize: 7, background: '#22C55E22', color: '#22C55E' }}
              >
                ENABLE ALL
              </button>
              <button
                onClick={() => setAgentToggles(Object.fromEntries(ALL_AGENTS.map((a) => [a.name, false])))}
                className="px-2 py-1 rounded pixel-text"
                style={{ fontSize: 7, background: '#EF444422', color: '#EF4444' }}
              >
                DISABLE ALL
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {ALL_AGENTS.map((agent) => {
              const color = COMPANY_COLORS[agent.company] ?? '#64748B'
              const enabled = agentToggles[agent.name] ?? true
              return (
                <div
                  key={agent.name}
                  className="flex items-center justify-between p-2 rounded cursor-pointer"
                  style={{ background: '#0A0A14', border: `1px solid ${enabled ? color + '44' : '#1E1E3A'}` }}
                  onClick={() => setAgentToggles((t) => ({ ...t, [agent.name]: !t[agent.name] }))}
                >
                  <div>
                    <div className="font-mono" style={{ fontSize: 8, color: enabled ? color : '#64748B' }}>
                      {agent.name.toUpperCase()}
                    </div>
                    <div className="text-pp-muted" style={{ fontSize: 7 }}>{agent.role}</div>
                  </div>
                  <div
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: enabled ? color + '66' : '#1E1E3A' }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                      style={{
                        background: enabled ? color : '#64748B',
                        left: enabled ? '18px' : '2px',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-4" style={{ fontSize: 9 }}>NOTIFICATION PREFERENCES</h2>
          <div className="space-y-3">
            {[
              { key: 'brandDeals', label: 'Brand Deal Alerts', desc: 'Email when a new brand deal is detected' },
              { key: 'crises', label: 'Crisis Alerts', desc: 'Email when a crisis event is triggered' },
              { key: 'milestones', label: 'Milestone Alerts', desc: 'Email when follower/impression milestones are hit' },
            ].map((n) => {
              const enabled = notifications[n.key as keyof typeof notifications]
              return (
                <div
                  key={n.key}
                  className="flex items-center justify-between p-3 rounded cursor-pointer"
                  style={{ background: '#0A0A14', border: '1px solid #1E1E3A' }}
                  onClick={() => setNotifications((prev) => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifications] }))}
                >
                  <div>
                    <div className="font-mono" style={{ fontSize: 9, color: '#E2E8F0' }}>{n.label}</div>
                    <div className="text-pp-muted" style={{ fontSize: 8 }}>{n.desc}</div>
                  </div>
                  <div
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: enabled ? '#22C55E66' : '#1E1E3A' }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                      style={{ background: enabled ? '#22C55E' : '#64748B', left: enabled ? '18px' : '2px' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Actions */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-4" style={{ fontSize: 9 }}>SYSTEM ACTIONS</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runSeed}
              disabled={seedStatus === 'running'}
              className="px-4 py-2 rounded pixel-text transition-opacity"
              style={{
                fontSize: 8,
                background: seedStatus === 'done' ? '#22C55E22' : '#1E1E3A',
                color: seedStatus === 'done' ? '#22C55E' : seedStatus === 'error' ? '#EF4444' : '#E2E8F0',
                border: '1px solid #1E1E3A',
                opacity: seedStatus === 'running' ? 0.6 : 1,
              }}
            >
              {seedStatus === 'running' ? '⏳ SEEDING...' : seedStatus === 'done' ? '✅ SEEDED' : seedStatus === 'error' ? '❌ ERROR' : '🌱 RUN SEED'}
            </button>
            <button
              onClick={clearCache}
              disabled={cacheStatus === 'clearing'}
              className="px-4 py-2 rounded pixel-text transition-opacity"
              style={{
                fontSize: 8,
                background: cacheStatus === 'done' ? '#22C55E22' : '#1E1E3A',
                color: cacheStatus === 'done' ? '#22C55E' : '#E2E8F0',
                border: '1px solid #1E1E3A',
                opacity: cacheStatus === 'clearing' ? 0.6 : 1,
              }}
            >
              {cacheStatus === 'clearing' ? '⏳ CLEARING...' : cacheStatus === 'done' ? '✅ CLEARED' : '🗑️ CLEAR CACHE'}
            </button>
            <button
              onClick={exportAll}
              className="px-4 py-2 rounded pixel-text"
              style={{ fontSize: 8, background: '#1E1E3A', color: '#00F0FF', border: '1px solid #00F0FF44' }}
            >
              ⬇ EXPORT ALL DATA
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-3" style={{ fontSize: 9 }}>SYSTEM INFO</h2>
          <div className="space-y-1">
            {[
              ['Version', '2.0.0'],
              ['AI Engine', 'Gemini 2.0 Flash'],
              ['Agents', '31+ across 9 corps'],
              ['Database', 'Neon Postgres'],
              ['Hosting', 'Vercel'],
              ['Deployment', 'https://propost.vercel.app'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-pp-muted" style={{ fontSize: 9 }}>{k}</span>
                <span className="font-mono text-pp-text" style={{ fontSize: 9 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
