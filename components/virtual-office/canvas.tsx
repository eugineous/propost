'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ROOMS, CANVAS_WIDTH, CANVAS_HEIGHT, DESK_POSITIONS, type Room } from './rooms'
import { drawAgent, drawDesk, AGENT_COLORS, type AgentSprite, type SpriteState } from './sprites'

interface AgentStatusEvent {
  agentName: string
  status: string
  currentTask?: string
}

interface OfficeCanvasProps {
  onAgentClick?: (agentName: string) => void
}

const STATUS_TO_SPRITE: Record<string, SpriteState> = {
  active: 'working',
  idle: 'idle',
  paused: 'idle',
  error: 'alert',
  unresponsive: 'alert',
}

// CEO agents per room
const ROOM_AGENTS: Record<string, string[]> = {
  xforce: ['ZARA', 'BLAZE', 'ECHO', 'SCOUT'],
  linkedelite: ['NOVA', 'ORATOR', 'BRIDGE'],
  gramgod: ['AURORA', 'CAPTION', 'REEL', 'STORY', 'CHAT'],
  pagepower: ['CHIEF', 'REACH', 'COMMUNITY', 'PULSE'],
  webboss: ['ROOT', 'BUILD', 'CRAWL', 'SPEED', 'SHIELD'],
  intelcore: ['ORACLE', 'SENTRY', 'MEMORY', 'RISK'],
}

export default function OfficeCanvas({ onAgentClick }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spritesRef = useRef<Map<string, AgentSprite>>(new Map())
  const frameRef = useRef(0)
  const animRef = useRef<number>(0)
  const highlightRef = useRef<Map<string, number>>(new Map())
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Initialize sprites
  useEffect(() => {
    for (const room of ROOMS) {
      const agents = ROOM_AGENTS[room.company] ?? []
      agents.forEach((agentName, i) => {
        const desk = DESK_POSITIONS[i] ?? DESK_POSITIONS[0]
        spritesRef.current.set(agentName, {
          name: agentName,
          company: room.company,
          color: AGENT_COLORS[agentName] ?? '#888',
          state: 'idle',
          x: room.x + desk.x,
          y: room.y + desk.y,
          frame: 0,
        })
      })
    }
  }, [])

  // SSE: agent status updates
  useEffect(() => {
    const es = new EventSource('/api/agents/status')
    es.onmessage = (e) => {
      const data: { type?: string; agents?: AgentStatusEvent[]; agentName?: string; status?: string } = JSON.parse(e.data)
      if (data.type === 'initial' && Array.isArray(data.agents)) {
        for (const a of data.agents) {
          const sprite = spritesRef.current.get(a.agentName)
          if (sprite) sprite.state = STATUS_TO_SPRITE[a.status] ?? 'idle'
        }
      } else if (data.agentName && data.status) {
        const sprite = spritesRef.current.get(data.agentName)
        if (sprite) sprite.state = STATUS_TO_SPRITE[data.status] ?? 'idle'
      }
    }
    return () => es.close()
  }, [])

  // SSE: activity events → highlight rooms
  useEffect(() => {
    const es = new EventSource('/api/activity')
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.company) {
        highlightRef.current.set(data.company, Date.now() + 2000)
      }
    }
    return () => es.close()
  }, [])

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    frameRef.current = (frameRef.current + 1) % 4
    const frame = frameRef.current

    // Background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const now = Date.now()

    // Draw rooms
    for (const room of ROOMS) {
      const isHighlighted = (highlightRef.current.get(room.company) ?? 0) > now

      // Room background
      ctx.fillStyle = room.bgColor
      ctx.fillRect(room.x, room.y, room.width, room.height)

      // Room border
      ctx.strokeStyle = isHighlighted ? room.color : room.color + '44'
      ctx.lineWidth = isHighlighted ? 2 : 1
      ctx.strokeRect(room.x, room.y, room.width, room.height)

      // Room label
      ctx.fillStyle = room.color + 'aa'
      ctx.font = '8px monospace'
      ctx.fillText(room.label.toUpperCase(), room.x + 4, room.y + 10)

      // Draw desks
      const agents = ROOM_AGENTS[room.company] ?? []
      agents.forEach((_, i) => {
        const desk = DESK_POSITIONS[i]
        if (desk) drawDesk(ctx, room.x + desk.x, room.y + desk.y + 12, room.color)
      })
    }

    // Draw agents
    for (const sprite of Array.from(spritesRef.current.values())) {
      drawAgent(ctx, sprite, frame)

      // Agent name label
      ctx.fillStyle = sprite.color + 'cc'
      ctx.font = '6px monospace'
      ctx.fillText(sprite.name, sprite.x, sprite.y + 18)

      // Selected highlight
      if (selectedAgent === sprite.name) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(sprite.x - 2, sprite.y - 2, 20, 22)
      }
    }

    animRef.current = requestAnimationFrame(render)
  }, [selectedAgent])

  useEffect(() => {
    // Slow down to ~8fps for pixel art feel
    let last = 0
    const loop = (ts: number) => {
      if (ts - last > 150) {
        last = ts
        render()
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    for (const sprite of Array.from(spritesRef.current.values())) {
      if (mx >= sprite.x - 2 && mx <= sprite.x + 18 && my >= sprite.y - 2 && my <= sprite.y + 20) {
        setSelectedAgent(sprite.name)
        onAgentClick?.(sprite.name)
        return
      }
    }
    setSelectedAgent(null)
  }, [onAgentClick])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleClick}
      className="pixel-art w-full cursor-pointer rounded border border-gray-800"
      style={{ imageRendering: 'pixelated', background: '#0a0a0f' }}
    />
  )
}
