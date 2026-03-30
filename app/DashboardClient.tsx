'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import EmpireOffice from '@/components/EmpireOffice'

interface LiveStats {
  totalActionsToday: number
  postsToday: number
  trendsToday: number
  activeAgents: number
}

interface FeedItem {
  id: string
  agentName: string
  company: string
  actionType: string
  outcome: string
  createdAt: string
  details?: { summary?: string }
}

function NairobiClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date()))
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])
  return <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace' }}>🕐 {time} EAT</span>
}

function ActivityFeed({ items }: { items: FeedItem[] }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [items.length])
  const oc = (o: string) => o === 'success' ? '#22C55E' : o === 'error' ? '#EF4444' : '#F59E0B'
  const ac = (c: string) => ({ intelcore:'#FFD700',xforce:'#1DA1F2',gramgod:'#E1306C',linkedelite:'#0077B5',pagepower:'#1877F2',webboss:'#22C55E',hrforce:'#F97316',legalshield:'#EF4444',financedesk:'#10B981' }[c] ?? '#888')
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 8, color: '#FFD700' }}>⚡ ACTIVITY FEED</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px #22C55E' }} />
          <span style={{ fontSize: 7, color: '#22C55E' }}>LIVE</span>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ color: '#333', fontSize: 9, textAlign: 'center', marginTop: 20 }}>Waiting for activity...</div>
      ) : items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5, padding: '4px 6px', borderRadius: 3, background: '#0d0d1a', borderLeft: `2px solid ${ac(item.company)}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
              <span style={{ fontSize: 8, color: ac(item.company), fontWeight: 'bold' }}>{item.agentName.toUpperCase()}</span>
              <span style={{ fontSize: 7, color: '#555' }}>{item.actionType}</span>
              <span style={{ fontSize: 7, color: oc(item.outcome), marginLeft: 'auto' }}>{item.outcome === 'success' ? '✓' : '✗'}</span>
            </div>
            {item.details?.summary && <div style={{ fontSize: 7, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.details.summary}</div>}
          </div>
          <div style={{ fontSize: 6, color: '#333', whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

function CommandCenter({ onCommand }: { onCommand: () => void }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<Array<{ cmd: string; res: string; ok: boolean }>>([])
  const [loading, setLoading] = useState(false)
  const QUICK = [
    { label: '📸 Clear IG DMs', cmd: 'clear instagram dms' },
    { label: '📈 Find trends', cmd: 'find trending topics kenya' },
    { label: '✍️ Write tweet', cmd: 'write a viral tweet about nairobi tech' },
    { label: '📊 Daily briefing', cmd: 'give me a daily briefing' },
    { label: '🚀 Post to X now', cmd: 'post to x immediately' },
    { label: '🛡️ Crisis check', cmd: 'check for any crisis signals' },
    { label: '💰 Check deals', cmd: 'check brand deal pipeline' },
    { label: '🧠 Learn patterns', cmd: 'analyze post performance patterns' },
  ]
  const submit = async (cmd: string) => {
    if (!cmd.trim() || loading) return
    setLoading(true); setInput('')
    try {
      const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) })
      const data = await res.json() as { ok: boolean; response?: string; error?: string }
      setHistory(h => [...h.slice(-19), { cmd, res: data.response ?? data.error ?? 'Done', ok: data.ok }])
      onCommand()
    } catch { setHistory(h => [...h.slice(-19), { cmd, res: 'Network error', ok: false }]) }
    finally { setLoading(false) }
  }
  return (
    <div style={{ padding: 12, fontFamily: 'monospace', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 8, color: '#FFD700', marginBottom: 8 }}>👑 FOUNDER COMMAND CENTER</div>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8, minHeight: 0 }}>
        {history.length === 0 ? <div style={{ fontSize: 8, color: '#333', textAlign: 'center', marginTop: 12 }}>Tell your empire what to do...</div>
          : history.map((h, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 8, color: '#64748B' }}>› {h.cmd}</div>
              <div style={{ fontSize: 8, color: h.ok ? '#22C55E' : '#EF4444', paddingLeft: 8 }}>{h.res.slice(0, 200)}</div>
            </div>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit(input)}
          placeholder="Issue a command..." disabled={loading}
          style={{ flex: 1, background: '#0d0d1a', border: '1px solid #1e1e3a', color: '#E2E8F0', borderRadius: 4, padding: '6px 8px', fontSize: 9, fontFamily: 'monospace', outline: 'none' }} />
        <button onClick={() => submit(input)} disabled={loading || !input.trim()}
          style={{ background: '#FFD70015', border: '1px solid #FFD70044', color: '#FFD700', borderRadius: 4, padding: '6px 10px', fontSize: 9, cursor: 'pointer', fontFamily: 'monospace' }}>
          {loading ? '...' : '▶'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {QUICK.map(q => (
          <button key={q.cmd} onClick={() => submit(q.cmd)} disabled={loading}
            style={{ background: '#0d0d1a', border: '1px solid #1e1e3a', color: '#94A3B8', borderRadius: 3, padding: '4px 6px', fontSize: 7, cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}>
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MetricsPanel({ stats }: { stats: LiveStats | null }) {
  return (
    <div style={{ padding: 12, fontFamily: 'monospace' }}>
      <div style={{ fontSize: 8, color: '#FFD700', marginBottom: 10 }}>📊 LIVE METRICS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'ACTIONS', value: stats?.totalActionsToday ?? 0, color: '#FFD700' },
          { label: 'POSTS', value: stats?.postsToday ?? 0, color: '#1DA1F2' },
          { label: 'TRENDS', value: stats?.trendsToday ?? 0, color: '#E1306C' },
          { label: 'AGENTS', value: stats?.activeAgents ?? 0, color: '#22C55E' },
        ].map(m => (
          <div key={m.label} style={{ background: '#0d0d1a', border: `1px solid ${m.color}22`, borderRadius: 4, padding: '6px 8px' }}>
            <div style={{ fontSize: 16, color: m.color, fontWeight: 'bold' }}>{m.value}</div>
            <div style={{ fontSize: 6, color: '#555' }}>{m.label} TODAY</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 12, padding: 8, background: '#0d0d1a', borderRadius: 4, border: '1px solid #1DA1F222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 7, color: '#1DA1F2' }}>𝕏 MONETIZATION</span>
          <span style={{ fontSize: 7, color: '#555' }}>5M goal</span>
        </div>
        <div style={{ background: '#1a1a2e', borderRadius: 3, height: 4 }}>
          <div style={{ background: '#1DA1F2', width: '2%', height: '100%', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 6, color: '#555', marginTop: 2 }}>0 / 5,000,000</div>
      </div>
      {[
        { name: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
        { name: 'Instagram', icon: '📸', color: '#E1306C' },
        { name: 'LinkedIn', icon: '💼', color: '#0077B5' },
        { name: 'Facebook', icon: '📘', color: '#1877F2' },
      ].map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #0d0d1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>{p.icon}</span>
            <span style={{ fontSize: 8, color: '#94A3B8' }}>{p.name}</span>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px #22C55E' }} />
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 7, color: '#555', marginBottom: 6 }}>QUICK OVERRIDES</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ label: '⏸ PAUSE ALL', color: '#F59E0B', cmd: 'PAUSE' }, { label: '▶ RESUME ALL', color: '#22C55E', cmd: 'RESUME' }].map(b => (
            <button key={b.cmd} onClick={() => fetch('/api/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: b.cmd, scope: 'all' }) })}
              style={{ flex: 1, background: `${b.color}15`, border: `1px solid ${b.color}44`, color: b.color, borderRadius: 3, padding: '4px 0', fontSize: 7, cursor: 'pointer', fontFamily: 'monospace' }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { href: '/', label: '🏢 Empire' },
  { href: '/monitor', label: '🖥️ Monitor' },
  { href: '/analytics', label: '📊 Analytics' },
  { href: '/workflows', label: '⚙️ Workflows' },
  { href: '/inbox', label: '📥 Inbox' },
  { href: '/content', label: '📝 Content' },
  { href: '/brand-deals', label: '💰 Brand Deals' },
  { href: '/messages', label: '💬 Messages' },
  { href: '/settings', label: '⚙️ Settings' },
]

export default function DashboardClient() {
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [empireOnline, setEmpireOnline] = useState(false)
  const [activeTab, setActiveTab] = useState<'office' | 'feed'>('office')

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/live')
      const data = await res.json() as { ok: boolean; totalActionsToday?: number; postsToday?: number; trendsToday?: number; agentList?: Array<{ status: string }> }
      if (data.ok) setStats({ totalActionsToday: data.totalActionsToday ?? 0, postsToday: data.postsToday ?? 0, trendsToday: data.trendsToday ?? 0, activeAgents: (data.agentList ?? []).filter(a => a.status === 'active').length })
    } catch { /* ignore */ }
  }, [])

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/feed')
      const data = await res.json() as { ok: boolean; actions?: FeedItem[] }
      if (data.ok && data.actions) setFeed(data.actions.slice(0, 50))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/agents/startup', { method: 'POST' }),
      fetch('/api/cron/autopilot', { headers: { 'x-internal-secret': 'propost-internal-649185875-secret' } }),
    ]).finally(() => setEmpireOnline(true))
    fetchLive(); fetchFeed()
    const li = setInterval(fetchLive, 15000)
    const fi = setInterval(fetchFeed, 5000)
    return () => { clearInterval(li); clearInterval(fi) }
  }, [fetchLive, fetchFeed])

  useEffect(() => {
    fetch('/api/inbox').then(r => r.json()).then((d: { ok: boolean; messages?: Array<{ status: string }> }) => { if (d.ok) setNotifCount((d.messages ?? []).filter(m => m.status === 'pending').length) }).catch(() => {})
    fetch('/api/content?status=draft').then(r => r.json()).then((d: { ok: boolean; items?: unknown[] }) => { if (d.ok) setPendingApprovals((d.items ?? []).length) }).catch(() => {})
  }, [])

  const refresh = useCallback(() => { fetchLive(); fetchFeed() }, [fetchLive, fetchFeed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0A0A14', color: '#E2E8F0', overflow: 'hidden' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 44, background: '#12121F', borderBottom: '1px solid #1E1E3A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#FFD700' }}>PROPOST EMPIRE</span>
            <span style={{ fontSize: 6, background: '#FFD70015', color: '#FFD700', border: '1px solid #FFD70033', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace' }}>9 CORPS ACTIVE</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} style={{ fontSize: 9, color: '#64748B', textDecoration: 'none', fontFamily: 'monospace', position: 'relative' }}>
                {link.label}
                {link.href === '/content' && pendingApprovals > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -6, background: '#FBBF24', color: '#000', borderRadius: '50%', width: 10, height: 10, fontSize: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendingApprovals}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NairobiClock />
          {stats && (
            <div style={{ display: 'flex', gap: 8, fontSize: 8, fontFamily: 'monospace' }}>
              <span style={{ color: '#FFD700' }}>{stats.totalActionsToday} actions</span>
              <span style={{ color: '#1DA1F2' }}>{stats.postsToday} posts</span>
              <span style={{ color: '#E1306C' }}>{stats.trendsToday} trends</span>
            </div>
          )}
          <Link href="/inbox" style={{ position: 'relative', fontSize: 14, textDecoration: 'none' }}>
            🔔
            {notifCount > 0 && <span style={{ position: 'absolute', top: -2, right: -4, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 12, height: 12, fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount}</span>}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontFamily: 'monospace' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: empireOnline ? '#22C55E' : '#F59E0B', boxShadow: `0 0 6px ${empireOnline ? '#22C55E' : '#F59E0B'}` }} />
            <span style={{ color: empireOnline ? '#22C55E' : '#F59E0B' }}>{empireOnline ? '47 AGENTS ACTIVE' : 'BOOTING...'}</span>
          </div>
          <span style={{ fontSize: 8, color: '#FFD700', fontFamily: 'monospace' }}>👑 EUGINE MICAH</span>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr 300px', minHeight: 0, overflow: 'hidden' }}>
        <aside style={{ background: '#12121F', borderRight: '1px solid #1E1E3A', overflowY: 'auto' }}>
          <MetricsPanel stats={stats} />
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A14' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1E1E3A', flexShrink: 0 }}>
            {[{ id: 'office', label: '🏢 VIRTUAL HQ' }, { id: 'feed', label: '⚡ ACTIVITY FEED' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as 'office' | 'feed')}
                style={{ padding: '8px 16px', fontSize: 8, fontFamily: 'monospace', background: activeTab === tab.id ? '#1E1E3A' : 'transparent', color: activeTab === tab.id ? '#FFD700' : '#64748B', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #FFD700' : '2px solid transparent', cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'office' ? <EmpireOffice /> : <ActivityFeed items={feed} />}
          </div>
        </main>

        <aside style={{ background: '#12121F', borderLeft: '1px solid #1E1E3A', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CommandCenter onCommand={refresh} />
        </aside>
      </div>
    </div>
  )
}
