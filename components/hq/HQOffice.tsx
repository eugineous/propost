'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { CharacterState } from '@/lib/types'
import { ROOMS, AGENTS_BY_ROOM, type OfficeRoomId, type OfficePropKind } from './officeLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentPose = {
  xPct: number   // % of room width
  yPct: number   // % of room height
  txPct: number
  tyPct: number
  room: OfficeRoomId
  mood: 'working' | 'walking' | 'talking'
  line: string
  lineTtlMs: number
  facingLeft: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const OUTFITS: Record<string, { shirt: string; skin: string; hair: string }> = {
  EUGINE:    { shirt: '#111827', skin: '#C68642', hair: '#1f2937' },
  SOVEREIGN: { shirt: '#1E293B', skin: '#C68642', hair: '#0f172a' },
  ORACLE:    { shirt: '#E2E8F0', skin: '#8D5524', hair: '#0f172a' },
  MEMORY:    { shirt: '#A5F3FC', skin: '#FDBCB4', hair: '#0f172a' },
  SENTRY:    { shirt: '#FCA5A5', skin: '#C68642', hair: '#0f172a' },
  SCRIBE:    { shirt: '#D8B4FE', skin: '#8D5524', hair: '#111827' },
  ZARA:      { shirt: '#1DA1F2', skin: '#C68642', hair: '#0f172a' },
  BLAZE:     { shirt: '#FF6B35', skin: '#8D5524', hair: '#0b0b0b' },
  SCOUT:     { shirt: '#00F0FF', skin: '#FDBCB4', hair: '#111827' },
  ECHO:      { shirt: '#A78BFA', skin: '#C68642', hair: '#111827' },
  HAWK:      { shirt: '#EF4444', skin: '#8D5524', hair: '#0b0b0b' },
  LUMEN:     { shirt: '#FCD34D', skin: '#FDBCB4', hair: '#111827' },
  PIXEL:     { shirt: '#6EE7B7', skin: '#C68642', hair: '#0f172a' },
  NOVA:      { shirt: '#0077B5', skin: '#8D5524', hair: '#111827' },
  ORATOR:    { shirt: '#C4B5FD', skin: '#FDBCB4', hair: '#111827' },
  BRIDGE:    { shirt: '#FCA5A5', skin: '#C68642', hair: '#0f172a' },
  ATLAS:     { shirt: '#93C5FD', skin: '#8D5524', hair: '#0f172a' },
  DEAL_LI:   { shirt: '#86EFAC', skin: '#FDBCB4', hair: '#111827' },
  GRAPH:     { shirt: '#F9A8D4', skin: '#C68642', hair: '#111827' },
  AURORA:    { shirt: '#E1306C', skin: '#8D5524', hair: '#111827' },
  VIBE:      { shirt: '#F472B6', skin: '#FDBCB4', hair: '#111827' },
  CHAT:      { shirt: '#FB923C', skin: '#C68642', hair: '#0f172a' },
  DEAL_IG:   { shirt: '#A78BFA', skin: '#8D5524', hair: '#111827' },
  LENS:      { shirt: '#67E8F9', skin: '#FDBCB4', hair: '#111827' },
  CHIEF:     { shirt: '#1877F2', skin: '#C68642', hair: '#0f172a' },
  PULSE:     { shirt: '#60A5FA', skin: '#8D5524', hair: '#111827' },
  COMMUNITY: { shirt: '#34D399', skin: '#FDBCB4', hair: '#111827' },
  REACH:     { shirt: '#FBBF24', skin: '#C68642', hair: '#111827' },
  ROOT:      { shirt: '#22C55E', skin: '#8D5524', hair: '#111827' },
  CRAWL:     { shirt: '#4ADE80', skin: '#FDBCB4', hair: '#0f172a' },
  BUILD:     { shirt: '#86EFAC', skin: '#C68642', hair: '#111827' },
  SHIELD:    { shirt: '#FCA5A5', skin: '#8D5524', hair: '#0f172a' },
  SPEED:     { shirt: '#FDE68A', skin: '#FDBCB4', hair: '#111827' },
}

const ROLES: Record<string, string> = {
  EUGINE: 'Founder', SOVEREIGN: 'Commander', ORACLE: 'Strategy',
  MEMORY: 'Patterns', SENTRY: 'Crisis', SCRIBE: 'Reports',
  ZARA: 'X CEO', BLAZE: 'Content', SCOUT: 'Trends',
  ECHO: 'Engage', HAWK: 'Guard', LUMEN: 'Monetize', PIXEL: 'Learning',
  NOVA: 'LI CEO', ORATOR: 'Writer', BRIDGE: 'Network',
  ATLAS: 'Intel', DEAL_LI: 'Deals', GRAPH: 'Analytics',
  AURORA: 'IG CEO', VIBE: 'Curator', CHAT: 'DMs',
  DEAL_IG: 'Partners', LENS: 'Visual',
  CHIEF: 'FB CEO', PULSE: 'Content', COMMUNITY: 'Comments', REACH: 'Boost',
  ROOT: 'Web CEO', CRAWL: 'SEO', BUILD: 'Pipeline', SHIELD: 'Security', SPEED: 'Perf',
}

const QUIPS: Record<string, string[]> = {
  SOVEREIGN: ['Routing tasks…', 'All systems go', 'Brief incoming', 'Dispatching…'],
  EUGINE:    ['Reviewing…', 'Approved ✓', 'Good work.', 'Next move.'],
  ZARA:      ['Thread pipeline', 'Engagement push', 'Risk check', 'War room sync'],
  NOVA:      ['Exec outreach', 'Post queued', 'Connections sweep', 'Boardroom brief'],
  AURORA:    ['Reels queue', 'DM priority', 'Collab triage', 'Studio plan'],
  CHIEF:     ['Comment sweep', 'Clip pipeline', 'Boost check', 'Community warmth'],
  ROOT:      ['SEO crawl', 'Deploy check', 'Speed pass', 'Fixing vitals'],
  CHAT:      ['Replying now…', 'Clearing backlog', 'Brand lead flagged', 'Niaje boss!'],
  HAWK:      ['Content cleared', 'Risk: LOW', 'Blocked: spam', 'Approved ✓'],
  SCOUT:     ['8 trends found', 'Kenya trending', 'Polling X…', 'Trend actioned'],
  SENTRY:    ['All nominal', 'No crisis', 'Monitoring…', 'Platforms clear'],
}

function getQuip(agent: string): string {
  const list = QUIPS[agent] ?? ['Working…', 'On it.', 'Queued.', 'Checking…']
  return list[Math.floor(Math.random() * list.length)]
}

function agentHomeRoom(agent: string): OfficeRoomId {
  for (const [room, agents] of Object.entries(AGENTS_BY_ROOM)) {
    if (agents.includes(agent)) return room as OfficeRoomId
  }
  return 'commons'
}

function statusColor(state: CharacterState | undefined) {
  if (state === 'active')  return '#22C55E'
  if (state === 'blocked') return '#EF4444'
  if (state === 'paused')  return '#64748B'
  return '#FBBF24'
}

// ─── Prop renderer ────────────────────────────────────────────────────────────

function propBg(kind: OfficePropKind): string {
  switch (kind) {
    case 'table':     return 'rgba(180,140,80,0.18)'
    case 'chair':     return 'rgba(100,116,139,0.20)'
    case 'sofa':      return 'rgba(100,116,139,0.22)'
    case 'whiteboard':return 'rgba(255,255,255,0.10)'
    case 'tv':        return 'rgba(10,10,30,0.60)'
    case 'plant':     return 'rgba(34,197,94,0.18)'
    case 'bookshelf': return 'rgba(180,140,80,0.15)'
    case 'coffee':    return 'rgba(180,140,80,0.20)'
    case 'rug':       return 'rgba(99,102,241,0.12)'
    case 'pod':       return 'rgba(0,240,255,0.12)'
    default:          return 'rgba(100,116,139,0.15)'
  }
}

function propBorder(kind: OfficePropKind): string {
  switch (kind) {
    case 'table':     return '1px solid rgba(180,140,80,0.35)'
    case 'whiteboard':return '1px solid rgba(255,255,255,0.25)'
    case 'tv':        return '1px solid rgba(148,163,184,0.20)'
    case 'plant':     return '1px solid rgba(34,197,94,0.30)'
    case 'rug':       return '1px solid rgba(99,102,241,0.20)'
    case 'pod':       return '1px solid rgba(0,240,255,0.25)'
    default:          return '1px solid rgba(148,163,184,0.15)'
  }
}

// ─── Pixel person ─────────────────────────────────────────────────────────────

function PixelPerson({ agent, state, facingLeft }: { agent: string; state?: CharacterState; facingLeft: boolean }) {
  const o = OUTFITS[agent] ?? { shirt: '#94A3B8', skin: '#C68642', hair: '#111827' }
  const isActive = state === 'active'
  const isBlocked = state === 'blocked'
  const isPaused = state === 'paused'

  return (
    <div
      style={{
        width: 20,
        height: 28,
        position: 'relative',
        imageRendering: 'pixelated',
        transform: facingLeft ? 'scaleX(-1)' : undefined,
        opacity: isPaused ? 0.5 : 1,
        filter: isBlocked ? 'hue-rotate(0deg) saturate(0.4)' : undefined,
      }}
    >
      {/* hair */}
      <div style={{ position: 'absolute', left: 3, top: 0, width: 14, height: 4, background: o.hair, borderRadius: 2 }} />
      {/* head */}
      <div style={{ position: 'absolute', left: 4, top: 3, width: 12, height: 9, background: o.skin, borderRadius: 2 }} />
      {/* body */}
      <div style={{ position: 'absolute', left: 3, top: 12, width: 14, height: 9, background: o.shirt, borderRadius: 2 }} />
      {/* legs */}
      <div style={{ position: 'absolute', left: 4, top: 21, width: 5, height: 7, background: '#1E293B', borderRadius: 1 }} />
      <div style={{ position: 'absolute', left: 11, top: 21, width: 5, height: 7, background: '#1E293B', borderRadius: 1 }} />
      {/* active glow */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -3, borderRadius: 4,
          boxShadow: `0 0 8px ${o.shirt}88`,
          pointerEvents: 'none',
        }} />
      )}
      {/* blocked X */}
      {isBlocked && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#EF4444', fontWeight: 900, lineHeight: 1,
        }}>✕</div>
      )}
      {/* crown */}
      {agent === 'EUGINE' && (
        <div style={{ position: 'absolute', left: 2, top: -12, fontSize: 13, filter: 'drop-shadow(0 2px 6px rgba(255,215,0,0.5))' }}>
          👑
        </div>
      )}
    </div>
  )
}

// ─── Agent sprite with nameplate ──────────────────────────────────────────────

function AgentSprite({
  agent,
  pose,
  state,
  onClick,
}: {
  agent: string
  pose: AgentPose
  state?: CharacterState
  onClick?: () => void
}) {
  const dot = statusColor(state)

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${pose.xPct}%`,
        top: `${pose.yPct}%`,
        transform: 'translate(-50%, -50%)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        zIndex: 10,
      }}
    >
      {/* Speech bubble */}
      {pose.lineTtlMs > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 4,
          padding: '3px 7px',
          borderRadius: 8,
          background: 'rgba(10,10,20,0.92)',
          border: '1px solid rgba(0,240,255,0.25)',
          color: '#E2E8F0',
          fontFamily: 'monospace',
          fontSize: 9,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {pose.line}
        </div>
      )}

      {/* Nameplate */}
      <div style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: pose.lineTtlMs > 0 ? 26 : 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 999,
        background: 'rgba(13,13,26,0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#E2E8F0' }}>
          {agent === 'EUGINE' ? '👑 EUGINE' : agent}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#64748B' }}>
          {ROLES[agent] ?? 'Agent'}
        </span>
      </div>

      <PixelPerson agent={agent} state={state} facingLeft={pose.facingLeft} />
    </button>
  )
}

// ─── Room component ───────────────────────────────────────────────────────────

function OfficeRoom({
  room,
  poses,
  agentStates,
  onAgentClick,
}: {
  room: typeof ROOMS[number]
  poses: Record<string, AgentPose>
  agentStates: Record<string, CharacterState>
  onAgentClick?: (agent: string) => void
}) {
  const agents = AGENTS_BY_ROOM[room.id] ?? []

  return (
    <div
      style={{
        gridColumn: `${room.col} / span ${room.colSpan}`,
        gridRow: `${room.row} / span ${room.rowSpan}`,
        position: 'relative',
        borderRadius: 12,
        border: `1px solid ${room.color}30`,
        background: 'rgba(15,15,28,0.82)',
        overflow: 'hidden',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* subtle inner glow */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        boxShadow: `inset 0 0 40px ${room.color}08`,
        pointerEvents: 'none',
      }} />

      {/* Room label */}
      <div style={{
        position: 'absolute', top: 8, left: 10, right: 10,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        zIndex: 5, pointerEvents: 'none',
      }}>
        <div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: room.color, letterSpacing: 0.5 }}>
            {room.name}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#64748B', marginTop: 3 }}>
            {room.subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: room.color, boxShadow: `0 0 8px ${room.color}`, display: 'inline-block' }} />
        </div>
      </div>

      {/* Props */}
      {room.props.map((pr) => (
        <div
          key={pr.id}
          title={pr.label ?? pr.kind}
          style={{
            position: 'absolute',
            left: `${pr.xPct}%`,
            top: `${pr.yPct}%`,
            width: `${pr.wPct}%`,
            height: `${pr.hPct}%`,
            borderRadius: pr.round ? 999 : 6,
            background: propBg(pr.kind),
            border: propBorder(pr.kind),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {pr.label && (
            <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#94A3B8', opacity: 0.8, textAlign: 'center', lineHeight: 1.2 }}>
              {pr.label}
            </span>
          )}
        </div>
      ))}

      {/* Agents */}
      {agents.map((agent) => {
        const pose = poses[agent]
        if (!pose || pose.room !== room.id) return null
        return (
          <AgentSprite
            key={agent}
            agent={agent}
            pose={pose}
            state={agentStates[agent]}
            onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
          />
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HQOffice({
  agentStates = {},
  onAgentClick,
}: {
  agentStates?: Record<string, CharacterState>
  onAgentClick?: (agent: string) => void
}) {
  const allAgents = Object.values(AGENTS_BY_ROOM).flat()
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const [poses, setPoses] = useState<Record<string, AgentPose>>({})

  // Initialise poses
  useEffect(() => {
    const init: Record<string, AgentPose> = {}
    allAgents.forEach((agent) => {
      const room = agentHomeRoom(agent)
      const xPct = 20 + Math.random() * 60
      const yPct = 30 + Math.random() * 40
      init[agent] = { xPct, yPct, txPct: xPct, tyPct: yPct, room, mood: 'working', line: '', lineTtlMs: 0, facingLeft: Math.random() < 0.5 }
    })
    setPoses(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tick = useCallback((ts: number) => {
    const dtMs = Math.min(ts - (lastRef.current || ts), 50)
    lastRef.current = ts
    const dt = dtMs / 1000

    setPoses((prev) => {
      const next = { ...prev }

      for (const agent of Object.keys(next)) {
        const p = { ...next[agent] }
        if (!p) continue

        // TTL countdown
        if (p.lineTtlMs > 0) {
          p.lineTtlMs = Math.max(0, p.lineTtlMs - dtMs)
          if (p.lineTtlMs === 0) p.mood = 'working'
        }

        // Occasionally pick a new target
        if (Math.random() < 0.008) {
          const home = agentHomeRoom(agent)
          // CEOs occasionally walk to command for briefings
          const isCeo = ['ZARA', 'NOVA', 'AURORA', 'CHIEF', 'ROOT'].includes(agent)
          const goCommand = isCeo && Math.random() < 0.2
          const newRoom: OfficeRoomId = goCommand ? 'command' : home

          p.txPct = 15 + Math.random() * 70
          p.tyPct = 25 + Math.random() * 50
          p.room = newRoom
          p.mood = 'walking'
        }

        // Move toward target
        const dx = p.txPct - p.xPct
        const dy = p.tyPct - p.yPct
        const dist = Math.hypot(dx, dy)
        const speed = (agentStates[agent] === 'active' ? 18 : 12) * dt
        if (dist > 0.5) {
          p.xPct += (dx / dist) * Math.min(speed, dist)
          p.yPct += (dy / dist) * Math.min(speed, dist)
          p.facingLeft = dx < 0
        } else {
          if (p.mood === 'walking') p.mood = 'working'
        }

        // Clamp inside room
        p.xPct = Math.max(12, Math.min(88, p.xPct))
        p.yPct = Math.max(28, Math.min(85, p.yPct))

        // Occasional quip
        if (p.lineTtlMs === 0 && Math.random() < 0.006) {
          p.line = getQuip(agent)
          p.lineTtlMs = 1800 + Math.random() * 1200
          p.mood = 'talking'
        }

        next[agent] = p
      }

      return next
    })

    rafRef.current = requestAnimationFrame(tick)
  }, [agentStates])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  return (
    <div style={{ width: '100%' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px', marginBottom: 6,
        background: '#0D0D1A', border: '1px solid #1E1E3A', borderRadius: 8,
      }}>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#FFD700' }}>
          🏢 PROPOST VIRTUAL HQ — 47 AGENTS · 9 COMPANIES
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#22C55E' }}>🟢 LIVE</span>
        </div>
      </div>

      {/* Office grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '160px 80px 180px',
          gap: 6,
          height: 432,
          background: `
            radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,240,255,0.05) 0%, transparent 70%),
            linear-gradient(180deg, #0A0A14 0%, #07070F 100%)
          `,
          borderRadius: 12,
          border: '1px solid #1E1E3A',
          padding: 6,
        }}
      >
        {ROOMS.map((room) => (
          <OfficeRoom
            key={room.id}
            room={room}
            poses={poses}
            agentStates={agentStates}
            onAgentClick={onAgentClick}
          />
        ))}
      </div>
    </div>
  )
}
