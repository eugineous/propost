'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────
interface AgentState {
  name: string
  corp: string
  status: 'active' | 'idle' | 'error' | 'paused'
  currentStep?: string
  progress?: number
  lastRunAt?: string
}

interface OfficeRoom {
  id: string
  name: string
  corp: string
  color: string
  bgColor: string
  icon: string
  agents: AgentState[]
  isActive: boolean
}

const CORP_CONFIG: Record<string, { name: string; color: string; bg: string; icon: string }> = {
  intelcore:   { name: 'COMMAND CENTER', color: '#FFD700', bg: '#1a1500', icon: '👑' },
  xforce:      { name: 'WAR ROOM',       color: '#1DA1F2', bg: '#001520', icon: '⚡' },
  gramgod:     { name: 'STUDIO',         color: '#E1306C', bg: '#1a0010', icon: '📸' },
  linkedelite: { name: 'BOARDROOM',      color: '#0077B5', bg: '#000d1a', icon: '💼' },
  pagepower:   { name: 'COMMUNITY HALL', color: '#1877F2', bg: '#000d1a', icon: '📘' },
  webboss:     { name: 'SERVER ROOM',    color: '#22C55E', bg: '#001a08', icon: '🌐' },
  hrforce:     { name: 'PEOPLE HUB',     color: '#F97316', bg: '#1a0800', icon: '👥' },
  legalshield: { name: 'COMPLIANCE',     color: '#EF4444', bg: '#1a0000', icon: '⚖️' },
  financedesk: { name: 'FINANCE FLOOR',  color: '#10B981', bg: '#001a10', icon: '💰' },
}

const AGENT_CORP: Record<string, string> = {
  sovereign:'intelcore',oracle:'intelcore',memory:'intelcore',sentry:'intelcore',scribe:'intelcore',
  zara:'xforce',blaze:'xforce',scout:'xforce',echo:'xforce',hawk:'xforce',lumen:'xforce',
  pixel_x:'xforce',thunder:'xforce',surge:'xforce',flint:'xforce',nova_x:'xforce',forge:'xforce',trace:'xforce',
  nova:'linkedelite',orator:'linkedelite',bridge:'linkedelite',atlas:'linkedelite',deal_li:'linkedelite',
  graph:'linkedelite',voice:'linkedelite',prism:'linkedelite',mentor:'linkedelite',amplify:'linkedelite',
  aurora:'gramgod',vibe:'gramgod',chat:'gramgod',deal_ig:'gramgod',lens:'gramgod',
  reel:'gramgod',story:'gramgod',caption:'gramgod',hashtag:'gramgod',tribe:'gramgod',fanbase:'gramgod',rescue:'gramgod',
  chief:'pagepower',pulse:'pagepower',community:'pagepower',reach:'pagepower',
  root:'webboss',crawl:'webboss',build:'webboss',shield:'webboss',speed:'webboss',
  people:'hrforce',welfare:'hrforce',rotate:'hrforce',discipline:'hrforce',reward:'hrforce',
  brief:'hrforce',onboard:'hrforce',culture:'hrforce',train:'hrforce',eval:'hrforce',social:'hrforce',advocate:'hrforce',
  judge:'legalshield',policy:'legalshield',risk:'legalshield',copyright:'legalshield',gdpr:'legalshield',
  defame:'legalshield',shadow:'legalshield',appeal:'legalshield',counsel:'legalshield',
  banker:'financedesk',deal:'financedesk',rate:'financedesk',invoice:'financedesk',sponsor:'financedesk',
  revenue:'financedesk',pitch:'financedesk',collab:'financedesk',grants:'financedesk',forecast:'financedesk',
}

// Pixel art agent character
function AgentPixel({ agent, onClick }: { agent: AgentState; onClick: () => void }) {
  const frameRef = useRef(0)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % 4
      setFrame(frameRef.current)
    }, agent.status === 'active' ? 200 : 800)
    return () => clearInterval(interval)
  }, [agent.status])

  const color = agent.status === 'active' ? '#22C55E'
    : agent.status === 'error' ? '#EF4444'
    : agent.status === 'paused' ? '#F59E0B'
    : '#64748B'

  const bodyY = agent.status === 'active' ? [0, -1, 0, 1][frame] : 0

  return (
    <div
      onClick={onClick}
      title={`${agent.name.toUpperCase()} — ${agent.status}${agent.currentStep ? ` | ${agent.currentStep}` : ''}`}
      style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, margin: '2px 3px' }}
    >
      {/* Speech bubble */}
      {agent.status === 'active' && agent.currentStep && (
        <div style={{
          background: 'rgba(0,0,0,0.9)', border: `1px solid ${color}`,
          borderRadius: 3, padding: '1px 4px', fontSize: 6, color, fontFamily: 'monospace',
          whiteSpace: 'nowrap', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 1,
        }}>
          {agent.currentStep.slice(0, 12)}
        </div>
      )}
      {/* Pixel character */}
      <svg width="12" height="20" style={{ transform: `translateY(${bodyY}px)`, imageRendering: 'pixelated' }}>
        {/* Head */}
        <rect x="3" y="0" width="6" height="6" fill={color} />
        {/* Eyes */}
        <rect x="4" y="2" width="1" height="1" fill="#000" />
        <rect x="7" y="2" width="1" height="1" fill="#000" />
        {/* Body */}
        <rect x="2" y="7" width="8" height="7" fill={color} opacity="0.8" />
        {/* Arms */}
        <rect x="0" y="8" width="2" height="4" fill={color} opacity="0.6" />
        <rect x="10" y="8" width="2" height="4" fill={color} opacity="0.6" />
        {/* Legs */}
        <rect x="3" y="14" width="2" height="5" fill={color} opacity="0.7" />
        <rect x="7" y="14" width="2" height="5" fill={color} opacity="0.7" />
        {/* Active glow */}
        {agent.status === 'active' && (
          <rect x="0" y="0" width="12" height="20" fill={color} opacity="0.05" />
        )}
      </svg>
      {/* Name */}
      <div style={{ fontSize: 5, color, fontFamily: 'monospace', textAlign: 'center', lineHeight: 1 }}>
        {agent.name.slice(0, 5).toUpperCase()}
      </div>
    </div>
  )
}

// Room component
function OfficeRoom({ room, onAgentClick }: { room: OfficeRoom; onAgentClick: (a: AgentState) => void }) {
  const cfg = CORP_CONFIG[room.corp]
  const activeCount = room.agents.filter(a => a.status === 'active').length

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.color}${room.isActive ? 'aa' : '33'}`,
      borderRadius: 6,
      padding: '8px',
      position: 'relative',
      minHeight: 120,
      boxShadow: room.isActive ? `0 0 12px ${cfg.color}22` : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      {/* Room header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>{cfg.icon}</span>
          <span style={{ fontSize: 7, color: cfg.color, fontFamily: 'monospace', fontWeight: 'bold' }}>
            {cfg.name}
          </span>
        </div>
        {activeCount > 0 && (
          <div style={{
            background: '#22C55E22', border: '1px solid #22C55E44',
            borderRadius: 10, padding: '1px 5px', fontSize: 6, color: '#22C55E', fontFamily: 'monospace',
          }}>
            {activeCount} WORKING
          </div>
        )}
      </div>

      {/* Floor */}
      <div style={{
        background: `${cfg.color}08`,
        borderTop: `1px solid ${cfg.color}22`,
        borderRadius: 3,
        padding: '4px 2px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        minHeight: 60,
      }}>
        {room.agents.map(agent => (
          <AgentPixel key={agent.name} agent={agent} onClick={() => onAgentClick(agent)} />
        ))}
      </div>

      {/* Furniture decorations */}
      <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 8, opacity: 0.3 }}>
        {room.corp === 'intelcore' && '🖥️🖥️🖥️'}
        {room.corp === 'xforce' && '📊📡'}
        {room.corp === 'gramgod' && '💡📷'}
        {room.corp === 'linkedelite' && '🪑📋'}
        {room.corp === 'pagepower' && '📢🎯'}
        {room.corp === 'webboss' && '🖧💾'}
        {room.corp === 'hrforce' && '☕🌱'}
        {room.corp === 'legalshield' && '📚⚖️'}
        {room.corp === 'financedesk' && '📈💹'}
      </div>
    </div>
  )
}

// Agent detail panel
function AgentPanel({ agent, onClose, onAction }: {
  agent: AgentState
  onClose: () => void
  onAction: (action: string, agentName: string) => void
}) {
  const cfg = CORP_CONFIG[agent.corp] ?? { color: '#888', bg: '#111', icon: '🤖', name: agent.corp }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 300,
      background: '#0d0d1a', borderLeft: `2px solid ${cfg.color}`,
      zIndex: 1000, padding: 16, overflowY: 'auto',
      fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ color: cfg.color, fontWeight: 'bold', fontSize: 13 }}>{agent.name.toUpperCase()}</div>
          <div style={{ color: '#666', fontSize: 10 }}>{cfg.icon} {cfg.name}</div>
        </div>
        <button onClick={onClose} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 10,
          background: agent.status === 'active' ? '#22C55E22' : agent.status === 'error' ? '#EF444422' : '#64748B22',
          color: agent.status === 'active' ? '#22C55E' : agent.status === 'error' ? '#EF4444' : '#64748B',
          border: `1px solid currentColor`,
        }}>
          ● {agent.status.toUpperCase()}
        </div>
      </div>

      {agent.currentStep && (
        <div style={{ marginBottom: 12, padding: 8, background: '#1a1a2e', borderRadius: 4 }}>
          <div style={{ color: '#666', fontSize: 9, marginBottom: 4 }}>CURRENT TASK</div>
          <div style={{ color: cfg.color, fontSize: 11 }}>{agent.currentStep}</div>
        </div>
      )}

      {agent.progress !== undefined && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#666', fontSize: 9, marginBottom: 4 }}>PROGRESS — {agent.progress}%</div>
          <div style={{ background: '#1a1a2e', borderRadius: 4, height: 6 }}>
            <div style={{ background: cfg.color, width: `${agent.progress}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      <div style={{ color: '#666', fontSize: 9, marginBottom: 12 }}>
        {agent.lastRunAt && `Last active: ${new Date(agent.lastRunAt).toLocaleTimeString()}`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: '#666', fontSize: 9, marginBottom: 4 }}>FOUNDER CONTROLS</div>
        {[
          { label: '▶ Run Now', action: 'run', color: '#22C55E' },
          { label: '⏸ Pause', action: 'pause', color: '#F59E0B' },
          { label: '▶ Resume', action: 'resume', color: '#3B82F6' },
          { label: '🔄 Reset Errors', action: 'reset', color: '#8B5CF6' },
          { label: '🔥 Fire Agent', action: 'fire', color: '#EF4444' },
        ].map(btn => (
          <button
            key={btn.action}
            onClick={() => onAction(btn.action, agent.name)}
            style={{
              background: `${btn.color}15`, border: `1px solid ${btn.color}44`,
              color: btn.color, borderRadius: 4, padding: '6px 10px',
              fontSize: 10, cursor: 'pointer', textAlign: 'left',
              fontFamily: 'monospace',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function EmpireOffice() {
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({})
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const fetchStates = async () => {
    try {
      const res = await fetch('/api/monitor/live')
      const data = await res.json() as { ok: boolean; agents?: Record<string, { status?: string; currentStep?: string; progress?: number; lastRunAt?: string }> }
      if (!data.ok || !data.agents) return
      const states: Record<string, AgentState> = {}
      for (const [name, s] of Object.entries(data.agents)) {
        states[name] = {
          name,
          corp: AGENT_CORP[name] ?? 'intelcore',
          status: (s?.status as AgentState['status']) ?? 'idle',
          currentStep: s?.currentStep,
          progress: s?.progress,
          lastRunAt: s?.lastRunAt,
        }
      }
      setAgentStates(states)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchStates()
    const interval = setInterval(fetchStates, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (action: string, agentName: string) => {
    try {
      if (action === 'run') {
        await fetch(`/api/workflows/${agentName}/execute`, { method: 'POST' })
        setActionMsg(`▶ ${agentName} triggered`)
      } else if (action === 'pause') {
        await fetch(`/api/agents/${agentName}/pause`, { method: 'POST' })
        setActionMsg(`⏸ ${agentName} paused`)
      } else if (action === 'resume') {
        await fetch(`/api/agents/${agentName}/resume`, { method: 'POST' })
        setActionMsg(`▶ ${agentName} resumed`)
      } else if (action === 'fire') {
        await fetch(`/api/workflows/${agentName}`, { method: 'DELETE' })
        setActionMsg(`🔥 ${agentName} workflow removed`)
      } else if (action === 'reset') {
        await fetch(`/api/workflows/${agentName}/execute`, { method: 'POST' })
        setActionMsg(`🔄 ${agentName} reset`)
      }
      setTimeout(() => setActionMsg(null), 3000)
      fetchStates()
    } catch { /* ignore */ }
  }

  // Build rooms
  const rooms: OfficeRoom[] = Object.entries(CORP_CONFIG).map(([corp, cfg]) => {
    const agents = Object.values(agentStates).filter(a => a.corp === corp)
    return {
      id: corp,
      name: cfg.name,
      corp,
      color: cfg.color,
      bgColor: cfg.bg,
      icon: cfg.icon,
      agents,
      isActive: agents.some(a => a.status === 'active'),
    }
  })

  const activeCount = Object.values(agentStates).filter(a => a.status === 'active').length

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 8px', background: '#0d0d1a', borderBottom: '1px solid #1e1e3a',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22C55E',
            boxShadow: '0 0 6px #22C55E',
          }} />
          <span style={{ fontSize: 8, color: '#22C55E', fontFamily: 'monospace' }}>
            🏢 PROPOST VIRTUAL HQ — {activeCount} AGENTS WORKING
          </span>
        </div>
        {actionMsg && (
          <span style={{ fontSize: 8, color: '#FFD700', fontFamily: 'monospace' }}>{actionMsg}</span>
        )}
        <span style={{ fontSize: 7, color: '#444', fontFamily: 'monospace' }}>
          Click any agent to control them
        </span>
      </div>

      {/* 3×3 office grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        padding: '0 8px 8px',
      }}>
        {rooms.map(room => (
          <OfficeRoom
            key={room.id}
            room={room}
            onAgentClick={setSelectedAgent}
          />
        ))}
      </div>

      {/* Agent detail panel */}
      {selectedAgent && (
        <AgentPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}
