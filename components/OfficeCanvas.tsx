'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { CharacterState } from '@/lib/types'

interface OfficeCanvasProps {
  agentStates?: Record<string, CharacterState>
  onAgentClick?: (agentName: string) => void
}

// ── Room definitions ──────────────────────────────────────────
const ROOMS = [
  { id: 'xforce',      label: '⚡ WAR ROOM',       sub: 'XForce Corp',    color: '#060614', border: '#1DA1F2', text: '#1DA1F2', agents: ['ZARA','BLAZE','SCOUT','ECHO','HAWK','LUMEN','PIXEL'] },
  { id: 'linkedin',    label: '💼 BOARDROOM',       sub: 'LinkedElite',    color: '#060618', border: '#FFD700', text: '#FFD700', agents: ['NOVA','ORATOR','BRIDGE','ATLAS','DEAL_LI','GRAPH'] },
  { id: 'instagram',   label: '📸 STUDIO',          sub: 'GramGod Corp',   color: '#100614', border: '#E1306C', text: '#E1306C', agents: ['AURORA','VIBE','CHAT','DEAL_IG','LENS'] },
  { id: 'facebook',    label: '👥 COMMUNITY HALL',  sub: 'PagePower Corp', color: '#060A18', border: '#1877F2', text: '#1877F2', agents: ['CHIEF','PULSE','COMMUNITY','REACH'] },
  { id: 'webboss',     label: '🌐 ENGINE ROOM',     sub: 'WebBoss Corp',   color: '#060E06', border: '#22C55E', text: '#22C55E', agents: ['ROOT','CRAWL','BUILD','SHIELD','SPEED'] },
  { id: 'intelcore',   label: '👑 SITUATION ROOM',  sub: 'IntelCore',      color: '#140E00', border: '#FFD700', text: '#FFD700', agents: ['SOVEREIGN','ORACLE','MEMORY','SENTRY','SCRIBE','EUGINE'] },
]

// Agent personality colors
const AGENT_COLORS: Record<string, string> = {
  ZARA:'#1DA1F2', BLAZE:'#FF6B35', SCOUT:'#00F0FF', ECHO:'#A78BFA', HAWK:'#EF4444', LUMEN:'#FCD34D', PIXEL:'#6EE7B7',
  NOVA:'#FFD700', ORATOR:'#C4B5FD', BRIDGE:'#FCA5A5', ATLAS:'#93C5FD', DEAL_LI:'#86EFAC', GRAPH:'#F9A8D4',
  AURORA:'#E1306C', VIBE:'#F472B6', CHAT:'#FB923C', DEAL_IG:'#A78BFA', LENS:'#67E8F9',
  CHIEF:'#1877F2', PULSE:'#60A5FA', COMMUNITY:'#34D399', REACH:'#FBBF24',
  ROOT:'#22C55E', CRAWL:'#4ADE80', BUILD:'#86EFAC', SHIELD:'#FCA5A5', SPEED:'#FDE68A',
  SOVEREIGN:'#FFD700', ORACLE:'#E2E8F0', MEMORY:'#A5F3FC', SENTRY:'#FCA5A5', SCRIBE:'#D8B4FE', EUGINE:'#FFD700',
}

// Chat bubbles agents say to each other
const AGENT_CHATS: Record<string, string[]> = {
  ZARA:    ['Posting now!','Trend spotted','HAWK check?','Engage!'],
  BLAZE:   ['Draft ready','Hot take 🔥','Thread done','Sheng vibes'],
  SCOUT:   ['#KenyaTrends','Breaking!','Relevance 0.9','Post now!'],
  ECHO:    ['Replied ✓','Engaging...','Quote tweet','+follower!'],
  HAWK:    ['Approved ✓','Risk: LOW','Checking...','Safe to post'],
  CHAT:    ['Niaje boss!','Replied ✓','Brand deal!','Asante sana'],
  AURORA:  ['IG ready','Reel idea!','Story up','Collab?'],
  NOVA:    ['LI post ✓','Connection!','Opp found','Thought lead'],
  SOVEREIGN:['All clear','Routing...','SENTRY?','Empire runs'],
  SENTRY:  ['No crisis','Monitoring','All safe','Alert: none'],
  MEMORY:  ['Learning...','Pattern +','Score: 847','Improving'],
  EUGINE:  ['👑 Founder','Watching...','Good work!','Empire 🔥'],
}

const CANVAS_W = 900
const CANVAS_H = 420
const COLS = 3
const ROWS = 2
const ROOM_W = CANVAS_W / COLS
const ROOM_H = CANVAS_H / ROWS
const FPS = 24
const FRAME_MS = 1000 / FPS

// Per-agent animation state
interface AgentAnim {
  x: number; y: number          // current position
  tx: number; ty: number        // target position
  homeX: number; homeY: number  // home desk position
  bobPhase: number
  walkPhase: number
  isWalking: boolean
  walkTimer: number
  chatTimer: number
  chatMsg: string
  showChat: boolean
  talkTimer: number             // talking animation
  armPhase: number              // arm swing
  legPhase: number              // leg walk
}

export default function OfficeCanvas({ agentStates = {}, onAgentClick }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const agentAnimsRef = useRef<Map<string, AgentAnim>>(new Map())
  const agentPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null)

  // Initialize agent animations
  useEffect(() => {
    ROOMS.forEach((room, ri) => {
      const col = ri % COLS
      const row = Math.floor(ri / COLS)
      const rx = col * ROOM_W
      const ry = row * ROOM_H

      room.agents.forEach((name, i) => {
        if (agentAnimsRef.current.has(name)) return
        const cols = Math.min(room.agents.length, 4)
        const c = i % cols
        const r = Math.floor(i / cols)
        const hx = rx + 22 + c * 32
        const hy = ry + 38 + r * 44

        agentAnimsRef.current.set(name, {
          x: hx, y: hy, tx: hx, ty: hy, homeX: hx, homeY: hy,
          bobPhase: Math.random() * Math.PI * 2,
          walkPhase: 0, isWalking: false, walkTimer: Math.random() * 300,
          chatTimer: Math.random() * 200, chatMsg: '', showChat: false,
          talkTimer: 0, armPhase: 0, legPhase: 0,
        })
      })
    })
  }, [])

  // Draw a human-like pixel character
  const drawHuman = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    color: string,
    name: string,
    isWalking: boolean,
    armPhase: number,
    legPhase: number,
    isEugine: boolean,
    isTalking: boolean,
  ) => {
    const s = 1 // scale

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x, y + 20 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2)
    ctx.fill()

    // Crown for Eugine
    if (isEugine) {
      ctx.font = `${10 * s}px serif`
      ctx.textAlign = 'center'
      ctx.fillText('👑', x, y - 4 * s)
    }

    // Head
    ctx.fillStyle = color
    ctx.fillRect(x - 4 * s, y, 8 * s, 7 * s)

    // Eyes (blink occasionally)
    ctx.fillStyle = '#0A0A14'
    ctx.fillRect(x - 2 * s, y + 2 * s, 2 * s, 2 * s)
    ctx.fillRect(x + 1 * s, y + 2 * s, 2 * s, 2 * s)

    // Mouth — open if talking
    if (isTalking) {
      ctx.fillStyle = '#0A0A14'
      ctx.fillRect(x - 1 * s, y + 5 * s, 3 * s, 2 * s)
    }

    // Body
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.fillRect(x - 3 * s, y + 7 * s, 6 * s, 8 * s)
    ctx.globalAlpha = 1

    // Arms (swing when walking or talking)
    const leftArm = isWalking ? Math.sin(armPhase) * 3 : (isTalking ? Math.sin(armPhase * 2) * 2 : 0)
    const rightArm = isWalking ? -Math.sin(armPhase) * 3 : (isTalking ? -Math.sin(armPhase * 2) * 2 : 0)

    ctx.fillStyle = color
    // Left arm
    ctx.fillRect(x - 6 * s, y + 8 * s + leftArm, 3 * s, 5 * s)
    // Right arm
    ctx.fillRect(x + 3 * s, y + 8 * s + rightArm, 3 * s, 5 * s)

    // Legs
    const leftLeg = isWalking ? Math.sin(legPhase) * 3 : 0
    const rightLeg = isWalking ? -Math.sin(legPhase) * 3 : 0

    ctx.fillStyle = color
    ctx.globalAlpha = 0.7
    // Left leg
    ctx.fillRect(x - 3 * s, y + 15 * s, 3 * s, 5 * s + leftLeg)
    // Right leg
    ctx.fillRect(x + 0 * s, y + 15 * s, 3 * s, 5 * s + rightLeg)
    ctx.globalAlpha = 1

    // Name label
    ctx.fillStyle = isEugine ? '#FFD700' : '#E2E8F0'
    ctx.font = `4px "Press Start 2P", monospace`
    ctx.textAlign = 'center'
    const label = name.length > 7 ? name.slice(0, 7) : name
    ctx.fillText(label, x, y + 24 * s)
  }, [])

  // Draw speech bubble
  const drawBubble = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, msg: string) => {
    const pad = 3
    ctx.font = '5px monospace'
    const tw = ctx.measureText(msg).width
    const bw = tw + pad * 2
    const bh = 10
    const bx = x - bw / 2
    const by = y - 18

    ctx.fillStyle = '#1E1E3A'
    ctx.strokeStyle = '#00F0FF'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 2)
    ctx.fill()
    ctx.stroke()

    // Tail
    ctx.fillStyle = '#1E1E3A'
    ctx.beginPath()
    ctx.moveTo(x - 2, by + bh)
    ctx.lineTo(x + 2, by + bh)
    ctx.lineTo(x, by + bh + 3)
    ctx.fill()

    ctx.fillStyle = '#00F0FF'
    ctx.textAlign = 'center'
    ctx.fillText(msg, x, by + 7)
  }, [])

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const elapsed = timestamp - lastFrameRef.current
    if (elapsed < FRAME_MS) {
      animRef.current = requestAnimationFrame(render)
      return
    }
    lastFrameRef.current = timestamp
    timeRef.current += elapsed
    const t = timeRef.current
    const dt = elapsed / 1000

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0A0A14'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Draw rooms
    ROOMS.forEach((room, ri) => {
      const col = ri % COLS
      const row = Math.floor(ri / COLS)
      const rx = col * ROOM_W
      const ry = row * ROOM_H

      // Room bg
      ctx.fillStyle = room.color
      ctx.fillRect(rx, ry, ROOM_W, ROOM_H)

      // Room border
      ctx.strokeStyle = room.border
      ctx.lineWidth = 1.5
      ctx.strokeRect(rx + 1, ry + 1, ROOM_W - 2, ROOM_H - 2)

      // Desk lines (floor grid)
      ctx.strokeStyle = room.border + '22'
      ctx.lineWidth = 0.5
      for (let dx = rx + 20; dx < rx + ROOM_W - 10; dx += 30) {
        ctx.beginPath(); ctx.moveTo(dx, ry + 30); ctx.lineTo(dx, ry + ROOM_H - 5); ctx.stroke()
      }

      // Room label
      ctx.fillStyle = room.text
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(room.label, rx + 6, ry + 12)
      ctx.fillStyle = room.text + '88'
      ctx.font = '4px monospace'
      ctx.fillText(room.sub, rx + 6, ry + 22)

      // Activity indicator (pulsing dot)
      const pulse = 0.5 + 0.5 * Math.sin(t / 600 + ri)
      ctx.fillStyle = room.border
      ctx.globalAlpha = pulse
      ctx.beginPath()
      ctx.arc(rx + ROOM_W - 10, ry + 10, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Update and draw agents
      room.agents.forEach((name) => {
        const anim = agentAnimsRef.current.get(name)
        if (!anim) return

        // Update walk timer
        anim.walkTimer -= dt
        if (anim.walkTimer <= 0 && !anim.isWalking) {
          // Decide: walk to a nearby agent or back home
          const others = room.agents.filter(n => n !== name)
          const target = Math.random() < 0.4 && others.length > 0
            ? agentAnimsRef.current.get(others[Math.floor(Math.random() * others.length)])
            : null

          if (target && Math.random() < 0.5) {
            anim.tx = target.x + (Math.random() - 0.5) * 10
            anim.ty = target.y
            anim.isWalking = true
          } else {
            anim.tx = anim.homeX + (Math.random() - 0.5) * 8
            anim.ty = anim.homeY
            anim.isWalking = true
          }
          anim.walkTimer = 3 + Math.random() * 5
        }

        // Move toward target
        if (anim.isWalking) {
          const dx = anim.tx - anim.x
          const dy = anim.ty - anim.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 1) {
            anim.isWalking = false
            anim.x = anim.tx
            anim.y = anim.ty
          } else {
            const speed = 20 * dt
            anim.x += (dx / dist) * Math.min(speed, dist)
            anim.y += (dy / dist) * Math.min(speed, dist)
            anim.legPhase += dt * 8
            anim.armPhase += dt * 8
          }
        } else {
          // Idle bob
          anim.bobPhase += dt * 1.5
          anim.armPhase += dt * 0.5
        }

        // Chat bubble timer
        anim.chatTimer -= dt
        if (anim.chatTimer <= 0) {
          const msgs = AGENT_CHATS[name] ?? ['Working...']
          anim.chatMsg = msgs[Math.floor(Math.random() * msgs.length)]
          anim.showChat = true
          anim.talkTimer = 1.5 + Math.random()
          anim.chatTimer = 4 + Math.random() * 6
        }
        if (anim.talkTimer > 0) {
          anim.talkTimer -= dt
          if (anim.talkTimer <= 0) anim.showChat = false
        }

        // Bob offset
        const bob = anim.isWalking ? 0 : Math.sin(anim.bobPhase) * 1.5
        const drawX = Math.round(anim.x)
        const drawY = Math.round(anim.y + bob)

        // Store for click detection
        agentPositionsRef.current.set(name, { x: drawX, y: drawY })

        const color = AGENT_COLORS[name] ?? '#E2E8F0'
        const isEugine = name === 'EUGINE'
        const isTalking = anim.showChat

        drawHuman(ctx, drawX, drawY, color, name, anim.isWalking, anim.armPhase, anim.legPhase, isEugine, isTalking)

        if (anim.showChat) {
          drawBubble(ctx, drawX, drawY, anim.chatMsg)
        }
      })
    })

    // Grid lines between rooms
    ctx.strokeStyle = '#1E1E3A'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ROOM_W, 0); ctx.lineTo(ROOM_W, CANVAS_H)
    ctx.moveTo(ROOM_W * 2, 0); ctx.lineTo(ROOM_W * 2, CANVAS_H)
    ctx.moveTo(0, ROOM_H); ctx.lineTo(CANVAS_W, ROOM_H)
    ctx.stroke()

    animRef.current = requestAnimationFrame(render)
  }, [drawHuman, drawBubble])

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onAgentClick) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    for (const [name, pos] of Array.from(agentPositionsRef.current.entries())) {
      if (mx >= pos.x - 10 && mx <= pos.x + 10 && my >= pos.y - 4 && my <= pos.y + 28) {
        onAgentClick(name)
        return
      }
    }
  }, [onAgentClick])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    for (const [name, pos] of Array.from(agentPositionsRef.current.entries())) {
      if (mx >= pos.x - 10 && mx <= pos.x + 10 && my >= pos.y - 4 && my <= pos.y + 28) {
        setTooltip({ name, x: e.clientX - rect.left, y: e.clientY - rect.top - 30 })
        return
      }
    }
    setTooltip(null)
  }, [])

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        className="w-full h-auto cursor-pointer"
        style={{ imageRendering: 'pixelated', maxWidth: '100%', display: 'block' }}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded text-xs"
          style={{
            left: tooltip.x, top: tooltip.y,
            background: '#1E1E3A', border: '1px solid #00F0FF',
            color: '#00F0FF', fontSize: 10, fontFamily: 'monospace',
            transform: 'translateX(-50%)',
          }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  )
}
