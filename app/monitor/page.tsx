'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const CORP_COLORS: Record<string, string> = {
  intelcore: '#FFD700',
  xforce: '#1DA1F2',
  linkedelite: '#0077B5',
  gramgod: '#E1306C',
  pagepower: '#1877F2',
  webboss: '#22C55E',
}

const CORP_LABELS: Record<string, string> = {
  intelcore: 'IntelCore',
  xforce: 'XForce',
  linkedelite: 'LinkedElite',
  gramgod: 'GramGod',
  pagepower: 'PagePower',
  webboss: 'WebBoss',
}

interface AgentData {
  agentName: string
  company: string
  lastAction: string
  lastActionTime: string
  lastOutput: string
  status: 'active' | 'idle'
  actionCount: number
}

interface RecentAction {
  id: string
  agentName: string
  company: string
  actionType: string
  outcome: string | null
  createdAt: string
  outputPreview: string
}

interface LiveData {
  ok: boolean
  currentTime: string
  uptimeMs: number
  totalActionsToday: number
  postsToday: number
  trendsToday: number
  agents: AgentData[]
  recentActions: RecentAction[]
}

function formatUptime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

function outcomeColor(outcome: string | null): string {
  if (outcome === 'success') return '#22C55E'
  if (outcome === 'error') return '#EF4444'
  if (outcome === 'blocked') return '#F59E0B'
  return '#94A3B8'
}

export default function MonitorPage() {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [igData, setIgData] = useState<{
    account?: { name: string; username: string; followers: number; mediaCount: number }
    dmsPending?: number
    recentPosts?: Array<{ id: string; caption: string; likes: number; comments: number }>
  } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/live')
      const json = await res.json() as LiveData
      setData(json)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[monitor] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIg = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/ig-live')
      const json = await res.json()
      if (json.ok) setIgData(json)
    } catch {
      // IG data optional
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchIg()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData, fetchIg])

  const activeAgents = data?.agents.filter((a) => a.status === 'active').length ?? 0
  const totalAgents = data?.agents.length ?? 0

  return (
    <div style={{ background: '#0A0A14', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'monospace' }}>
      {/* Header */}
      <nav style={{ background: '#12121F', borderBottom: '1px solid #1E1E3A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ color: '#FFD700', fontSize: 11, textDecoration: 'none', letterSpacing: 2 }}>
            ← PROPOST EMPIRE
          </Link>
          <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            🖥️ REAL-TIME AGENT MONITOR
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10 }}>
          {lastRefresh && (
            <span style={{ color: '#64748B' }}>
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
              boxShadow: '0 0 8px #22C55E', display: 'inline-block',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ color: '#22C55E', fontSize: 10 }}>LIVE</span>
          </div>
          <button
            onClick={fetchData}
            style={{ background: '#1E1E3A', border: '1px solid #2D2D5A', color: '#94A3B8', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}
          >
            ↻ Refresh
          </button>
        </div>
      </nav>

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748B', fontSize: 12 }}>
            Loading agent data...
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'ACTIVE AGENTS', value: `${activeAgents}/${totalAgents}`, color: '#22C55E' },
                { label: 'ACTIONS TODAY', value: data?.totalActionsToday ?? 0, color: '#FFD700' },
                { label: 'POSTS TODAY', value: data?.postsToday ?? 0, color: '#1DA1F2' },
                { label: 'TRENDS FOUND', value: data?.trendsToday ?? 0, color: '#E1306C' },
                { label: 'UPTIME', value: data?.uptimeMs ? formatUptime(data.uptimeMs) : '—', color: '#0077B5' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: '#12121F', border: '1px solid #1E1E3A', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Instagram Live Panel */}
            {igData?.account && (
              <div style={{ background: '#12121F', border: '1px solid #E1306C33', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: '#E1306C', letterSpacing: 1, marginBottom: 12 }}>📸 INSTAGRAM LIVE</div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#64748B', fontSize: 9 }}>ACCOUNT</span>
                    <div style={{ color: '#E2E8F0', fontSize: 13 }}>@{igData.account.username}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: 9 }}>FOLLOWERS</span>
                    <div style={{ color: '#E1306C', fontSize: 18, fontWeight: 700 }}>{igData.account.followers?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: 9 }}>POSTS</span>
                    <div style={{ color: '#E2E8F0', fontSize: 18, fontWeight: 700 }}>{igData.account.mediaCount}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: 9 }}>DMs PENDING</span>
                    <div style={{ color: igData.dmsPending ? '#F59E0B' : '#22C55E', fontSize: 18, fontWeight: 700 }}>
                      {igData.dmsPending ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
              {/* Agent Cards */}
              <div>
                <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>AGENT STATUS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {(data?.agents ?? []).map((agent) => {
                    const color = CORP_COLORS[agent.company] ?? '#94A3B8'
                    return (
                      <div
                        key={agent.agentName}
                        style={{
                          background: '#12121F',
                          border: `1px solid ${agent.status === 'active' ? color + '44' : '#1E1E3A'}`,
                          borderRadius: 8,
                          padding: 14,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {agent.status === 'active' && (
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                          }} />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase' }}>
                              {agent.agentName}
                            </div>
                            <div style={{ fontSize: 9, color, marginTop: 2 }}>
                              {CORP_LABELS[agent.company] ?? agent.company}
                            </div>
                          </div>
                          <div style={{
                            fontSize: 8,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: agent.status === 'active' ? '#22C55E22' : '#1E1E3A',
                            color: agent.status === 'active' ? '#22C55E' : '#64748B',
                            border: `1px solid ${agent.status === 'active' ? '#22C55E44' : '#2D2D5A'}`,
                          }}>
                            {agent.status === 'active' ? '● ACTIVE' : '○ IDLE'}
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>LAST ACTION: </span>
                          {agent.lastAction}
                        </div>
                        <div style={{ fontSize: 9, color: '#64748B', marginBottom: 8 }}>
                          {timeAgo(agent.lastActionTime)} · {agent.actionCount} actions
                        </div>
                        <div style={{
                          fontSize: 9,
                          color: '#94A3B8',
                          background: '#0A0A14',
                          borderRadius: 4,
                          padding: '6px 8px',
                          borderLeft: `2px solid ${color}44`,
                          lineHeight: 1.5,
                        }}>
                          {agent.lastOutput || '—'}
                        </div>
                      </div>
                    )
                  })}
                  {(data?.agents ?? []).length === 0 && (
                    <div style={{ color: '#64748B', fontSize: 11, padding: 20 }}>
                      No agent activity yet. Agents will appear here once they start working.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div>
                <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>RECENT ACTIVITY</div>
                <div style={{ background: '#12121F', border: '1px solid #1E1E3A', borderRadius: 8, overflow: 'hidden' }}>
                  {(data?.recentActions ?? []).map((action, i) => {
                    const color = CORP_COLORS[action.company] ?? '#94A3B8'
                    return (
                      <div
                        key={action.id ?? i}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #1E1E3A',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase' }}>
                              {action.agentName}
                            </span>
                            <span style={{ fontSize: 8, color: '#64748B' }}>
                              {timeAgo(action.createdAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2 }}>
                            {action.actionType}
                          </div>
                          <div style={{ fontSize: 8, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {action.outputPreview}
                          </div>
                        </div>
                        <div style={{ fontSize: 8, color: outcomeColor(action.outcome), flexShrink: 0 }}>
                          {action.outcome === 'success' ? '✓' : action.outcome === 'error' ? '✗' : '·'}
                        </div>
                      </div>
                    )
                  })}
                  {(data?.recentActions ?? []).length === 0 && (
                    <div style={{ padding: 20, color: '#64748B', fontSize: 10, textAlign: 'center' }}>
                      No recent activity
                    </div>
                  )}
                </div>

                {/* Trigger Work Button */}
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={async () => {
                      await fetch('/api/agents/work', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agents: ['CHAT', 'BLAZE', 'SCOUT', 'SCRIBE', 'MEMORY'] }),
                      })
                      setTimeout(fetchData, 3000)
                    }}
                    style={{
                      width: '100%',
                      background: '#1E1E3A',
                      border: '1px solid #FFD70044',
                      color: '#FFD700',
                      padding: '10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 10,
                      letterSpacing: 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    ⚡ TRIGGER AGENT WORK LOOP
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
