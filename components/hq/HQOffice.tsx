'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CharacterState } from '@/lib/types'
import { PROPS, ROOMS, type OfficeProp, type OfficeRoomId } from './officeLayout'

type AgentId = string

type AgentPose = {
  x: number
  y: number
  tx: number
  ty: number
  room: OfficeRoomId
  mood: 'working' | 'walking' | 'talking' | 'idle'
  line: string
  lineTtlMs: number
}

const AGENTS_BY_ROOM: Record<OfficeRoomId, AgentId[]> = {
  command: ['EUGINE', 'SOVEREIGN', 'ORACLE', 'MEMORY', 'SENTRY', 'SCRIBE'],
  xforce: ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL'],
  linkedelite: ['NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL_LI', 'GRAPH'],
  gramgod: ['AURORA', 'VIBE', 'CHAT', 'DEAL_IG', 'LENS'],
  pagepower: ['CHIEF', 'PULSE', 'COMMUNITY', 'REACH'],
  webboss: ['ROOT', 'CRAWL', 'BUILD', 'SHIELD', 'SPEED'],
  hall: [],
}

const LINES: Record<string, string[]> = {
  SOVEREIGN: ['Assigning tasks…', 'Autopilot tick ✅', 'Brief CEOs', 'Routing work…'],
  EUGINE: ['Reviewing…', 'Approving…', 'Good work team.', 'Next move.'],
  ZARA: ['War room sync', 'Engagement push', 'Risk check', 'Thread pipeline'],
  NOVA: ['Boardroom brief', 'Connections sweep', 'Post queued', 'Exec outreach'],
  AURORA: ['Studio plan', 'Reels queue', 'DM priority', 'Collab triage'],
  CHIEF: ['Community warmth', 'Comment sweep', 'Clip pipeline', 'Boost check'],
  ROOT: ['SEO crawl', 'Deploy check', 'Speed pass', 'Fixing vitals'],
  CHAT: ['Replying now…', 'Clearing backlog', 'Brand lead flagged', 'Niaje boss!'],
}

const OUTFITS: Record<string, { shirt: string; pants: string; skin: string; hair: string }> = {
  EUGINE: { shirt: '#111827', pants: '#0B1220', skin: '#C68642', hair: '#1f2937' },
  SOVEREIGN: { shirt: '#111827', pants: '#0B1220', skin: '#C68642', hair: '#0f172a' },
  ZARA: { shirt: '#1DA1F2', pants: '#0B1220', skin: '#C68642', hair: '#0f172a' },
  BLAZE: { shirt: '#FF6B35', pants: '#111827', skin: '#8D5524', hair: '#0b0b0b' },
  SCOUT: { shirt: '#00F0FF', pants: '#0B1220', skin: '#FDBCB4', hair: '#111827' },
  ECHO: { shirt: '#A78BFA', pants: '#0B1220', skin: '#C68642', hair: '#111827' },
  HAWK: { shirt: '#EF4444', pants: '#111827', skin: '#8D5524', hair: '#0b0b0b' },
  LUMEN: { shirt: '#FCD34D', pants: '#0B1220', skin: '#FDBCB4', hair: '#111827' },
  PIXEL: { shirt: '#6EE7B7', pants: '#0B1220', skin: '#C68642', hair: '#0f172a' },
  NOVA: { shirt: '#0077B5', pants: '#0B1220', skin: '#8D5524', hair: '#111827' },
  ORATOR: { shirt: '#C4B5FD', pants: '#111827', skin: '#FDBCB4', hair: '#111827' },
  BRIDGE: { shirt: '#FCA5A5', pants: '#0B1220', skin: '#C68642', hair: '#0f172a' },
  ATLAS: { shirt: '#93C5FD', pants: '#0B1220', skin: '#8D5524', hair: '#0f172a' },
  DEAL_LI: { shirt: '#86EFAC', pants: '#111827', skin: '#FDBCB4', hair: '#111827' },
  GRAPH: { shirt: '#F9A8D4', pants: '#0B1220', skin: '#C68642', hair: '#111827' },
  AURORA: { shirt: '#E1306C', pants: '#111827', skin: '#8D5524', hair: '#111827' },
  VIBE: { shirt: '#F472B6', pants: '#0B1220', skin: '#FDBCB4', hair: '#111827' },
  CHAT: { shirt: '#FB923C', pants: '#111827', skin: '#C68642', hair: '#0f172a' },
  DEAL_IG: { shirt: '#A78BFA', pants: '#0B1220', skin: '#8D5524', hair: '#111827' },
  LENS: { shirt: '#67E8F9', pants: '#111827', skin: '#FDBCB4', hair: '#111827' },
  CHIEF: { shirt: '#1877F2', pants: '#0B1220', skin: '#C68642', hair: '#0f172a' },
  PULSE: { shirt: '#60A5FA', pants: '#111827', skin: '#8D5524', hair: '#111827' },
  COMMUNITY: { shirt: '#34D399', pants: '#0B1220', skin: '#FDBCB4', hair: '#111827' },
  REACH: { shirt: '#FBBF24', pants: '#111827', skin: '#C68642', hair: '#111827' },
  ROOT: { shirt: '#22C55E', pants: '#0B1220', skin: '#8D5524', hair: '#111827' },
  CRAWL: { shirt: '#4ADE80', pants: '#111827', skin: '#FDBCB4', hair: '#0f172a' },
  BUILD: { shirt: '#86EFAC', pants: '#0B1220', skin: '#C68642', hair: '#111827' },
  SHIELD: { shirt: '#FCA5A5', pants: '#111827', skin: '#8D5524', hair: '#0f172a' },
  SPEED: { shirt: '#FDE68A', pants: '#0B1220', skin: '#FDBCB4', hair: '#111827' },
  ORACLE: { shirt: '#E2E8F0', pants: '#111827', skin: '#8D5524', hair: '#0f172a' },
  MEMORY: { shirt: '#A5F3FC', pants: '#0B1220', skin: '#FDBCB4', hair: '#0f172a' },
  SENTRY: { shirt: '#FCA5A5', pants: '#111827', skin: '#C68642', hair: '#0f172a' },
  SCRIBE: { shirt: '#D8B4FE', pants: '#0B1220', skin: '#8D5524', hair: '#111827' },
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function roomBounds(room: OfficeRoomId) {
  const r = ROOMS.find((x) => x.id === room)!
  return { left: r.x + 16, top: r.y + 44, right: r.x + r.w - 16, bottom: r.y + r.h - 16 }
}

function randomPointInRoom(room: OfficeRoomId) {
  const b = roomBounds(room)
  return {
    x: b.left + Math.random() * (b.right - b.left),
    y: b.top + Math.random() * (b.bottom - b.top),
  }
}

function initialPos(agent: string, room: OfficeRoomId) {
  const pt = randomPointInRoom(room)
  return { x: pt.x, y: pt.y, tx: pt.x, ty: pt.y }
}

function spriteFor(agent: string) {
  const o = OUTFITS[agent] ?? { shirt: '#94A3B8', pants: '#0B1220', skin: '#C68642', hair: '#111827' }
  return o
}

function isCeo(agent: string) {
  return ['SOVEREIGN', 'ZARA', 'NOVA', 'AURORA', 'CHIEF', 'ROOT'].includes(agent)
}

function ceoRoom(agent: string): OfficeRoomId {
  if (agent === 'SOVEREIGN' || agent === 'EUGINE') return 'command'
  if (agent === 'ZARA') return 'xforce'
  if (agent === 'NOVA') return 'linkedelite'
  if (agent === 'AURORA') return 'gramgod'
  if (agent === 'CHIEF') return 'pagepower'
  if (agent === 'ROOT') return 'webboss'
  return 'hall'
}

function agentHomeRoom(agent: string): OfficeRoomId {
  const entry = Object.entries(AGENTS_BY_ROOM).find(([, list]) => list.includes(agent))
  return (entry?.[0] as OfficeRoomId) ?? 'hall'
}

function namePlate(agent: string) {
  if (agent === 'EUGINE') return '👑 EUGINE'
  return agent
}

function roleLine(agent: string) {
  const map: Record<string, string> = {
    EUGINE: 'Founder',
    SOVEREIGN: 'Commander',
    ZARA: 'X CEO',
    BLAZE: 'Content',
    SCOUT: 'Trends',
    ECHO: 'Engagement',
    HAWK: 'Guard',
    LUMEN: 'Monetize',
    PIXEL: 'Learning',
    NOVA: 'LI CEO',
    ORATOR: 'Writer',
    BRIDGE: 'Network',
    ATLAS: 'Intel',
    DEAL_LI: 'Opportunities',
    GRAPH: 'Analytics',
    AURORA: 'IG CEO',
    VIBE: 'Curator',
    CHAT: 'DMs',
    DEAL_IG: 'Partnerships',
    LENS: 'Visual',
    CHIEF: 'FB CEO',
    PULSE: 'Content',
    COMMUNITY: 'Comments',
    REACH: 'Boost',
    ROOT: 'Web CEO',
    CRAWL: 'SEO',
    BUILD: 'Pipeline',
    SHIELD: 'Security',
    SPEED: 'Perf',
    ORACLE: 'Strategy',
    MEMORY: 'Patterns',
    SENTRY: 'Crisis',
    SCRIBE: 'Reports',
  }
  return map[agent] ?? 'Agent'
}

function statusDot(state: CharacterState | undefined) {
  if (state === 'active') return '#22C55E'
  if (state === 'blocked') return '#EF4444'
  if (state === 'paused') return '#64748B'
  if (state === 'idle') return '#FBBF24'
  return '#64748B'
}

function propClass(kind: OfficeProp['kind']) {
  switch (kind) {
    case 'door': return 'bg-sky-200/10 border border-sky-200/30'
    case 'sofa': return 'bg-slate-200/10 border border-slate-200/20'
    case 'armchair': return 'bg-slate-200/10 border border-slate-200/20'
    case 'round_table': return 'bg-amber-200/10 border border-amber-200/25'
    case 'chair': return 'bg-slate-100/10 border border-slate-200/15'
    case 'plant': return 'bg-emerald-300/10 border border-emerald-300/20'
    case 'whiteboard': return 'bg-white/10 border border-white/25'
    case 'painting': return 'bg-fuchsia-200/10 border border-fuchsia-200/20'
    case 'rug': return 'bg-indigo-200/10 border border-indigo-200/20'
    case 'lamp': return 'bg-yellow-200/10 border border-yellow-200/20'
    case 'bookshelf': return 'bg-amber-200/10 border border-amber-200/15'
    case 'tv': return 'bg-slate-950/40 border border-slate-200/15'
    case 'coffee_bar': return 'bg-amber-200/10 border border-amber-200/20'
    case 'pod': return 'bg-cyan-200/10 border border-cyan-200/20'
    case 'printer': return 'bg-slate-200/10 border border-slate-200/20'
    case 'watercooler': return 'bg-cyan-200/10 border border-cyan-200/20'
    case 'sign': return 'bg-slate-200/10 border border-slate-200/20'
    case 'window': return 'bg-sky-200/10 border border-sky-200/20'
    default: return 'bg-slate-200/10 border border-slate-200/20'
  }
}

export default function HQOffice({
  agentStates = {},
  onAgentClick,
}: {
  agentStates?: Record<string, CharacterState>
  onAgentClick?: (agent: string) => void
}) {
  const allAgents = useMemo(() => Object.values(AGENTS_BY_ROOM).flat(), [])
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const [poses, setPoses] = useState<Record<string, AgentPose>>({})

  // init / restore
  useEffect(() => {
    const key = 'propost.hq.poses.v1'
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, AgentPose>
        // minor validation
        setPoses(parsed)
        return
      }
    } catch { /* ignore */ }

    const init: Record<string, AgentPose> = {}
    allAgents.forEach((a) => {
      const room = agentHomeRoom(a)
      const { x, y, tx, ty } = initialPos(a, room)
      init[a] = { x, y, tx, ty, room, mood: 'working', line: '', lineTtlMs: 0 }
    })
    setPoses(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // movement + “world logic”
  useEffect(() => {
    const key = 'propost.hq.poses.v1'
    const tick = (ts: number) => {
      const dtMs = ts - (lastRef.current || ts)
      lastRef.current = ts
      const dt = clamp(dtMs / 1000, 0, 0.05)

      setPoses((prev) => {
        const next: Record<string, AgentPose> = { ...prev }
        const now = Date.now()

        // Commander occasionally calls micro-briefs (makes it “alive”)
        const commander = next.SOVEREIGN
        if (commander && Math.random() < 0.012) {
          commander.line = (LINES.SOVEREIGN ?? ['All clear'])[Math.floor(Math.random() * (LINES.SOVEREIGN?.length ?? 1))]
          commander.lineTtlMs = 1800
          commander.mood = 'talking'

          // CEOs walk to command suite briefly
          Object.keys(next).forEach((a) => {
            if (!isCeo(a) || a === 'SOVEREIGN' || a === 'EUGINE') return
            if (Math.random() < 0.5) {
              next[a] = { ...next[a], room: 'command', ...randomPointInRoom('command'), tx: randomPointInRoom('command').x, ty: randomPointInRoom('command').y, mood: 'walking' } as any
            }
          })
        }

        for (const agent of Object.keys(next)) {
          const p = next[agent]
          if (!p) continue

          // chatter TTL
          if (p.lineTtlMs > 0) p.lineTtlMs = Math.max(0, p.lineTtlMs - dtMs)
          if (p.lineTtlMs === 0 && p.mood === 'talking') p.mood = 'working'

          // pick new targets occasionally
          const wantsMove = Math.random() < 0.02
          if (wantsMove) {
            // workers: roam inside their home room; sometimes visit commons or coffee
            const home = agentHomeRoom(agent)
            const r = Math.random()
            const newRoom: OfficeRoomId =
              agent === 'SOVEREIGN' || agent === 'EUGINE' ? 'command'
                : isCeo(agent) && r < 0.25 ? 'command'
                : r < 0.12 ? 'hall'
                : home

            const pt = randomPointInRoom(newRoom)
            p.room = newRoom
            p.tx = pt.x
            p.ty = pt.y
            p.mood = 'walking'
          }

          // move
          const dx = p.tx - p.x
          const dy = p.ty - p.y
          const dist = Math.hypot(dx, dy)
          const speed = (agentStates?.[agent] === 'active' ? 120 : 90) * dt
          if (dist > 1) {
            p.x += (dx / dist) * Math.min(speed, dist)
            p.y += (dy / dist) * Math.min(speed, dist)
          } else {
            if (p.mood === 'walking') p.mood = 'working'
          }

          // occasional speech line
          if (p.lineTtlMs === 0 && Math.random() < 0.01) {
            const lines = LINES[agent] ?? ['Working…', 'On it.', 'Queued.', 'Checking…']
            p.line = lines[Math.floor(Math.random() * lines.length)]
            p.lineTtlMs = 1600 + Math.random() * 1400
            p.mood = 'talking'
          }

          // keep inside room bounds (prevents drift)
          const b = roomBounds(p.room)
          p.x = clamp(p.x, b.left, b.right)
          p.y = clamp(p.y, b.top, b.bottom)
        }

        // persist occasionally
        if (now % 2000 < 50) {
          try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [agentStates])

  const propsByRoom = useMemo(() => {
    const map: Record<string, OfficeProp[]> = {}
    for (const pr of PROPS) {
      map[pr.room] ||= []
      map[pr.room].push(pr)
    }
    return map
  }, [])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-2" style={{ background: '#0D0D1A', border: '1px solid #1E1E3A', borderRadius: 10 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10, color: '#FFD700', fontFamily: 'monospace', fontWeight: 700 }}>
            🏢 PROPOST HQ — REAL OFFICE (Hybrid)
          </span>
          <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>
            rooms · doors · art · lounge · briefings · readable labels
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
          props: {PROPS.length}
        </div>
      </div>

      <div
        className="relative overflow-hidden mt-2"
        style={{
          height: 600,
          borderRadius: 14,
          border: '1px solid #1E1E3A',
          background: `
            radial-gradient(1200px 600px at 50% 0%, rgba(0,240,255,0.08), transparent 60%),
            radial-gradient(800px 400px at 0% 100%, rgba(255,215,0,0.06), transparent 60%),
            linear-gradient(180deg, #0A0A14 0%, #070712 100%)
          `,
        }}
      >
        {/* Floor texture */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />

        {/* Rooms */}
        {ROOMS.map((r) => (
          <div
            key={r.id}
            className="absolute"
            style={{
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderRadius: 14,
              border: `1px solid ${r.color}33`,
              background: 'rgba(18,18,31,0.78)',
              boxShadow: `0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`,
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* glass wall edge */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                borderRadius: 14,
                border: `1px solid rgba(255,255,255,0.06)`,
                boxShadow: `inset 0 0 0 1px ${r.color}12`,
                pointerEvents: 'none',
              }}
            />

            {/* Door notch */}
            <div
              aria-hidden
              className="absolute"
              style={{
                left: '50%',
                bottom: -1,
                width: 64,
                height: 10,
                transform: 'translateX(-50%)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${r.color}22`,
              }}
            />

            {/* Header */}
            <div className="absolute left-3 top-3 right-3 flex items-start justify-between gap-3">
              <div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: r.color, letterSpacing: 0.3 }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {r.subtitle}
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 10px ${r.color}66` }} />
                <span>{r.id.toUpperCase()}</span>
              </div>
            </div>

            {/* Props */}
            {(propsByRoom[r.id] ?? []).map((pr) => (
              <div
                key={pr.id}
                className={`absolute ${propClass(pr.kind)}`}
                style={{
                  left: pr.x - r.x,
                  top: pr.y - r.y,
                  width: pr.w,
                  height: pr.h,
                  borderRadius: pr.kind === 'round_table' ? 999 : 10,
                  transform: pr.rotate ? `rotate(${pr.rotate}deg)` : undefined,
                }}
                title={pr.label ?? pr.kind}
              >
                {(pr.kind === 'painting' || pr.kind === 'sign' || pr.kind === 'whiteboard' || pr.kind === 'tv') && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ fontFamily: 'monospace', fontSize: 10, color: '#E2E8F0', opacity: 0.8 }}
                  >
                    {pr.label ?? ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Agents */}
        {Object.entries(poses).map(([agent, p]) => {
          const o = spriteFor(agent)
          const st = agentStates?.[agent]
          const clickable = Boolean(onAgentClick)
          return (
            <button
              key={agent}
              onClick={() => onAgentClick?.(agent)}
              className="absolute"
              style={{
                left: p.x,
                top: p.y,
                width: 34,
                height: 42,
                transform: 'translate(-50%, -50%)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              {/* Nameplate */}
              <div
                className="absolute left-1/2"
                style={{
                  transform: 'translate(-50%, -112%)',
                  minWidth: 120,
                  maxWidth: 200,
                  padding: '6px 8px',
                  borderRadius: 999,
                  background: 'rgba(13,13,26,0.92)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex items-center gap-2" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: statusDot(st), boxShadow: `0 0 10px ${statusDot(st)}77` }}
                    />
                    <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#E2E8F0' }}>
                      {namePlate(agent)}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>
                    {roleLine(agent)}
                  </span>
                </div>
              </div>

              {/* Pixel person */}
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: 'translate(-50%, -35%)',
                  width: 22,
                  height: 30,
                  imageRendering: 'pixelated',
                }}
              >
                {/* crown */}
                {agent === 'EUGINE' && (
                  <div style={{ position: 'absolute', left: 6, top: -10, fontSize: 14, filter: 'drop-shadow(0 4px 10px rgba(255,215,0,0.4))' }}>
                    👑
                  </div>
                )}
                {/* hair */}
                <div style={{ position: 'absolute', left: 4, top: 0, width: 14, height: 5, background: o.hair, borderRadius: 2 }} />
                {/* head */}
                <div style={{ position: 'absolute', left: 5, top: 4, width: 12, height: 10, background: o.skin, borderRadius: 2, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.12)' }} />
                {/* body */}
                <div style={{ position: 'absolute', left: 4, top: 14, width: 14, height: 10, background: o.shirt, borderRadius: 2, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)' }} />
                {/* legs */}
                <div style={{ position: 'absolute', left: 5, top: 24, width: 6, height: 6, background: o.pants, borderRadius: 2 }} />
                <div style={{ position: 'absolute', left: 12, top: 24, width: 6, height: 6, background: o.pants, borderRadius: 2 }} />
              </div>

              {/* speech bubble */}
              {p.lineTtlMs > 0 && (
                <div
                  className="absolute left-1/2"
                  style={{
                    transform: 'translate(-50%, -170%)',
                    maxWidth: 220,
                    padding: '6px 8px',
                    borderRadius: 12,
                    background: 'rgba(10,10,20,0.92)',
                    border: '1px solid rgba(0,240,255,0.20)',
                    color: '#E2E8F0',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.line}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

