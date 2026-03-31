// Room layout constants for the ProPost Virtual Office
// 6 rooms in a 2-row × 3-col grid, each 200×160px

export interface Room {
  id: string
  label: string
  company: string
  ceo: string
  color: string
  bgColor: string
  x: number
  y: number
  width: number
  height: number
}

const W = 200
const H = 160
const GAP = 12
const OFFSET_X = 10
const OFFSET_Y = 10

export const ROOMS: Room[] = [
  {
    id: 'war-room',
    label: 'War Room',
    company: 'xforce',
    ceo: 'ZARA',
    color: '#1d9bf0',
    bgColor: '#0a1929',
    x: OFFSET_X,
    y: OFFSET_Y,
    width: W,
    height: H,
  },
  {
    id: 'boardroom',
    label: 'Boardroom',
    company: 'linkedelite',
    ceo: 'NOVA',
    color: '#0a66c2',
    bgColor: '#0a1520',
    x: OFFSET_X + W + GAP,
    y: OFFSET_Y,
    width: W,
    height: H,
  },
  {
    id: 'studio',
    label: 'Studio',
    company: 'gramgod',
    ceo: 'AURORA',
    color: '#e1306c',
    bgColor: '#1a0a12',
    x: OFFSET_X + (W + GAP) * 2,
    y: OFFSET_Y,
    width: W,
    height: H,
  },
  {
    id: 'community-hall',
    label: 'Community Hall',
    company: 'pagepower',
    ceo: 'CHIEF',
    color: '#1877f2',
    bgColor: '#0a1020',
    x: OFFSET_X,
    y: OFFSET_Y + H + GAP,
    width: W,
    height: H,
  },
  {
    id: 'engine-room',
    label: 'Engine Room',
    company: 'webboss',
    ceo: 'ROOT',
    color: '#22c55e',
    bgColor: '#0a1a0f',
    x: OFFSET_X + W + GAP,
    y: OFFSET_Y + H + GAP,
    width: W,
    height: H,
  },
  {
    id: 'situation-room',
    label: 'Situation Room',
    company: 'intelcore',
    ceo: 'ORACLE',
    color: '#a855f7',
    bgColor: '#120a1a',
    x: OFFSET_X + (W + GAP) * 2,
    y: OFFSET_Y + H + GAP,
    width: W,
    height: H,
  },
]

export const CANVAS_WIDTH = OFFSET_X * 2 + W * 3 + GAP * 2
export const CANVAS_HEIGHT = OFFSET_Y * 2 + H * 2 + GAP

// Desk positions within each room (relative to room origin)
export const DESK_POSITIONS = [
  { x: 20, y: 30 },
  { x: 80, y: 30 },
  { x: 140, y: 30 },
  { x: 20, y: 90 },
  { x: 80, y: 90 },
  { x: 140, y: 90 },
]
