// ProPost original pixel sprite system
// 16×16 sprites, 4 frames per state, 150ms per frame
// All sprites drawn programmatically — no external assets required

export type SpriteState = 'idle' | 'working' | 'walking' | 'alert'

export interface AgentSprite {
  name: string
  company: string
  color: string
  state: SpriteState
  x: number
  y: number
  frame: number
  targetX?: number
  targetY?: number
}

// Color palette per company
export const AGENT_COLORS: Record<string, string> = {
  SOVEREIGN: '#a855f7',
  ZARA: '#1d9bf0',
  NOVA: '#0a66c2',
  AURORA: '#e1306c',
  CHIEF: '#1877f2',
  ROOT: '#22c55e',
  ORACLE: '#a855f7',
  BLAZE: '#60a5fa',
  ECHO: '#93c5fd',
  SCOUT: '#bfdbfe',
  ORATOR: '#3b82f6',
  BRIDGE: '#6366f1',
  CAPTION: '#f472b6',
  REEL: '#ec4899',
  STORY: '#db2777',
  CHAT: '#be185d',
  REACH: '#60a5fa',
  COMMUNITY: '#3b82f6',
  PULSE: '#2563eb',
  BUILD: '#4ade80',
  CRAWL: '#22c55e',
  SPEED: '#16a34a',
  SHIELD: '#15803d',
  SENTRY: '#c084fc',
  MEMORY: '#a855f7',
  RISK: '#9333ea',
}

/**
 * Draw a single pixel-art agent character on a canvas context.
 * The character is 16×16 pixels, drawn at (x, y).
 * State determines animation: idle=standing, working=typing, walking=moving, alert=flashing
 */
export function drawAgent(
  ctx: CanvasRenderingContext2D,
  sprite: AgentSprite,
  frame: number
): void {
  const { x, y, color, state } = sprite
  const f = frame % 4

  ctx.save()

  // Body color
  const bodyColor = color
  const darkColor = darken(color, 0.4)
  const lightColor = lighten(color, 0.3)

  // Head (4×4 at top center)
  ctx.fillStyle = lightColor
  ctx.fillRect(x + 6, y, 4, 4)

  // Eyes
  ctx.fillStyle = '#000'
  ctx.fillRect(x + 7, y + 1, 1, 1)
  ctx.fillRect(x + 9, y + 1, 1, 1)

  // Body (6×5)
  ctx.fillStyle = bodyColor
  ctx.fillRect(x + 5, y + 4, 6, 5)

  // Arms — animated based on state
  if (state === 'working') {
    // Typing animation: arms move up/down
    const armY = f < 2 ? y + 5 : y + 6
    ctx.fillStyle = darkColor
    ctx.fillRect(x + 3, armY, 2, 3)
    ctx.fillRect(x + 11, armY, 2, 3)
  } else if (state === 'walking') {
    // Walking: arms swing
    const leftArmY = f % 2 === 0 ? y + 5 : y + 7
    const rightArmY = f % 2 === 0 ? y + 7 : y + 5
    ctx.fillStyle = darkColor
    ctx.fillRect(x + 3, leftArmY, 2, 3)
    ctx.fillRect(x + 11, rightArmY, 2, 3)
  } else {
    // Idle/alert: arms at sides
    ctx.fillStyle = darkColor
    ctx.fillRect(x + 3, y + 5, 2, 4)
    ctx.fillRect(x + 11, y + 5, 2, 4)
  }

  // Legs — animated for walking
  if (state === 'walking') {
    const leftLegX = f % 2 === 0 ? x + 5 : x + 6
    const rightLegX = f % 2 === 0 ? x + 9 : x + 8
    ctx.fillStyle = darkColor
    ctx.fillRect(leftLegX, y + 9, 2, 4)
    ctx.fillRect(rightLegX, y + 9, 2, 4)
  } else {
    ctx.fillStyle = darkColor
    ctx.fillRect(x + 5, y + 9, 2, 4)
    ctx.fillRect(x + 9, y + 9, 2, 4)
  }

  // Alert state: flashing halo
  if (state === 'alert' && f < 2) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x + 8, y + 2, 6, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Working state: show small screen glow
  if (state === 'working') {
    ctx.fillStyle = '#60a5fa44'
    ctx.fillRect(x + 1, y + 3, 3, 2)
  }

  ctx.restore()
}

/**
 * Draw a desk at position (x, y) — 14×8 pixels
 */
export function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save()
  ctx.fillStyle = '#2d2d2d'
  ctx.fillRect(x, y, 14, 8)
  ctx.fillStyle = color + '44'
  ctx.fillRect(x + 1, y + 1, 12, 3) // screen glow
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(x, y + 8, 14, 2) // desk legs
  ctx.restore()
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}
