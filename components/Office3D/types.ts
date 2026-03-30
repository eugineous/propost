export type Corp =
  | 'xforce'
  | 'linkedelite'
  | 'gramgod'
  | 'pagepower'
  | 'webboss'
  | 'intelcore'
  | 'hrforce'
  | 'legalshield'
  | 'financedesk'

export type RoomTheme =
  | 'war_room'
  | 'boardroom'
  | 'studio'
  | 'server_room'
  | 'command_center'
  | 'people_hub'
  | 'compliance'
  | 'finance_floor'
  | 'community_hall'

export type AgentAnimState = 'idle' | 'walking' | 'typing' | 'celebrating' | 'error' | 'sleeping'

export interface Office3DAgent {
  name: string
  position: [number, number, number]
  rotation: number
  animationState: AgentAnimState
  workflowStep?: string
  color: string
  corp: Corp
}

export interface Office3DRoom {
  corp: Corp
  label: string
  theme: RoomTheme
  agents: Office3DAgent[]
  gridPos: [number, number] // col, row in 3x3 grid
  isActive: boolean
  accentColor: string
}

export const ROOM_CONFIG: Record<Corp, { label: string; theme: RoomTheme; accentColor: string; gridPos: [number, number] }> = {
  intelcore:   { label: 'Command Center',  theme: 'command_center', accentColor: '#FFD700', gridPos: [1, 1] },
  xforce:      { label: 'War Room',        theme: 'war_room',       accentColor: '#1DA1F2', gridPos: [0, 0] },
  linkedelite: { label: 'Boardroom',       theme: 'boardroom',      accentColor: '#0077B5', gridPos: [2, 0] },
  gramgod:     { label: 'Creative Studio', theme: 'studio',         accentColor: '#E1306C', gridPos: [0, 1] },
  pagepower:   { label: 'Community Hall',  theme: 'community_hall', accentColor: '#1877F2', gridPos: [2, 1] },
  webboss:     { label: 'Server Room',     theme: 'server_room',    accentColor: '#22C55E', gridPos: [0, 2] },
  hrforce:     { label: 'People Hub',      theme: 'people_hub',     accentColor: '#F97316', gridPos: [1, 2] },
  legalshield: { label: 'Compliance',      theme: 'compliance',     accentColor: '#EF4444', gridPos: [2, 2] },
  financedesk: { label: 'Finance Floor',   theme: 'finance_floor',  accentColor: '#10B981', gridPos: [1, 0] },
}

export const AGENT_COLORS: Record<string, string> = {
  sovereign: '#FFD700', oracle: '#FFA500', memory: '#9B59B6', sentry: '#E74C3C', scribe: '#3498DB',
  zara: '#1DA1F2', blaze: '#FF6B35', scout: '#2ECC71', echo: '#00BCD4', hawk: '#FF5722',
  lumen: '#FFEB3B', pixel_x: '#9C27B0', thunder: '#607D8B', surge: '#FF9800', flint: '#795548',
  nova_x: '#00E5FF', forge: '#FF4081', trace: '#69F0AE',
  nova: '#0077B5', orator: '#26C6DA', bridge: '#AB47BC', atlas: '#5C6BC0', deal_li: '#26A69A',
  graph: '#EC407A', voice: '#7E57C2', prism: '#42A5F5', mentor: '#66BB6A', amplify: '#FFA726',
  aurora: '#E1306C', vibe: '#FF6090', chat: '#FF8A65', deal_ig: '#CE93D8', lens: '#80DEEA',
  reel: '#F48FB1', story: '#FFCC02', caption: '#A5D6A7', hashtag: '#80CBC4', tribe: '#FFAB40',
  fanbase: '#FF7043', rescue: '#EF9A9A',
  chief: '#1877F2', pulse: '#42A5F5', community: '#64B5F6', reach: '#90CAF9',
  root: '#22C55E', crawl: '#4CAF50', build: '#81C784', shield: '#A5D6A7', speed: '#C8E6C9',
  people: '#F97316', welfare: '#FB923C', rotate: '#FDBA74', discipline: '#FED7AA', reward: '#FEF3C7',
  brief: '#FDE68A', onboard: '#FCD34D', culture: '#FBBF24', train: '#F59E0B', eval: '#D97706',
  social: '#B45309', advocate: '#92400E',
  judge: '#EF4444', policy: '#F87171', risk: '#FCA5A5', copyright: '#FECACA', gdpr: '#FEE2E2',
  defame: '#DC2626', shadow: '#B91C1C', appeal: '#991B1B', counsel: '#7F1D1D',
  banker: '#10B981', deal: '#34D399', rate: '#6EE7B7', invoice: '#A7F3D0', sponsor: '#D1FAE5',
  revenue: '#059669', pitch: '#047857', collab: '#065F46', grants: '#064E3B', forecast: '#022C22',
}
