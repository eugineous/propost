'use client'
// ProPost Empire — Full Office Simulation
// Human-like pixel characters with clothes, desks, chairs, free will, briefings
import { useRef, useEffect, useCallback, useState } from 'react'
import type { CharacterState } from '@/lib/types'

interface Props { agentStates?: Record<string, CharacterState>; onAgentClick?: (n: string) => void }

// ── Outfit colors per agent (shirt, pants, skin) ─────────────
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
}

// ── Room layout ───────────────────────────────────────────────
const ROOMS = [
  { id:'xforce',    label:'⚡ XForce Corp',     sub:'X/Twitter Ops',   border:'#1DA1F2', bg:'#04040F', agents:['ZARA','BLAZE','SCOUT','ECHO','HAWK','LUMEN','PIXEL'] },
  { id:'linkedin',  label:'💼 LinkedElite',     sub:'LinkedIn Ops',    border:'#FFD700', bg:'#05050A', agents:['NOVA','ORATOR','BRIDGE','ATLAS','DEAL_LI','GRAPH'] },
  { id:'instagram', label:'📸 GramGod Corp',    sub:'Instagram Ops',   border:'#E1306C', bg:'#080410', agents:['AURORA','VIBE','CHAT','DEAL_IG','LENS'] },
  { id:'facebook',  label:'👥 PagePower Corp',  sub:'Facebook Ops',    border:'#1877F2', bg:'#040810', agents:['CHIEF','PULSE','COMMUNITY','REACH'] },
  { id:'webboss',   label:'🌐 WebBoss Corp',    sub:'Website & SEO',   border:'#22C55E', bg:'#040A04', agents:['ROOT','CRAWL','BUILD','SHIELD','SPEED'] },
  { id:'intelcore', label:'👑 IntelCore HQ',    sub:'Command Center',  border:'#FFD700', bg:'#0A0800', agents:['SOVEREIGN','ORACLE','MEMORY','SENTRY','SCRIBE','EUGINE'] },
]

// ── What agents say ───────────────────────────────────────────
const LINES: Record<string, string[]> = {
  ZARA:    ['Posting in 3...','Trend locked 🔥','HAWK, check this','Engagement up!','Thread ready'],
  BLAZE:   ['Hot take drafted','Sheng vibes ✓','Thread: 7 tweets','Nairobi angle 🎯','Copy done!'],
  SCOUT:   ['#KenyaTrends 📈','Breaking news!','Relevance: 0.92','Post NOW!','Scanning feeds'],
  ECHO:    ['Replied to 12 ✓','Quote tweet sent','+47 followers!','Engaging now','DM handled'],
  HAWK:    ['Approved ✓','Risk: LOW','Checking ToS...','Safe to post','No violations'],
  LUMEN:   ['4.2M impressions','Monetize ready!','X Premium ✓','Revenue up 12%','Tracking KPIs'],
  PIXEL:   ['Score: 847 🔥','Pattern found!','Best time: 7PM','Viral threshold','Learning done'],
  NOVA:    ['LI post live ✓','New connection!','Opp flagged 💼','Thought leader','Exec reached'],
  ORATOR:  ['Article drafted','Carousel ready','Hook: strong ✓','Vulnerability +','Story arc done'],
  BRIDGE:  ['20 connects sent','Follow-up done','Network growing','CMO reached out','Warm intro ✓'],
  ATLAS:   ['Algorithm shift!','Competitor scan','Positioning ✓','Brand gap found','Intel ready'],
  DEAL_LI: ['Job opp found!','Speaking gig 🎤','Brand deal 💰','Collab request','Salary: 180K'],
  GRAPH:   ['Engagement: 8.4%','Best post found','Weekly report','Insights ready','Data analyzed'],
  AURORA:  ['Reel idea 💡','Story posted ✓','Collab request','IG ready to go','Visual done'],
  VIBE:    ['Reel drafted 🎬','Story sequence','Content plan ✓','Aesthetic check','Trending audio'],
  CHAT:    ['Niaje boss! 😄','Replied ✓','Brand deal! 💰','Asante sana ❤️','DM cleared'],
  DEAL_IG: ['KES 50K deal!','Brief received','Counter: 1.5x','Brand fit ✓','Negotiating...'],
  LENS:    ['Reels: +340%','Visual score 9','Best format: vid','Carousel wins','Analytics done'],
  CHIEF:   ['FB post live ✓','Community warm','Video boosted','Page growing','Uncle energy 😄'],
  PULSE:   ['Urban News clip','Video native ✓','Post scheduled','Reach: 4.2K','Content ready'],
  COMMUNITY:['Comment replied','Family vibes ✓','2hr response ✓','Engagement up','Community built'],
  REACH:   ['Boost: KES 500','ROI: 340% 📈','Audience found','Ad approved ✓','Targeting set'],
  ROOT:    ['SEO audit done','Site speed: A+','All systems go','Web optimized','Crawl complete'],
  CRAWL:   ['Keywords found','GSC alert: none','Indexed ✓','Rank: #3 Kenya','SEO score: 94'],
  BUILD:   ['Article live ✓','Content plan','Blog scheduled','SEO content ✓','Draft ready'],
  SHIELD:  ['No threats ✓','SSL valid','Security: A+','Firewall up','All clear 🛡️'],
  SPEED:   ['Load: 0.8s ⚡','CDN optimized','Core vitals: A','Cache cleared','Speed: 98/100'],
  SOVEREIGN:['All clear 👑','Routing to ZARA','Empire running','SENTRY check?','Briefing CEO'],
  ORACLE:  ['Cross-post opp!','Repurpose this','Multi-platform','Synergy found','Strategy set'],
  MEMORY:  ['Learning... 🧠','Pattern: +12%','Score improved','Strategy updated','Insights saved'],
  SENTRY:  ['No crisis ✓','Monitoring...','All platforms safe','Alert: none','Watching 24/7'],
  SCRIBE:  ['Report ready 📊','Sitrep sent','Daily brief done','Metrics logged','CEO notified'],
  EUGINE:  ['👑 Watching...','Good work team!','Empire grows 🔥','Approved!','Keep pushing!'],
}

// ── Desk/chair positions per room ────────────────────────────
interface Desk { x: number; y: number; facing: 'left'|'right'|'up' }

function getDesks(rx: number, ry: number, rw: number, rh: number, count: number): Desk[] {
  const desks: Desk[] = []
  const cols = Math.min(count, 4)
  const rows = Math.ceil(count / cols)
  const padX = 18, padY = 32
  const spacingX = (rw - padX * 2) / Math.max(cols - 1, 1)
  const spacingY = (rh - padY * 2) / Math.max(rows - 1, 1)
  for (let i = 0; i < count; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    desks.push({
      x: rx + padX + c * (cols > 1 ? spacingX : 0),
      y: ry + padY + r * (rows > 1 ? spacingY : 0),
      facing: c % 2 === 0 ? 'right' : 'left',
    })
  }
  return desks
}

// ── Agent animation state ─────────────────────────────────────
interface AgentAnim {
  x: number; y: number; tx: number; ty: number
  homeX: number; homeY: number
  phase: number; walkPhase: number
  isWalking: boolean; walkTimer: number
  chatTimer: number; chatMsg: string; showChat: boolean; chatLife: number
  isTalking: boolean; talkPhase: number
  isSitting: boolean; sitTimer: number
  briefingTimer: number; isBriefing: boolean
  meetingTimer: number; inMeeting: boolean
  taskLabel: string; taskTimer: number
  facing: number // -1 left, 1 right
}

const TASKS: Record<string, string[]> = {
  ZARA:['Reviewing posts','Approving content','Briefing BLAZE','Strategy call','Checking metrics'],
  BLAZE:['Writing thread','Drafting hot take','Editing copy','Trend response','Content review'],
  SCOUT:['Scanning trends','Monitoring feeds','Scoring topics','Flagging news','Trend report'],
  ECHO:['Replying DMs','Quote tweeting','Engaging fans','Building replies','Community work'],
  HAWK:['Reviewing posts','ToS check','Risk assessment','Compliance scan','Safety audit'],
  CHAT:['Clearing DMs','Replying fans','Brand deal chat','Backlog clear','IG engagement'],
  AURORA:['Planning reels','Story strategy','Collab review','Content calendar','IG audit'],
  SOVEREIGN:['Empire overview','Routing tasks','CEO briefing','Strategy review','Team check'],
  EUGINE:['Reviewing reports','Issuing commands','Approving strategy','CEO decisions','Monitoring'],
}

const CW = 960, CH = 480, COLS = 3, ROWS = 2
const RW = CW / COLS, RH = CH / ROWS
const FPS = 30, FMS = 1000 / FPS

// ── Draw a proper human character ────────────────────────────
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
) {
  const [shirt, pants, skin] = outfit
  const f = facing // -1 or 1
  const sy = isSitting ? 6 : 0 // shift down when sitting

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x, y + 22 + sy, 7, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Crown
  if (isEugine) {
    ctx.font = '9px serif'
    ctx.textAlign = 'center'
    ctx.fillText('👑', x, y - 3)
  }

  // Hair
  ctx.fillStyle = name === 'EUGINE' ? '#1a0a00' : (parseInt(skin.slice(1), 16) > 0xB00000 ? '#2a1a00' : '#1a0a00')
  ctx.fillRect(x - 4, y + sy, 8, 3)

  // Head
  ctx.fillStyle = skin
  ctx.fillRect(x - 3, y + 2 + sy, 7, 7)

  // Eyes
  ctx.fillStyle = '#1a1a1a'
  if (f >= 0) {
    ctx.fillRect(x - 1, y + 4 + sy, 1, 1)
    ctx.fillRect(x + 2, y + 4 + sy, 1, 1)
  } else {
    ctx.fillRect(x - 2, y + 4 + sy, 1, 1)
    ctx.fillRect(x + 1, y + 4 + sy, 1, 1)
  }

  // Mouth
  if (isTalking) {
    ctx.fillStyle = '#8B0000'
    const mw = Math.abs(Math.sin(talkPhase * 8)) * 2 + 1
    ctx.fillRect(x - 1, y + 7 + sy, mw, 1)
  } else {
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(x, y + 7 + sy, 2, 1)
  }

  // Neck
  ctx.fillStyle = skin
  ctx.fillRect(x - 1, y + 9 + sy, 3, 2)

  // Shirt/torso
  ctx.fillStyle = shirt
  ctx.fillRect(x - 4, y + 11 + sy, 8, 7)

  // Collar detail
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(x - 1, y + 11 + sy, 3, 2)

  if (!isSitting) {
    // Arms
    const la = Math.sin(walkPhase) * 3
    const ra = -Math.sin(walkPhase) * 3
    ctx.fillStyle = shirt
    ctx.fillRect(x - 7, y + 11 + la, 3, 6) // left arm
    ctx.fillRect(x + 4, y + 11 + ra, 3, 6) // right arm
    // Hands
    ctx.fillStyle = skin
    ctx.fillRect(x - 7, y + 17 + la, 3, 2)
    ctx.fillRect(x + 4, y + 17 + ra, 3, 2)

    // Pants/legs
    const ll = Math.sin(walkPhase) * 3
    const rl = -Math.sin(walkPhase) * 3
    ctx.fillStyle = pants
    ctx.fillRect(x - 4, y + 18, 3, 6 + ll)
    ctx.fillRect(x + 1, y + 18, 3, 6 + rl)
    // Shoes
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(x - 5, y + 24 + ll, 4, 2)
    ctx.fillRect(x + 1, y + 24 + rl, 4, 2)
  } else {
    // Sitting: arms on desk
    ctx.fillStyle = shirt
    ctx.fillRect(x - 7, y + 13, 3, 4)
    ctx.fillRect(x + 4, y + 13, 3, 4)
    ctx.fillStyle = skin
    ctx.fillRect(x - 7, y + 17, 3, 2)
    ctx.fillRect(x + 4, y + 17, 3, 2)
    // Legs bent
    ctx.fillStyle = pants
    ctx.fillRect(x - 3, y + 18, 3, 4)
    ctx.fillRect(x + 1, y + 18, 3, 4)
    ctx.fillRect(x - 5, y + 22, 4, 2)
    ctx.fillRect(x + 1, y + 22, 4, 2)
  }

  // Name tag
  ctx.fillStyle = isEugine ? '#FFD700' : 'rgba(255,255,255,0.7)'
  ctx.font = '4px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(name.length > 7 ? name.slice(0, 7) : name, x, y + 30)
}

// ── Draw desk + chair ─────────────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Chair
  ctx.fillStyle = '#2a2a3a'
  ctx.fillRect(x - 5, y + 14, 10, 2) // seat
  ctx.fillRect(x - 4, y + 16, 2, 5)  // left leg
  ctx.fillRect(x + 2, y + 16, 2, 5)  // right leg
  ctx.fillRect(x - 5, y + 8, 10, 2)  // back

  // Desk surface
  ctx.fillStyle = '#3a3a2a'
  ctx.fillRect(x - 12, y - 2, 24, 3)
  // Desk legs
  ctx.fillStyle = '#2a2a1a'
  ctx.fillRect(x - 11, y + 1, 2, 8)
  ctx.fillRect(x + 9, y + 1, 2, 8)

  // Monitor
  ctx.fillStyle = '#1a1a2a'
  ctx.fillRect(x - 6, y - 12, 12, 9)
  ctx.fillStyle = color + '44'
  ctx.fillRect(x - 5, y - 11, 10, 7)
  // Screen glow
  ctx.fillStyle = color
  ctx.font = '3px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('▓▒░', x, y - 7)
  // Monitor stand
  ctx.fillStyle = '#1a1a2a'
  ctx.fillRect(x - 1, y - 3, 2, 3)
  ctx.fillRect(x - 3, y, 6, 1)

  // Keyboard
  ctx.fillStyle = '#2a2a3a'
  ctx.fillRect(x - 5, y + 1, 10, 2)
  // Coffee cup
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(x + 7, y - 1, 3, 4)
  ctx.fillStyle = '#4a2a0a'
  ctx.fillRect(x + 8, y, 1, 1)
}

// ── Speech bubble ─────────────────────────────────────────────
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
  const [meeting, setMeeting] = useState<{ active: boolean; attendees: string[] }>({ active: false, attendees: [] })

  // Init desks and agent positions
  useEffect(() => {
    ROOMS.forEach((room, ri) => {
      const col = ri % COLS, row = Math.floor(ri / COLS)
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
            isWalking: false, walkTimer: 2 + Math.random() * 8,
            chatTimer: 3 + Math.random() * 7, chatMsg: '', showChat: false, chatLife: 0,
            isTalking: false, talkPhase: 0,
            isSitting: true, sitTimer: 5 + Math.random() * 10,
            briefingTimer: 60 + Math.random() * 120, isBriefing: false,
            meetingTimer: 0, inMeeting: false,
            taskLabel: tasks[Math.floor(Math.random() * tasks.length)],
            taskTimer: 15 + Math.random() * 30,
            facing: 1,
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
      const col = ri % COLS, row = Math.floor(ri / COLS)
      const rx = col * RW, ry = row * RH

      // Room bg
      ctx.fillStyle = room.bg
      ctx.fillRect(rx, ry, RW, RH)

      // Floor tiles
      ctx.strokeStyle = room.border + '18'
      ctx.lineWidth = 0.5
      for (let tx2 = rx; tx2 < rx + RW; tx2 += 20) {
        ctx.beginPath(); ctx.moveTo(tx2, ry); ctx.lineTo(tx2, ry + RH); ctx.stroke()
      }
      for (let ty2 = ry; ty2 < ry + RH; ty2 += 20) {
        ctx.beginPath(); ctx.moveTo(rx, ty2); ctx.lineTo(rx + RW, ty2); ctx.stroke()
      }

      // Room border
      ctx.strokeStyle = room.border
      ctx.lineWidth = 1.5
      ctx.strokeRect(rx + 1, ry + 1, RW - 2, RH - 2)

      // Room header bar
      ctx.fillStyle = room.border + '22'
      ctx.fillRect(rx, ry, RW, 18)
      ctx.fillStyle = room.border
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(room.label, rx + 6, ry + 11)
      ctx.fillStyle = room.border + 'AA'
      ctx.font = '4px monospace'
      ctx.fillText(room.sub, rx + 6, ry + 17)

      // Pulse dot
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(timeRef.current / 800 + ri))
      ctx.fillStyle = room.border
      ctx.globalAlpha = pulse
      ctx.beginPath(); ctx.arc(rx + RW - 10, ry + 9, 3, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1

      // Draw desks first (behind agents)
      room.agents.forEach(name => {
        const d = desksRef.current.get(name)
        if (d) drawDesk(ctx, d.x, d.y, room.border)
      })

      // Update + draw agents
      room.agents.forEach(name => {
        const a = animsRef.current.get(name)
        if (!a) return

        // Task rotation
        a.taskTimer -= dt
        if (a.taskTimer <= 0) {
          const tasks = TASKS[name] ?? ['Working...']
          a.taskLabel = tasks[Math.floor(Math.random() * tasks.length)]
          a.taskTimer = 15 + Math.random() * 30
        }

        // Sit/stand cycle
        a.sitTimer -= dt
        if (a.sitTimer <= 0) {
          a.isSitting = !a.isSitting
          a.sitTimer = a.isSitting ? 8 + Math.random() * 15 : 3 + Math.random() * 6
          if (!a.isSitting) {
            // Stand up and walk somewhere
            const others = room.agents.filter(n => n !== name)
            if (others.length > 0 && Math.random() < 0.6) {
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

        // Briefing: walk to CEO every 5 min (simulated as ~300s)
        a.briefingTimer -= dt
        if (a.briefingTimer <= 0 && name !== 'EUGINE' && name !== 'SOVEREIGN') {
          const ceo = animsRef.current.get('EUGINE') ?? animsRef.current.get('SOVEREIGN')
          if (ceo) {
            a.tx = ceo.x + (Math.random() - 0.5) * 20
            a.ty = ceo.y + 5
            a.isWalking = true
            a.isBriefing = true
            a.isSitting = false
          }
          a.briefingTimer = 180 + Math.random() * 120
        }
        if (a.isBriefing) {
          const dist = Math.hypot(a.x - a.tx, a.y - a.ty)
          if (dist < 5) {
            a.isBriefing = false
            a.chatMsg = `Briefing: ${a.taskLabel}`
            a.showChat = true; a.chatLife = 3
            a.isTalking = true
          }
        }

        // Walk movement
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
        } else {
          a.phase += dt * 1.2
        }

        // Chat bubble
        a.chatTimer -= dt
        if (a.chatTimer <= 0) {
          const lines = LINES[name] ?? ['Working...']
          a.chatMsg = lines[Math.floor(Math.random() * lines.length)]
          a.showChat = true; a.chatLife = 2.5 + Math.random()
          a.isTalking = true
          a.chatTimer = 5 + Math.random() * 8
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
        drawHuman(ctx, dx2, dy2, outfit as [string,string,string], name, a.facing, a.walkPhase, a.isTalking, a.talkPhase, a.isSitting, name === 'EUGINE')

        if (a.showChat) drawBubble(ctx, dx2, dy2 - 5, a.chatMsg, room.border)

        // Task label under name
        if (!a.isWalking && a.isSitting) {
          ctx.fillStyle = room.border + '88'
          ctx.font = '3px monospace'
          ctx.textAlign = 'center'
          const tl = a.taskLabel.length > 14 ? a.taskLabel.slice(0, 14) + '…' : a.taskLabel
          ctx.fillText(tl, dx2, dy2 + 35)
        }
      })
    })

    // Room dividers
    ctx.strokeStyle = '#1E1E3A'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(RW, 0); ctx.lineTo(RW, CH)
    ctx.moveTo(RW * 2, 0); ctx.lineTo(RW * 2, CH)
    ctx.moveTo(0, RH); ctx.lineTo(CW, RH)
    ctx.stroke()

    animRef.current = requestAnimationFrame(render)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas || !onAgentClick) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CW / rect.width)
    const my = (e.clientY - rect.top) * (CH / rect.height)
    for (const [name, pos] of Array.from(posRef.current.entries())) {
      if (mx >= pos.x - 10 && mx <= pos.x + 10 && my >= pos.y - 5 && my <= pos.y + 32) {
        onAgentClick(name); return
      }
    }
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

  // Meeting trigger: call all agents to SOVEREIGN
  const callMeeting = useCallback(() => {
    const attendees: string[] = []
    ROOMS.forEach(room => {
      room.agents.forEach(name => {
        const a = animsRef.current.get(name)
        const sov = animsRef.current.get('SOVEREIGN')
        if (a && sov && name !== 'SOVEREIGN') {
          a.tx = sov.x + (Math.random() - 0.5) * 40
          a.ty = sov.y + (Math.random() - 0.5) * 20
          a.isWalking = true; a.isSitting = false
          attendees.push(name)
        }
      })
    })
    setMeeting({ active: true, attendees })
    setTimeout(() => setMeeting({ active: false, attendees: [] }), 15000)
  }, [])

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between px-2 py-1 mb-1" style={{ background: '#0D0D1A' }}>
        <span style={{ color: '#FFD700', fontSize: 8, fontFamily: 'monospace' }}>
          🏢 PROPOST VIRTUAL HQ — {ROOMS.reduce((s, r) => s + r.agents.length, 0)} AGENTS ACTIVE
        </span>
        <button
          onClick={callMeeting}
          className="px-2 py-1 rounded text-xs"
          style={{ background: '#1E1E3A', border: '1px solid #FFD700', color: '#FFD700', fontSize: 8, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          📢 CALL MEETING
        </button>
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
          fontFamily: 'monospace', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
        }}>
          <div style={{ color: '#FFD700' }}>{tooltip.name}</div>
          <div style={{ color: '#64748B' }}>{tooltip.task}</div>
        </div>
      )}
      {meeting.active && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded" style={{
          background: '#1E1E3A', border: '1px solid #FFD700', color: '#FFD700',
          fontSize: 9, fontFamily: 'monospace', zIndex: 10,
        }}>
          📢 ALL HANDS MEETING — Agents converging to SOVEREIGN
        </div>
      )}
    </div>
  )
}
