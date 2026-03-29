export type OfficeRoomId =
  | 'command'
  | 'xforce'
  | 'linkedelite'
  | 'gramgod'
  | 'pagepower'
  | 'webboss'
  | 'commons'

export type OfficeRoom = {
  id: OfficeRoomId
  name: string
  subtitle: string
  color: string
  // grid position (col, row, colSpan, rowSpan) — used by CSS grid
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

export type OfficePropKind =
  | 'table'
  | 'chair'
  | 'sofa'
  | 'whiteboard'
  | 'tv'
  | 'plant'
  | 'bookshelf'
  | 'coffee'
  | 'rug'
  | 'pod'

export type OfficeProp = {
  id: string
  kind: OfficePropKind
  // position as % of room width/height so they scale correctly
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  label?: string
  round?: boolean
}

export type OfficeRoomDef = OfficeRoom & { props: OfficeProp[] }

export const ROOMS: OfficeRoomDef[] = [
  {
    id: 'command',
    name: 'COMMAND SUITE',
    subtitle: 'Founder · SOVEREIGN · Briefings',
    color: '#FFD700',
    col: 2, row: 1, colSpan: 2, rowSpan: 1,
    props: [
      { id: 'cmd-table', kind: 'table', xPct: 35, yPct: 30, wPct: 30, hPct: 40, label: 'STRATEGY', round: true },
      { id: 'cmd-board', kind: 'whiteboard', xPct: 88, yPct: 10, wPct: 8, hPct: 80, label: 'BRIEF' },
      { id: 'cmd-rug', kind: 'rug', xPct: 28, yPct: 25, wPct: 44, hPct: 50 },
      { id: 'cmd-plant-l', kind: 'plant', xPct: 4, yPct: 60, wPct: 6, hPct: 30 },
      { id: 'cmd-plant-r', kind: 'plant', xPct: 90, yPct: 60, wPct: 6, hPct: 30 },
    ],
  },
  {
    id: 'xforce',
    name: 'WAR ROOM',
    subtitle: 'X / Twitter Ops',
    color: '#1DA1F2',
    col: 1, row: 1, colSpan: 1, rowSpan: 2,
    props: [
      { id: 'x-table', kind: 'table', xPct: 20, yPct: 30, wPct: 60, hPct: 35, label: 'OPS', round: true },
      { id: 'x-board', kind: 'whiteboard', xPct: 4, yPct: 10, wPct: 8, hPct: 55, label: 'TACTICS' },
      { id: 'x-tv', kind: 'tv', xPct: 30, yPct: 8, wPct: 40, hPct: 18, label: 'TRENDS LIVE' },
      { id: 'x-rug', kind: 'rug', xPct: 12, yPct: 60, wPct: 76, hPct: 28 },
      { id: 'x-plant', kind: 'plant', xPct: 88, yPct: 70, wPct: 8, hPct: 22 },
    ],
  },
  {
    id: 'gramgod',
    name: 'STUDIO',
    subtitle: 'Instagram Ops',
    color: '#E1306C',
    col: 4, row: 1, colSpan: 1, rowSpan: 2,
    props: [
      { id: 'g-table', kind: 'table', xPct: 20, yPct: 30, wPct: 60, hPct: 35, label: 'CREATIVE', round: true },
      { id: 'g-tv', kind: 'tv', xPct: 30, yPct: 8, wPct: 40, hPct: 18, label: 'REELS QUEUE' },
      { id: 'g-board', kind: 'whiteboard', xPct: 88, yPct: 10, wPct: 8, hPct: 55, label: 'SHOT LIST' },
      { id: 'g-rug', kind: 'rug', xPct: 12, yPct: 60, wPct: 76, hPct: 28 },
      { id: 'g-plant', kind: 'plant', xPct: 4, yPct: 70, wPct: 8, hPct: 22 },
    ],
  },
  {
    id: 'commons',
    name: 'COMMONS',
    subtitle: 'Lounge · Coffee · Focus Pods',
    color: '#94A3B8',
    col: 2, row: 2, colSpan: 2, rowSpan: 1,
    props: [
      { id: 'c-sofa-l', kind: 'sofa', xPct: 4, yPct: 20, wPct: 22, hPct: 55, label: 'LOUNGE' },
      { id: 'c-coffee', kind: 'coffee', xPct: 42, yPct: 15, wPct: 16, hPct: 65, label: 'COFFEE' },
      { id: 'c-tv', kind: 'tv', xPct: 62, yPct: 15, wPct: 22, hPct: 65, label: 'MEDIA WALL' },
      { id: 'c-pod', kind: 'pod', xPct: 88, yPct: 15, wPct: 8, hPct: 65, label: 'FOCUS' },
      { id: 'c-rug', kind: 'rug', xPct: 28, yPct: 10, wPct: 44, hPct: 80 },
    ],
  },
  {
    id: 'linkedelite',
    name: 'BOARDROOM',
    subtitle: 'LinkedIn Ops',
    color: '#0077B5',
    col: 1, row: 3, colSpan: 1, rowSpan: 1,
    props: [
      { id: 'li-table', kind: 'table', xPct: 15, yPct: 20, wPct: 70, hPct: 50, label: 'EXEC TABLE', round: true },
      { id: 'li-board', kind: 'whiteboard', xPct: 4, yPct: 10, wPct: 8, hPct: 80, label: 'PIPELINE' },
      { id: 'li-books', kind: 'bookshelf', xPct: 88, yPct: 10, wPct: 8, hPct: 80 },
      { id: 'li-rug', kind: 'rug', xPct: 12, yPct: 70, wPct: 76, hPct: 22 },
    ],
  },
  {
    id: 'pagepower',
    name: 'COMMUNITY HALL',
    subtitle: 'Facebook Ops',
    color: '#1877F2',
    col: 2, row: 3, colSpan: 2, rowSpan: 1,
    props: [
      { id: 'fb-table', kind: 'table', xPct: 30, yPct: 20, wPct: 40, hPct: 50, label: 'COMMUNITY', round: true },
      { id: 'fb-tv', kind: 'tv', xPct: 78, yPct: 10, wPct: 18, hPct: 40, label: 'CLIPS' },
      { id: 'fb-board', kind: 'whiteboard', xPct: 4, yPct: 10, wPct: 8, hPct: 80, label: 'MODERATION' },
      { id: 'fb-rug', kind: 'rug', xPct: 22, yPct: 68, wPct: 56, hPct: 24 },
      { id: 'fb-plant-l', kind: 'plant', xPct: 14, yPct: 65, wPct: 5, hPct: 28 },
      { id: 'fb-plant-r', kind: 'plant', xPct: 81, yPct: 65, wPct: 5, hPct: 28 },
    ],
  },
  {
    id: 'webboss',
    name: 'ENGINE ROOM',
    subtitle: 'Web / SEO Ops',
    color: '#22C55E',
    col: 4, row: 3, colSpan: 1, rowSpan: 1,
    props: [
      { id: 'web-table', kind: 'table', xPct: 20, yPct: 20, wPct: 60, hPct: 50, label: 'DEPLOY', round: true },
      { id: 'web-board', kind: 'whiteboard', xPct: 4, yPct: 10, wPct: 8, hPct: 80, label: 'SEO' },
      { id: 'web-books', kind: 'bookshelf', xPct: 88, yPct: 10, wPct: 8, hPct: 80 },
      { id: 'web-tv', kind: 'tv', xPct: 30, yPct: 8, wPct: 40, hPct: 18, label: 'VITALS' },
      { id: 'web-rug', kind: 'rug', xPct: 12, yPct: 68, wPct: 76, hPct: 24 },
    ],
  },
]

export const AGENTS_BY_ROOM: Record<OfficeRoomId, string[]> = {
  command: ['EUGINE', 'SOVEREIGN', 'ORACLE', 'MEMORY', 'SENTRY', 'SCRIBE'],
  xforce: ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL'],
  gramgod: ['AURORA', 'VIBE', 'CHAT', 'DEAL_IG', 'LENS'],
  linkedelite: ['NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL_LI', 'GRAPH'],
  pagepower: ['CHIEF', 'PULSE', 'COMMUNITY', 'REACH'],
  webboss: ['ROOT', 'CRAWL', 'BUILD', 'SHIELD', 'SPEED'],
  commons: [],
}
