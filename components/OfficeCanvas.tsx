'use client'
// ProPost Empire — 9-Company Office Canvas v2.0
import { useRef, useEffect, useCallback, useState } from 'react'
import type { CharacterState } from '@/lib/types'

interface Props { agentStates?: Record<string, CharacterState>; onAgentClick?: (n: string) => void }

// ── 9 Companies with themed rooms ────────────────────────────
const ROOMS = [
  {
    id: 'xforce', label: '⚡ XForce Corp', sub: 'X/Twitter Ops',
    border: '#1DA1F2', bg: '#020810', wallColor: '#04101A',
    theme: 'War Room', music: '🎵 Hip-Hop',
    agents: ['ZARA','BLAZE','SCOUT','ECHO','HAWK','LUMEN','PIXEL'],
  },
  {
    id: 'linkedelite', label: '💼 LinkedElite', sub: 'LinkedIn Ops',
    border: '#FFD700', bg: '#050500', wallColor: '#0A0A00',
    theme: 'Boardroom', music: '🎵 Jazz',
    agents: ['NOVA','ORATOR','BRIDGE','ATLAS','DEAL_LI','GRAPH'],
  },
  {
    id: 'gramgod', label: '📸 GramGod Corp', sub: 'Instagram Ops',
    border: '#E1306C', bg: '#080210', wallColor: '#100218',
    theme: 'Creative Studio', music: '🎵 Afrobeats',
    agents: ['AURORA','VIBE','CHAT','DEAL_IG','LENS'],
  },
  {
    id: 'pagepower', label: '👥 PagePower Corp', sub: 'Facebook Ops',
    border: '#1877F2', bg: '#020510', wallColor: '#040A18',
    theme: 'Community Hall', music: '🎵 Gospel',
    agents: ['CHIEF','PULSE','COMMUNITY','REACH'],
  },
  {
    id: 'webboss', label: '🌐 WebBoss Corp', sub: 'Website & SEO',
    border: '#22C55E', bg: '#020A02', wallColor: '#041004',
    theme: 'Server Room', music: '🎵 Lo-Fi',
    agents: ['ROOT','CRAWL','BUILD','SHIELD','SPEED'],
  },
  {
    id: 'intelcore', label: '👑 IntelCore HQ', sub: 'Command Center',
    border: '#FFD700', bg: '#0A0800', wallColor: '#120E00',
    theme: 'Command Center', music: '🎵 Orchestral',
    agents: ['SOVEREIGN','ORACLE','MEMORY','SENTRY','SCRIBE','EUGINE'],
  },
  {
    id: 'hrforce', label: '🧡 HRForce Corp', sub: 'People & Culture',
    border: '#F97316', bg: '#0A0400', wallColor: '#140800',
    theme: 'People Hub', music: '🎵 R&B',
    agents: ['PEOPLE','WELFARE','ROTATE','DISCIPLINE','REWARD','BRIEF'],
  },
  {
    id: 'legalshield', label: '⚖️ LegalShield', sub: 'Compliance & Risk',
    border: '#EF4444', bg: '#0A0202', wallColor: '#140404',
    theme: 'Compliance Room', music: '🎵 Classical',
    agents: ['JUDGE','POLICY','RISK','SHADOW'],
  },
  {
    id: 'financedesk', label: '💹 FinanceDesk', sub: 'Revenue & Deals',
    border: '#10B981', bg: '#020A06', wallColor: '#041408',
    theme: 'Finance Floor', music: '🎵 Smooth Jazz',
    agents: ['BANKER','DEAL_FD','RATE','PITCH'],
  },
]

// ── Outfit colors per agent ───────────────────────────────────
const OUTFITS: Record<string, [string, string, string]> = {
  ZARA:['#1DA1F2','#1a2a3a','#C68642'], BLAZE:['#FF6B35','#2a1a0a','#8D5524'],
  SCOUT:['#00F0FF','#0a2a2a','#FDBCB4'], ECHO:['#A78BFA','#1a0a2a','#C68642'],
  HAWK:['#EF4444','#1a0a0a','#8D5524'], LUMEN:['#FCD34D','#2a2a0a','#FDBCB4'],
  PIXEL:['#6EE7B7','#0a2a1a','#C68642'], NOVA:['#FFD700','#2a2000','#8D5524'],
  ORATOR:['#C4B5FD','#1a1a2a','#FDBCB4'], BRIDGE:['#FCA5A5','#2a0a0a','#C68642'],
  ATLAS:['#93C5FD','#0a1a2a','#8D5524'], DEAL_LI:['#86EFAC','#0a2a0a','#FDBCB4'],
  GRAPH:['#F9A8D4','#2a0a1a','#C68642'], AURORA:['#E1306C','#2a0a1a','#8D5524'],
  VIBE:['#F472B6','#1a0a1a','#FDBCB4'], CHAT:['#FB923C','#2a1a0a','#C68642'],
  DEAL_IG:['#A78BFA','#1a0a2a','#8D5524'], LENS:['#67E8F9','#0a2a2a','#FDBCB4'],
  CHIEF:['#1877F2','#0a1a2a','#C68642'], PULSE:['#60A5FA','#0a1a2a','#8D5524'],
  COMMUNITY:['#34D399','#0a2a1a','#FDBCB4'], REACH:['#FBBF24','#2a2000','#C68642'],
  ROOT:['#22C55E','#0a2a0a','#8D5524'], CRAWL:['#4ADE80','#0a2a0a','#FDBCB4'],
  BUILD:['#86EFAC','#0a2a0a','#C68642'], SHIELD:['#FCA5A5','#2a0a0a','#8D5524'],
  SPEED:['#FDE68A','#2a2000','#FDBCB4'], SOVEREIGN:['#FFD700','#1a1400','#C68642'],
  ORACLE:['#E2E8F0','#1a1a1a','#8D5524'], MEMORY:['#A5F3FC','#0a2a2a','#FDBCB4'],
  SENTRY:['#FCA5A5','#2a0a0a','#C68642'], SCRIBE:['#D8B4FE','#1a0a2a','#8D5524'],
  EUGINE:['#FFD700','#1a1400','#C68642'],
  PEOPLE:['#F97316','#2a1000','#C68642'], WELFARE:['#FB923C','#2a1000','#8D5524'],
  ROTATE:['#FDBA74','#2a1800','#FDBCB4'], DISCIPLINE:['#EA580C','#1a0800','#C68642'],
  REWARD:['#FED7AA','#2a1800','#8D5524'], BRIEF:['#FFEDD5','#2a1800','#FDBCB4'],
  JUDGE:['#EF4444','#1a0000','#C68642'], POLICY:['#F87171','#1a0000','#8D5524'],
  RISK:['#FCA5A5','#1a0000','#FDBCB4'], SHADOW:['#7F1D1D','#0a0000','#C68642'],
  BANKER:['#10B981','#001a0a','#8D5524'], DEAL_FD:['#34D399','#001a0a','#FDBCB4'],
  RATE:['#6EE7B7','#001a0a','#C68642'], PITCH:['#A7F3D0','#001a0a','#8D5524'],
}

// ── Agent chat lines ──────────────────────────────────────────
const LINES: Record<string, string[]> = {
  ZARA:['Posting in 3...','Trend locked 🔥','Engagement up!','Thread ready'],
  BLAZE:['Hot take drafted','Sheng vibes ✓','Thread: 7 tweets','Copy done!'],
  SCOUT:['#KenyaTrends 📈','Breaking news!','Relevance: 0.92','Scanning feeds'],
  ECHO:['Replied to 12 ✓','Quote tweet sent','+47 followers!','DM handled'],
  HAWK:['Approved ✓','Risk: LOW','Checking ToS...','No violations'],
  LUMEN:['4.2M impressions','Monetize ready!','Revenue up 12%','Tracking KPIs'],
  PIXEL:['Score: 847 🔥','Pattern found!','Best time: 7PM','Learning done'],
  NOVA:['LI post live ✓','New connection!','Thought leader','Exec reached'],
  ORATOR:['Article drafted','Carousel ready','Hook: strong ✓','Story arc done'],
  BRIDGE:['20 connects sent','Follow-up done','Network growing','Warm intro ✓'],
  ATLAS:['Algorithm shift!','Competitor scan','Positioning ✓','Intel ready'],
  DEAL_LI:['Job opp found!','Speaking gig 🎤','Brand deal 💰','Salary: 180K'],
  GRAPH:['Engagement: 8.4%','Best post found','Weekly report','Data analyzed'],
  AURORA:['Reel idea 💡','Story posted ✓','Collab request','Visual done'],
  VIBE:['Reel drafted 🎬','Story sequence','Content plan ✓','Trending audio'],
  CHAT:['Niaje boss! 😄','Replied ✓','Brand deal! 💰','DM cleared'],
  DEAL_IG:['KES 50K deal!','Brief received','Counter: 1.5x','Negotiating...'],
  LENS:['Reels: +340%','Visual score 9','Best format: vid','Analytics done'],
  CHIEF:['FB post live ✓','Community warm','Video boosted','Uncle energy 😄'],
  PULSE:['Urban News clip','Video native ✓','Post scheduled','Content ready'],
  COMMUNITY:['Comment replied','Family vibes ✓','2hr response ✓','Community built'],
  REACH:['Boost: KES 500','ROI: 340% 📈','Audience found','Ad approved ✓'],
  ROOT:['SEO audit done','Site speed: A+','All systems go','Crawl complete'],
  CRAWL:['Keywords found','Indexed ✓','Rank: #3 Kenya','SEO score: 94'],
  BUILD:['Article live ✓','Content plan','Blog scheduled','Draft ready'],
  SHIELD:['No threats ✓','SSL valid','Security: A+','All clear 🛡️'],
  SPEED:['Load: 0.8s ⚡','CDN optimized','Core vitals: A','Speed: 98/100'],
  SOVEREIGN:['All clear 👑','Empire running','SENTRY check?','Briefing CEO'],
  ORACLE:['Cross-post opp!','Repurpose this','Synergy found','Strategy set'],
  MEMORY:['Learning... 🧠','Pattern: +12%','Score improved','Insights saved'],
  SENTRY:['No crisis ✓','Monitoring...','All platforms safe','Watching 24/7'],
  SCRIBE:['Report ready 📊','Sitrep sent','Daily brief done','CEO notified'],
  EUGINE:['👑 Watching...','Good work team!','Empire grows 🔥','Approved!'],
  PEOPLE:['Team culture ✓','HR check done','Onboarding set','People first 🧡'],
  WELFARE:['All agents well','Workload ok ✓','Wellness check','No burnout 💪'],
  ROTATE:['Schedule set','Rotation done','Skills mapped','Cross-train ✓'],
  DISCIPLINE:['Standards met','Review done','Accountability ✓','Fair process'],
  REWARD:['KPIs hit! 🏆','Recognition sent','Incentive set','Milestone! 🎉'],
  BRIEF:['Brief ready 📋','Update sent','Comms done','Team informed'],
  JUDGE:['ToS compliant ✓','Policy updated','Ruling: SAFE','No violations'],
  POLICY:['Policy updated','Compliance ✓','Docs ready','Legal clear'],
  RISK:['Risk: LOW ✓','Assessment done','Mitigation set','All clear ⚖️'],
  SHADOW:['No shadowban ✓','Reach normal','Algorithm ok','Monitoring...'],
  BANKER:['Revenue up 📈','ROI: 340%','Cash flow ✓','Empire profitable'],
  DEAL_FD:['Deal pipeline ✓','KES 450K ready','Negotiating...','Pitch sent 💰'],
  RATE:['Rates optimized','Benchmark set','Pricing ✓','Market rate ok'],
  PITCH:['Pitch ready 🎯','Proposal sent','Brand fit ✓','Deck polished'],
}

const TASKS: Record<string, string[]> = {
  ZARA:['Reviewing posts','Approving content','Strategy call'],
  BLAZE:['Writing thread','Drafting hot take','Trend response'],
  SCOUT:['Scanning trends','Monitoring feeds','Trend report'],
  ECHO:['Replying DMs','Quote tweeting','Community work'],
  HAWK:['Reviewing posts','ToS check','Risk assessment'],
  SOVEREIGN:['Empire overview','Routing tasks','CEO briefing'],
  EUGINE:['Reviewing reports','Issuing commands','CEO decisions'],
  PEOPLE:['Culture review','HR planning','Team check'],
  JUDGE:['Compliance scan','Policy review','Risk ruling'],
  BANKER:['Revenue review','Deal pipeline','Finance report'],
}

// ── Layout: 3x3 grid ─────────────────────────────────────────
const CW = 1200, CH = 600, COLS = 3, ROWS = 3
const RW = CW / COLS, RH = CH / ROWS
const FPS = 30, FMS = 1000 / FPS

interface Desk { x: number; y: number }
interface AgentAnim {
  x: number; y: number; tx: number; ty: number
  homeX: number; homeY: number
  phase: number; walkPhase: number
  isWalking: boolean
  chatTimer: number; chatMsg: string; showChat: boolean; chatLife: number
  isTalking: boolean; talkPhase: number
  isSitting: boolean; sitTimer: number
  taskLabel: string; taskTimer: number
  facing: number
  status: 'working' | 'idle' | 'offline'
}

function getDesks(rx: number, ry: number, rw: number, rh: number, count: number): Desk[] {
  const desks: Desk[] = []
  const cols = Math.min(count, 4)
  const rows = Math.ceil(count / cols)
  const padX = 20, padY = 35
  const spacingX = (rw - padX * 2) / Math.max(cols - 1, 1)
  const spacingY = (rh - padY * 2) / Math.max(rows - 1, 1)
  for (let i = 0; i < count; i++) {
    const c = i % cols, r = Math.floor(i / cols)
    desks.push({
      x: rx + padX + c * (cols > 1 ? spacingX : 0),
      y: ry + padY + r * (rows > 1 ? spacingY : 0),
    })
  }
  return desks
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = '#2a2a3a'
  ctx.fillRect(x - 5, y + 14, 10, 2)
  ctx.fillRect(x - 4, y + 16, 2, 5)
  ctx.fillRect(x + 2, y + 16, 2, 5)
  ctx.fillRect(x - 5, y + 8, 10, 2)
  ctx.fillStyle = '#3a3a2a'
  ctx.fillRect(x - 12, y - 2, 24, 3)
  ctx.fillStyle = '#2a2a1a'
  ctx.fillRect(x - 11, y + 1, 2, 8)
  ctx.fillRect(x + 9, y + 1, 2, 8)
  ctx.fillStyle = '#1a1a2a'
  ctx.fillRect(x - 6, y - 12, 12, 9)
  ctx.fillStyle = color + '44'
  ctx.fillRect(x - 5, y - 11, 10, 7)
  ctx.fillStyle = color
  ctx.font = '3px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('▓▒░', x, y - 7)
  ctx.fillStyle = '#1a1a2a'
  ctx.fillRect(x - 1, y - 3, 2, 3)
  ctx.fillRect(x - 3, y, 6, 1)
  ctx.fillStyle = '#2a2a3a'
  ctx.fillRect(x - 5, y + 1, 10, 2)
}

function drawHuman(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  outfit: [string, string, string],
  name: string,
  facing: number,
  walkPhase: number,
  isTalking: boolean,
  talkPhase: number,
  isSitting: boolean,
  isEugine: boolean,
  status: 'working' | 'idle' | 'offline',
) {
  const [shirt, pants, skin] = outfit
  const sy = isSitting ? 6 : 0

  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x, y + 22 + sy, 7, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()

  if (isEugine) {
    ctx.font = '9px serif'
    ctx.textAlign = 'center'
    ctx.fillText('👑', x, y - 3)
  }

  ctx.fillStyle = '#2a1a00'
  ctx.fillRect(x - 4, y + sy, 8, 3)
  ctx.fillStyle = skin
  ctx.fillRect(x - 3, y + 2 + sy, 7, 7)
  ctx.fillStyle = '#1a1a1a'
  if (facing >= 0) {
    ctx.fillRect(x - 1, y + 4 + sy, 1, 1)
    ctx.fillRect(x + 2, y + 4 + sy, 1, 1)
  } else {
    ctx.fillRect(x - 2, y + 4 + sy, 1, 1)
    ctx.fillRect(x + 1, y + 4 + sy, 1, 1)
  }
  if (isTalking) {
    ctx.fillStyle = '#8B0000'
    const mw = Math.abs(Math.sin(talkPhase * 8)) * 2 + 1
    ctx.fillRect(x - 1, y + 7 + sy, mw, 1)
  } else {
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(x, y + 7 + sy, 2, 1)
  }
  ctx.fillStyle = skin
  ctx.fillRect(x - 1, y + 9 + sy, 3, 2)
  ctx.fillStyle = shirt
  ctx.fillRect(x - 4, y + 11 + sy, 8, 7)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(x - 1, y + 11 + sy, 3, 2)

  if (!isSitting) {
    const la = Math.sin(walkPhase) * 3
    const ra = -Math.sin(walkPhase) * 3
    ctx.fillStyle = shirt
    ctx.fillRect(x - 7, y + 11 + la, 3, 6)
    ctx.fillRect(x + 4, y + 11 + ra, 3, 6)
    ctx.fillStyle = skin
    ctx.fillRect(x - 7, y + 17 + la, 3, 2)
    ctx.fillRect(x + 4, y + 17 + ra, 3, 2)
    const ll = Math.sin(walkPhase) * 3
    const rl = -Math.sin(walkPhase) * 3
    ctx.fillStyle = pants
    ctx.fillRect(x - 4, y + 18, 3, 6 + ll)
    ctx.fillRect(x + 1, y + 18, 3, 6 + rl)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(x - 5, y + 24 + ll, 4, 2)
    ctx.fillRect(x + 1, y + 24 + rl, 4, 2)
  } else {
    ctx.fillStyle = shirt
    ctx.fillRect(x - 7, y + 13, 3, 4)
    ctx.fillRect(x + 4, y + 13, 3, 4)
    ctx.fillStyle = skin
    ctx.fillRect(x - 7, y + 17, 3, 2)
    ctx.fillRect(x + 4, y + 17, 3, 2)
    ctx.fillStyle = pants
    ctx.fillRect(x - 3, y + 18, 3, 4)
    ctx.fillRect(x + 1, y + 18, 3, 4)
    ctx.fillRect(x - 5, y + 22, 4, 2)
    ctx.fillRect(x + 1, y + 22, 4, 2)
  }

  // Status dot
  const dotColor = status === 'working' ? '#22C55E' : status === 'idle' ? '#FBBF24' : '#64748B'
  ctx.fillStyle = dotColor
  ctx.beginPath()
  ctx.arc(x + 5, y + sy, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = isEugine ? '#FFD700' : 'rgba(255,255,255,0.7)'
  ctx.font = '4px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(name.length > 7 ? name.slice(0, 7) : name, x, y + 30)
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, msg: string, color: string) {
  ctx.font = '5px monospace'
  const tw = ctx.measureText(msg).width
  const bw = Math.max(tw + 8, 20), bh = 11
  const bx = x - bw / 2, by = y - 22
  ctx.fillStyle = '#0D0D1A'
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 3)
  else ctx.rect(bx, by, bw, bh)
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#0D0D1A'
  ctx.beginPath()
  ctx.moveTo(x - 3, by + bh); ctx.lineTo(x + 3, by + bh); ctx.lineTo(x, by + bh + 4)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(x - 3, by + bh); ctx.lineTo(x, by + bh + 4); ctx.lineTo(x + 3, by + bh)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(msg, x, by + 8)
}

function drawRoomDecor(ctx: CanvasRenderingContext2D, room: typeof ROOMS[0], rx: number, ry: number) {
  const { border, id } = room
  // Room-specific decorations
  if (id === 'xforce') {
    // Military map on wall
    ctx.fillStyle = border + '15'
    ctx.fillRect(rx + RW - 30, ry + 20, 25, 18)
    ctx.strokeStyle = border + '44'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(rx + RW - 28, ry + 24 + i * 5)
      ctx.lineTo(rx + RW - 8, ry + 24 + i * 5)
      ctx.stroke()
    }
  } else if (id === 'gramgod') {
    // Ring light circles
    ctx.strokeStyle = '#FF69B4' + '44'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(rx + RW - 15, ry + 25, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(rx + RW - 15, ry + 25, 5, 0, Math.PI * 2)
    ctx.stroke()
  } else if (id === 'intelcore') {
    // Holographic display
    ctx.fillStyle = border + '22'
    ctx.fillRect(rx + 5, ry + 20, 20, 12)
    ctx.strokeStyle = border + '66'
    ctx.lineWidth = 0.5
    ctx.strokeRect(rx + 5, ry + 20, 20, 12)
  } else if (id === 'webboss') {
    // Server rack
    ctx.fillStyle = '#1a2a1a'
    ctx.fillRect(rx + RW - 20, ry + 20, 15, 30)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = border + '66'
      ctx.fillRect(rx + RW - 18, ry + 22 + i * 5, 11, 3)
    }
  } else if (id === 'financedesk') {
    // Chart on wall
    ctx.strokeStyle = border + '44'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(rx + RW - 28, ry + 35)
    ctx.lineTo(rx + RW - 22, ry + 28)
    ctx.lineTo(rx + RW - 16, ry + 32)
    ctx.lineTo(rx + RW - 10, ry + 22)
    ctx.stroke()
  }
}

// ── Main component ────────────────────────────────────────────
export default function OfficeCanvas({ agentStates = {}, onAgentClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const animsRef = useRef<Map<string, AgentAnim>>(new Map())
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const desksRef = useRef<Map<string, Desk>>(new Map())
  const [tooltip, setTooltip] = useState<{ name: string; task: string; x: number; y: number } | null>(null)
  const [meeting, setMeeting] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  useEffect(() => {
    ROOMS.forEach((room, ri) => {
      const col = ri % COLS, row = Math.floor(ri / ROWS)
      const rx = col * RW, ry = row * RH
      const desks = getDesks(rx, ry, RW, RH, room.agents.length)
      room.agents.forEach((name, i) => {
        const d = desks[i]
        desksRef.current.set(name, d)
        if (!animsRef.current.has(name)) {
          const tasks = TASKS[name] ?? ['Working...']
          animsRef.current.set(name, {
            x: d.x, y: d.y, tx: d.x, ty: d.y, homeX: d.x, homeY: d.y,
            phase: Math.random() * Math.PI * 2, walkPhase: 0,
            isWalking: false,
            chatTimer: 3 + Math.random() * 8, chatMsg: '', showChat: false, chatLife: 0,
            isTalking: false, talkPhase: 0,
            isSitting: true, sitTimer: 5 + Math.random() * 12,
            taskLabel: tasks[Math.floor(Math.random() * tasks.length)],
            taskTimer: 15 + Math.random() * 30,
            facing: 1,
            status: 'working',
          })
        }
      })
    })
  }, [])

  const render = useCallback((ts: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const elapsed = ts - lastRef.current
    if (elapsed < FMS) { animRef.current = requestAnimationFrame(render); return }
    lastRef.current = ts
    timeRef.current += elapsed
    const dt = elapsed / 1000
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0A0A14'
    ctx.fillRect(0, 0, CW, CH)

    ROOMS.forEach((room, ri) => {
      const col = ri % COLS, row = Math.floor(ri / ROWS)
      const rx = col * RW, ry = row * RH

      // Room bg
      ctx.fillStyle = room.bg
      ctx.fillRect(rx, ry, RW, RH)

      // Floor tiles
      ctx.strokeStyle = room.border + '12'
      ctx.lineWidth = 0.5
      for (let tx2 = rx; tx2 < rx + RW; tx2 += 20) {
        ctx.beginPath(); ctx.moveTo(tx2, ry); ctx.lineTo(tx2, ry + RH); ctx.stroke()
      }
      for (let ty2 = ry; ty2 < ry + RH; ty2 += 20) {
        ctx.beginPath(); ctx.moveTo(rx, ty2); ctx.lineTo(rx + RW, ty2); ctx.stroke()
      }

      // Room decor
      drawRoomDecor(ctx, room, rx, ry)

      // Room border (highlight if selected)
      ctx.strokeStyle = selectedRoom === room.id ? room.border : room.border + '88'
      ctx.lineWidth = selectedRoom === room.id ? 2 : 1.5
      ctx.strokeRect(rx + 1, ry + 1, RW - 2, RH - 2)

      // Header bar
      ctx.fillStyle = room.border + '22'
      ctx.fillRect(rx, ry, RW, 18)
      ctx.fillStyle = room.border
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(room.label, rx + 5, ry + 10)
      ctx.fillStyle = room.border + 'AA'
      ctx.font = '3.5px monospace'
      ctx.fillText(room.sub, rx + 5, ry + 16)

      // Music note
      ctx.fillStyle = room.border + '88'
      ctx.font = '6px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(room.music, rx + RW - 5, ry + 10)

      // Performance indicator (pulse dot)
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(timeRef.current / 800 + ri))
      ctx.fillStyle = room.border
      ctx.globalAlpha = pulse
      ctx.beginPath(); ctx.arc(rx + RW - 8, ry + 14, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1

      // Draw desks
      room.agents.forEach(name => {
        const d = desksRef.current.get(name)
        if (d) drawDesk(ctx, d.x, d.y, room.border)
      })

      // Update + draw agents
      room.agents.forEach(name => {
        const a = animsRef.current.get(name)
        if (!a) return

        a.taskTimer -= dt
        if (a.taskTimer <= 0) {
          const tasks = TASKS[name] ?? ['Working...']
          a.taskLabel = tasks[Math.floor(Math.random() * tasks.length)]
          a.taskTimer = 15 + Math.random() * 30
        }

        a.sitTimer -= dt
        if (a.sitTimer <= 0) {
          a.isSitting = !a.isSitting
          a.sitTimer = a.isSitting ? 8 + Math.random() * 15 : 3 + Math.random() * 6
          if (!a.isSitting) {
            const others = room.agents.filter(n => n !== name)
            if (others.length > 0 && Math.random() < 0.5) {
              const target = animsRef.current.get(others[Math.floor(Math.random() * others.length)])
              if (target) { a.tx = target.x + (Math.random() - 0.5) * 12; a.ty = target.y }
            } else {
              a.tx = a.homeX + (Math.random() - 0.5) * 20
              a.ty = a.homeY + (Math.random() - 0.5) * 10
            }
            a.isWalking = true
          } else {
            a.tx = a.homeX; a.ty = a.homeY; a.isWalking = true
          }
        }

        if (a.isWalking) {
          const dx = a.tx - a.x, dy = a.ty - a.y
          const dist = Math.hypot(dx, dy)
          if (dist < 1.5) {
            a.isWalking = false; a.x = a.tx; a.y = a.ty
          } else {
            const spd = 25 * dt
            a.x += (dx / dist) * Math.min(spd, dist)
            a.y += (dy / dist) * Math.min(spd, dist)
            a.walkPhase += dt * 10
            a.facing = dx > 0 ? 1 : -1
          }
          a.status = 'working'
        } else {
          a.phase += dt * 1.2
          a.status = a.isSitting ? 'working' : 'idle'
        }

        a.chatTimer -= dt
        if (a.chatTimer <= 0) {
          const lines = LINES[name] ?? ['Working...']
          a.chatMsg = lines[Math.floor(Math.random() * lines.length)]
          a.showChat = true; a.chatLife = 2.5 + Math.random()
          a.isTalking = true
          a.chatTimer = 5 + Math.random() * 10
        }
        if (a.showChat) {
          a.chatLife -= dt
          a.talkPhase += dt
          if (a.chatLife <= 0) { a.showChat = false; a.isTalking = false }
        }

        const bob = a.isSitting ? 0 : Math.sin(a.phase) * 1.2
        const dx2 = Math.round(a.x), dy2 = Math.round(a.y + bob)
        posRef.current.set(name, { x: dx2, y: dy2 })

        const outfit = OUTFITS[name] ?? ['#888','#333','#C68642']
        drawHuman(ctx, dx2, dy2, outfit as [string,string,string], name, a.facing, a.walkPhase, a.isTalking, a.talkPhase, a.isSitting, name === 'EUGINE', a.status)

        if (a.showChat) drawBubble(ctx, dx2, dy2 - 5, a.chatMsg, room.border)

        if (!a.isWalking && a.isSitting) {
          ctx.fillStyle = room.border + '88'
          ctx.font = '3px monospace'
          ctx.textAlign = 'center'
          const tl = a.taskLabel.length > 14 ? a.taskLabel.slice(0, 14) + '…' : a.taskLabel
          ctx.fillText(tl, dx2, dy2 + 35)
        }
      })
    })

    // Grid dividers
    ctx.strokeStyle = '#1E1E3A'
    ctx.lineWidth = 1
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * RW, 0); ctx.lineTo(c * RW, CH); ctx.stroke()
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * RH); ctx.lineTo(CW, r * RH); ctx.stroke()
    }

    animRef.current = requestAnimationFrame(render)
  }, [selectedRoom])

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CW / rect.width)
    const my = (e.clientY - rect.top) * (CH / rect.height)

    // Check agent click
    if (onAgentClick) {
      for (const [name, pos] of Array.from(posRef.current.entries())) {
        if (mx >= pos.x - 10 && mx <= pos.x + 10 && my >= pos.y - 5 && my <= pos.y + 32) {
          onAgentClick(name); return
        }
      }
    }

    // Check room click
    ROOMS.forEach((room, ri) => {
      const col = ri % COLS, row = Math.floor(ri / ROWS)
      const rx = col * RW, ry = row * RH
      if (mx >= rx && mx <= rx + RW && my >= ry && my <= ry + RH) {
        setSelectedRoom((prev) => prev === room.id ? null : room.id)
      }
    })
  }, [onAgentClick])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CW / rect.width)
    const my = (e.clientY - rect.top) * (CH / rect.height)
    for (const [name, pos] of Array.from(posRef.current.entries())) {
      if (mx >= pos.x - 10 && mx <= pos.x + 10 && my >= pos.y - 5 && my <= pos.y + 32) {
        const a = animsRef.current.get(name)
        setTooltip({ name, task: a?.taskLabel ?? '', x: e.clientX - rect.left, y: e.clientY - rect.top - 35 })
        return
      }
    }
    setTooltip(null)
  }, [])

  const callMeeting = useCallback(() => {
    ROOMS.forEach(room => {
      room.agents.forEach(name => {
        const a = animsRef.current.get(name)
        const sov = animsRef.current.get('SOVEREIGN') ?? animsRef.current.get('EUGINE')
        if (a && sov && name !== 'SOVEREIGN' && name !== 'EUGINE') {
          a.tx = sov.x + (Math.random() - 0.5) * 60
          a.ty = sov.y + (Math.random() - 0.5) * 30
          a.isWalking = true; a.isSitting = false
        }
      })
    })
    setMeeting(true)
    setTimeout(() => setMeeting(false), 15000)
  }, [])

  const selectedRoomData = ROOMS.find((r) => r.id === selectedRoom)
  const totalAgents = ROOMS.reduce((s, r) => s + r.agents.length, 0)

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between px-2 py-1 mb-1" style={{ background: '#0D0D1A' }}>
        <span style={{ color: '#FFD700', fontSize: 8, fontFamily: 'monospace' }}>
          🏢 PROPOST VIRTUAL HQ — {totalAgents} AGENTS · 9 COMPANIES
        </span>
        <div className="flex items-center gap-2">
          {selectedRoomData && (
            <span style={{ color: selectedRoomData.border, fontSize: 7, fontFamily: 'monospace' }}>
              {selectedRoomData.label} · {selectedRoomData.theme} · {selectedRoomData.agents.length} agents
            </span>
          )}
          <button
            onClick={callMeeting}
            className="px-2 py-1 rounded text-xs"
            style={{ background: '#1E1E3A', border: '1px solid #FFD700', color: '#FFD700', fontSize: 7, fontFamily: 'monospace', cursor: 'pointer' }}
          >
            📢 CALL MEETING
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CW} height={CH}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        className="w-full h-auto cursor-pointer"
        style={{ imageRendering: 'pixelated', maxWidth: '100%', display: 'block' }}
      />
      {tooltip && (
        <div className="absolute pointer-events-none px-2 py-1 rounded" style={{
          left: tooltip.x, top: tooltip.y, background: '#1E1E3A',
          border: '1px solid #00F0FF', color: '#E2E8F0', fontSize: 9,
          fontFamily: 'monospace', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          <div style={{ color: '#FFD700' }}>{tooltip.name}</div>
          <div style={{ color: '#64748B' }}>{tooltip.task}</div>
        </div>
      )}
      {meeting && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded" style={{
          background: '#1E1E3A', border: '1px solid #FFD700', color: '#FFD700',
          fontSize: 9, fontFamily: 'monospace', zIndex: 10,
        }}>
          📢 ALL HANDS MEETING — All agents converging to IntelCore HQ
        </div>
      )}
    </div>
  )
}
