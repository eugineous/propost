export type OfficeRoomId =
  | 'command'
  | 'xforce'
  | 'linkedelite'
  | 'gramgod'
  | 'pagepower'
  | 'webboss'
  | 'hall'

export type OfficeRoom = {
  id: OfficeRoomId
  name: string
  subtitle: string
  color: string
  x: number
  y: number
  w: number
  h: number
}

export type OfficePropKind =
  | 'door'
  | 'sofa'
  | 'armchair'
  | 'round_table'
  | 'chair'
  | 'plant'
  | 'whiteboard'
  | 'painting'
  | 'rug'
  | 'lamp'
  | 'bookshelf'
  | 'tv'
  | 'coffee_bar'
  | 'pod'
  | 'printer'
  | 'watercooler'
  | 'sign'
  | 'window'

export type OfficeProp = {
  id: string
  kind: OfficePropKind
  room: OfficeRoomId
  x: number
  y: number
  w: number
  h: number
  rotate?: number
  label?: string
  style?: 'glass' | 'wood' | 'fabric' | 'metal' | 'greenery' | 'art'
}

export const ROOMS: OfficeRoom[] = [
  { id: 'command', name: 'FOUNDER / COMMAND SUITE', subtitle: 'SOVEREIGN · BRIEFINGS · OVERSIGHT', color: '#FFD700', x: 360, y: 32, w: 520, h: 170 },
  { id: 'xforce', name: 'WAR ROOM', subtitle: 'X/Twitter Ops', color: '#1DA1F2', x: 32, y: 32, w: 310, h: 250 },
  { id: 'gramgod', name: 'STUDIO', subtitle: 'Instagram Ops', color: '#E1306C', x: 898, y: 32, w: 270, h: 250 },
  { id: 'linkedelite', name: 'BOARDROOM', subtitle: 'LinkedIn Ops', color: '#0077B5', x: 32, y: 304, w: 380, h: 250 },
  { id: 'pagepower', name: 'COMMUNITY HALL', subtitle: 'Facebook Ops', color: '#1877F2', x: 436, y: 304, w: 360, h: 250 },
  { id: 'webboss', name: 'ENGINE ROOM', subtitle: 'Web/SEO Ops', color: '#22C55E', x: 820, y: 304, w: 348, h: 250 },
  { id: 'hall', name: 'COMMONS', subtitle: 'Lounge · Coffee · Media Wall · Focus Pods', color: '#94A3B8', x: 360, y: 220, w: 520, h: 70 },
]

function p(id: string, kind: OfficePropKind, room: OfficeRoomId, x: number, y: number, w: number, h: number, extra?: Partial<OfficeProp>): OfficeProp {
  return { id, kind, room, x, y, w, h, ...extra }
}

// We intentionally place a lot of props to make the office feel “real”.
// This list has 120+ instances (doors, sofas, chairs, plants, art, etc.).
export const PROPS: OfficeProp[] = [
  // Doors (glass)
  p('door-command', 'door', 'command', 600, 186, 60, 10, { style: 'glass', label: 'DOOR' }),
  p('door-xforce', 'door', 'xforce', 150, 276, 60, 10, { style: 'glass' }),
  p('door-gramgod', 'door', 'gramgod', 1020, 276, 60, 10, { style: 'glass' }),
  p('door-linkedelite', 'door', 'linkedelite', 180, 548, 60, 10, { style: 'glass' }),
  p('door-pagepower', 'door', 'pagepower', 585, 548, 60, 10, { style: 'glass' }),
  p('door-webboss', 'door', 'webboss', 970, 548, 60, 10, { style: 'glass' }),

  // Command suite furniture
  p('cmd-table', 'round_table', 'command', 560, 92, 120, 120, { style: 'wood', label: 'STRATEGY TABLE' }),
  p('cmd-whiteboard', 'whiteboard', 'command', 820, 60, 40, 120, { style: 'metal', label: 'BRIEFING BOARD' }),
  p('cmd-painting-1', 'painting', 'command', 410, 48, 90, 28, { style: 'art', label: 'NAIROBI SKYLINE' }),
  p('cmd-painting-2', 'painting', 'command', 512, 48, 90, 28, { style: 'art', label: 'URBAN NEWS' }),
  p('cmd-bookshelf', 'bookshelf', 'command', 760, 140, 50, 45, { style: 'wood' }),
  p('cmd-lamp', 'lamp', 'command', 720, 64, 24, 24, { style: 'metal' }),
  p('cmd-rug', 'rug', 'command', 410, 120, 140, 60, { style: 'fabric' }),
  p('cmd-window', 'window', 'command', 865, 48, 12, 150, { style: 'glass' }),

  // Commons / lounge
  p('commons-sofa-1', 'sofa', 'hall', 390, 230, 120, 38, { style: 'fabric', label: 'LOUNGE' }),
  p('commons-sofa-2', 'sofa', 'hall', 750, 230, 120, 38, { style: 'fabric' }),
  p('commons-rug', 'rug', 'hall', 530, 228, 180, 50, { style: 'fabric' }),
  p('commons-coffee', 'coffee_bar', 'hall', 585, 232, 90, 38, { style: 'wood', label: 'COFFEE BAR' }),
  p('commons-tv', 'tv', 'hall', 470, 232, 80, 38, { style: 'metal', label: 'MEDIA WALL' }),
  p('commons-water', 'watercooler', 'hall', 680, 236, 24, 34, { style: 'metal' }),
  p('commons-printer', 'printer', 'hall', 712, 238, 24, 26, { style: 'metal' }),
  p('commons-pod-1', 'pod', 'hall', 840, 228, 30, 50, { style: 'glass', label: 'FOCUS' }),
  p('commons-pod-2', 'pod', 'hall', 360, 228, 30, 50, { style: 'glass', label: 'FOCUS' }),

  // War room (XForce)
  p('x-table', 'round_table', 'xforce', 120, 110, 120, 120, { style: 'wood', label: 'OPS TABLE' }),
  p('x-board', 'whiteboard', 'xforce', 54, 60, 36, 110, { style: 'metal', label: 'TACTICS' }),
  p('x-tv', 'tv', 'xforce', 250, 60, 70, 40, { style: 'metal', label: 'TRENDS' }),
  p('x-rug', 'rug', 'xforce', 62, 190, 210, 62, { style: 'fabric' }),
  p('x-books', 'bookshelf', 'xforce', 260, 140, 52, 50, { style: 'wood' }),

  // Studio (GramGod)
  p('g-table', 'round_table', 'gramgod', 940, 110, 110, 110, { style: 'wood', label: 'CREATIVE' }),
  p('g-tv', 'tv', 'gramgod', 1080, 60, 74, 40, { style: 'metal', label: 'REELS' }),
  p('g-board', 'whiteboard', 'gramgod', 910, 60, 34, 110, { style: 'metal', label: 'SHOT LIST' }),
  p('g-rug', 'rug', 'gramgod', 910, 190, 220, 62, { style: 'fabric' }),
  p('g-paint', 'painting', 'gramgod', 996, 48, 120, 28, { style: 'art', label: 'CAMPAIGNS' }),

  // Boardroom (LinkedElite)
  p('li-table', 'round_table', 'linkedelite', 150, 380, 140, 140, { style: 'wood', label: 'EXEC TABLE' }),
  p('li-board', 'whiteboard', 'linkedelite', 50, 330, 36, 120, { style: 'metal', label: 'PIPELINE' }),
  p('li-books', 'bookshelf', 'linkedelite', 340, 330, 56, 60, { style: 'wood' }),
  p('li-rug', 'rug', 'linkedelite', 70, 480, 300, 60, { style: 'fabric' }),
  p('li-paint', 'painting', 'linkedelite', 130, 316, 140, 26, { style: 'art', label: 'THOUGHT LEADERSHIP' }),

  // Community hall (Facebook)
  p('fb-table', 'round_table', 'pagepower', 520, 380, 140, 140, { style: 'wood', label: 'COMMUNITY' }),
  p('fb-tv', 'tv', 'pagepower', 730, 330, 60, 40, { style: 'metal', label: 'CLIPS' }),
  p('fb-board', 'whiteboard', 'pagepower', 450, 330, 36, 120, { style: 'metal', label: 'MODERATION' }),
  p('fb-rug', 'rug', 'pagepower', 460, 480, 310, 60, { style: 'fabric' }),

  // Engine room (WebBoss)
  p('web-table', 'round_table', 'webboss', 900, 380, 140, 140, { style: 'wood', label: 'DEPLOY' }),
  p('web-books', 'bookshelf', 'webboss', 1130, 330, 34, 120, { style: 'wood' }),
  p('web-board', 'whiteboard', 'webboss', 826, 330, 36, 120, { style: 'metal', label: 'SEO' }),
  p('web-tv', 'tv', 'webboss', 1070, 330, 50, 40, { style: 'metal', label: 'SPEED' }),
  p('web-rug', 'rug', 'webboss', 842, 480, 310, 60, { style: 'fabric' }),

  // Chairs around tables (many)
  ...(() => {
    const items: OfficeProp[] = []
    const tables = [
      { room: 'command' as const, x: 560, y: 92, w: 120, h: 120, color: '#FFD700' },
      { room: 'xforce' as const, x: 120, y: 110, w: 120, h: 120, color: '#1DA1F2' },
      { room: 'gramgod' as const, x: 940, y: 110, w: 110, h: 110, color: '#E1306C' },
      { room: 'linkedelite' as const, x: 150, y: 380, w: 140, h: 140, color: '#0077B5' },
      { room: 'pagepower' as const, x: 520, y: 380, w: 140, h: 140, color: '#1877F2' },
      { room: 'webboss' as const, x: 900, y: 380, w: 140, h: 140, color: '#22C55E' },
    ]
    tables.forEach((t, idx) => {
      const cx = t.x + t.w / 2
      const cy = t.y + t.h / 2
      const r = Math.min(t.w, t.h) / 2 + 14
      const count = idx === 0 ? 10 : 8
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        items.push(
          p(`chair-${t.room}-${i}`, 'chair', t.room, cx + Math.cos(a) * r - 7, cy + Math.sin(a) * r - 7, 14, 14, {
            style: 'metal',
          })
        )
      }
    })
    return items
  })(),

  // Plants everywhere (70+)
  ...(() => {
    const items: OfficeProp[] = []
    const plantSpots: Array<{ room: OfficeRoomId; x: number; y: number }> = []
    ROOMS.forEach((r) => {
      for (let i = 0; i < 12; i++) {
        plantSpots.push({
          room: r.id,
          x: r.x + 14 + (i % 6) * 40,
          y: r.y + r.h - 28 - Math.floor(i / 6) * 22,
        })
      }
    })
    plantSpots.slice(0, 78).forEach((s, i) => {
      items.push(p(`plant-${i}`, 'plant', s.room, s.x, s.y, 14, 18, { style: 'greenery' }))
    })
    return items
  })(),

  // Extra paintings/signage (20+)
  ...Array.from({ length: 22 }).map((_, i) => {
    const r = ROOMS[i % ROOMS.length]
    return p(`art-${i}`, i % 2 === 0 ? 'painting' : 'sign', r.id, r.x + 12 + (i % 4) * 62, r.y + 34, 52, 18, {
      style: i % 2 === 0 ? 'art' : 'metal',
      label: i % 2 === 0 ? 'PRINT' : 'SIGN',
    })
  }),
]

