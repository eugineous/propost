'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { CharacterState } from '@/lib/types'

interface OfficeCanvasProps {
  agentStates?: Record<string, CharacterState>
  onAgentClick?: (agentName: string) => void
}

interface RoomDef {
  label: string
  color: string
  borderColor: string
  textColor: string
  agents: string[]
}

const ROOMS: RoomDef[] = [
  {
    label: 'WAR ROOM',
    color: '#0A0A1E',
    borderColor: '#1DA1F2',
    textColor: '#1DA1F2',
    agents: ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL'],
  },
  {
    label: 'BOARDROOM',
    color: '#0A0A20',
    borderColor: '#FFD700',
    textColor: '#FFD700',
    agents: ['NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL_LI', 'GRAPH'],
  },
  {
    label: 'STUDIO',
    color: '#150A20',
    borderColor: '#E1306C',
    textColor: '#E1306C',
    agents: ['AURORA', 'VIBE', 'CHAT', 'DEAL_IG', 'LENS'],
  },
  {
    label: 'COMMUNITY HALL',
    color: '#0A1020',
    borderColor: '#1877F2',
    textColor: '#1877F2',
    agents: ['CHIEF', 'PULSE', 'COMMUNITY', 'REACH'],
  },
  {
    label: 'ENGINE ROOM',
    color: '#0A1A0A',
    borderColor: '#22C55E',
    textColor: '#22C55E',
    agents: ['ROOT', 'CRAWL', 'BUILD', 'SHIELD', 'SPEED'],
  },
  {
    label: 'SITUATION ROOM',
    color: '#1A1400',
    borderColor: '#FFD700',
    textColor: '#FFD700',
    agents: ['SOVEREIGN', 'ORACLE', 'MEMORY', 'SENTRY', 'SCRIBE', 'EUGINE'],
  },
]

const STATE_COLORS: Record<CharacterState, string> = {
  idle: '#00F0FF',
  active: '#FFD700',
  blocked: '#EF4444',
  paused: '#64748B',
}

const CANVAS_W = 800
const CANVAS_H = 400
const COLS = 3
const ROWS = 2
const ROOM_W = CANVAS_W / COLS
const ROOM_H = CANVAS_H / ROWS
const AGENT_SIZE = 14
const FPS = 12
const FRAME_MS = 1000 / FPS

export default function OfficeCanvas({ agentStates = {}, onAgentClick }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  // Build agent position map for click detection
  const agentPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const getState = useCallback(
    (name: string): CharacterState => agentStates[name] ?? 'idle',
    [agentStates]
  )

  const drawRoom = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      room: RoomDef,
      rx: number,
      ry: number,
      t: number
    ) => {
      // Room background
      ctx.fillStyle = room.color
      ctx.fillRect(rx, ry, ROOM_W, ROOM_H)

      // Room border
      ctx.strokeStyle = room.borderColor
      ctx.lineWidth = 2
      ctx.strokeRect(rx + 1, ry + 1, ROOM_W - 2, ROOM_H - 2)

      // Room label
      ctx.fillStyle = room.textColor
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(room.label, rx + ROOM_W / 2, ry + 14)

      // Agents
      const agents = room.agents
      const cols = Math.min(agents.length, 4)
      const rows = Math.ceil(agents.length / cols)
      const startX = rx + (ROOM_W - cols * 28) / 2 + 14
      const startY = ry + 28

      agents.forEach((agentName, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const ax = startX + col * 28
        const ay = startY + row * 36

        const state = getState(agentName)
        const isEugine = agentName === 'EUGINE'

        // Bob animation
        let bobY = 0
        if (state === 'idle') {
          bobY = Math.sin((t / 2000) * Math.PI * 2 + i * 0.5) * 2
        } else if (state === 'active') {
          bobY = Math.sin((t / 800) * Math.PI * 2 + i * 0.5) * 2
        }

        const drawY = ay + bobY

        // Store position for click detection
        agentPositionsRef.current.set(agentName, { x: ax, y: drawY })

        // Eugine crown
        if (isEugine) {
          ctx.font = '10px serif'
          ctx.textAlign = 'center'
          ctx.fillText('👑', ax, drawY - 4)
        }

        // Agent body
        const color = STATE_COLORS[state]
        ctx.fillStyle = color

        if (state === 'paused') {
          ctx.globalAlpha = 0.5
        }

        ctx.fillRect(ax - AGENT_SIZE / 2, drawY, AGENT_SIZE, AGENT_SIZE)
        ctx.globalAlpha = 1

        // Blocked: red X overlay
        if (state === 'blocked') {
          ctx.strokeStyle = '#FF0000'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(ax - AGENT_SIZE / 2, drawY)
          ctx.lineTo(ax + AGENT_SIZE / 2, drawY + AGENT_SIZE)
          ctx.moveTo(ax + AGENT_SIZE / 2, drawY)
          ctx.lineTo(ax - AGENT_SIZE / 2, drawY + AGENT_SIZE)
          ctx.stroke()
        }

        // Active: speech bubble "..."
        if (state === 'active') {
          const bx = ax + 6
          const by = drawY - 10
          ctx.fillStyle = '#1E1E3A'
          ctx.fillRect(bx, by, 14, 8)
          ctx.fillStyle = '#FFD700'
          ctx.font = '5px monospace'
          ctx.textAlign = 'left'
          ctx.fillText('...', bx + 2, by + 6)
        }

        // Agent name label
        ctx.fillStyle = isEugine ? '#FFD700' : '#E2E8F0'
        ctx.font = '4px "Press Start 2P", monospace'
        ctx.textAlign = 'center'
        const displayName = agentName.length > 6 ? agentName.slice(0, 6) : agentName
        ctx.fillText(displayName, ax, drawY + AGENT_SIZE + 7)
      })
    },
    [getState]
  )

  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const elapsed = timestamp - lastFrameRef.current
      if (elapsed < FRAME_MS) {
        animRef.current = requestAnimationFrame(render)
        return
      }
      lastFrameRef.current = timestamp
      timeRef.current += elapsed

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#0A0A14'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      ROOMS.forEach((room, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const rx = col * ROOM_W
        const ry = row * ROOM_H
        drawRoom(ctx, room, rx, ry, timeRef.current)
      })

      animRef.current = requestAnimationFrame(render)
    },
    [drawRoom]
  )

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onAgentClick) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_W / rect.width
      const scaleY = CANVAS_H / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      for (const [name, pos] of Array.from(agentPositionsRef.current.entries())) {
        if (
          mx >= pos.x - AGENT_SIZE / 2 - 4 &&
          mx <= pos.x + AGENT_SIZE / 2 + 4 &&
          my >= pos.y - 4 &&
          my <= pos.y + AGENT_SIZE + 12
        ) {
          onAgentClick(name)
          return
        }
      }
    },
    [onAgentClick]
  )

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleClick}
      className="w-full h-auto cursor-pointer pixel-border"
      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
    />
  )
}
