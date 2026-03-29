export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Agent Status Route
// ============================================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { desc, gte, eq, and } from 'drizzle-orm'
import { getIdleBehavior } from '@/lib/agentIdle'

const ALL_AGENTS = [
  // IntelCore
  { name: 'sovereign', corp: 'intelcore', role: 'CEO' },
  { name: 'oracle', corp: 'intelcore', role: 'Intelligence' },
  { name: 'memory', corp: 'intelcore', role: 'Memory' },
  { name: 'sentry', corp: 'intelcore', role: 'Crisis' },
  { name: 'scribe', corp: 'intelcore', role: 'Briefings' },
  // XForce
  { name: 'zara', corp: 'xforce', role: 'Strategy' },
  { name: 'blaze', corp: 'xforce', role: 'Content' },
  { name: 'scout', corp: 'xforce', role: 'Trends' },
  { name: 'echo', corp: 'xforce', role: 'Engagement' },
  { name: 'hawk', corp: 'xforce', role: 'Compliance' },
  { name: 'lumen', corp: 'xforce', role: 'Analytics' },
  { name: 'pixel_x', corp: 'xforce', role: 'Visuals' },
  // LinkedElite
  { name: 'nova', corp: 'linkedelite', role: 'Strategy' },
  { name: 'orator', corp: 'linkedelite', role: 'Content' },
  { name: 'bridge', corp: 'linkedelite', role: 'Partnerships' },
  { name: 'atlas', corp: 'linkedelite', role: 'Analytics' },
  { name: 'deal_li', corp: 'linkedelite', role: 'Deals' },
  { name: 'graph', corp: 'linkedelite', role: 'Network' },
  // GramGod
  { name: 'aurora', corp: 'gramgod', role: 'Content' },
  { name: 'vibe', corp: 'gramgod', role: 'Culture' },
  { name: 'chat', corp: 'gramgod', role: 'DMs' },
  { name: 'deal_ig', corp: 'gramgod', role: 'Deals' },
  { name: 'lens', corp: 'gramgod', role: 'Visuals' },
  // PagePower
  { name: 'chief', corp: 'pagepower', role: 'CEO' },
  { name: 'pulse', corp: 'pagepower', role: 'Analytics' },
  { name: 'community', corp: 'pagepower', role: 'Community' },
  { name: 'reach', corp: 'pagepower', role: 'Ads' },
  // WebBoss
  { name: 'root', corp: 'webboss', role: 'CEO' },
  { name: 'crawl', corp: 'webboss', role: 'SEO' },
  { name: 'build', corp: 'webboss', role: 'Dev' },
  { name: 'shield', corp: 'webboss', role: 'Security' },
  { name: 'speed', corp: 'webboss', role: 'Performance' },
  // HRForce Corp
  { name: 'people', corp: 'hrforce', role: 'CEO' },
  { name: 'welfare', corp: 'hrforce', role: 'Welfare' },
  { name: 'rotate', corp: 'hrforce', role: 'Rotation' },
  { name: 'discipline', corp: 'hrforce', role: 'Discipline' },
  { name: 'reward', corp: 'hrforce', role: 'Rewards' },
  { name: 'brief', corp: 'hrforce', role: 'Briefings' },
  // LegalShield Corp
  { name: 'judge', corp: 'legalshield', role: 'CEO' },
  { name: 'policy', corp: 'legalshield', role: 'Policy' },
  { name: 'risk', corp: 'legalshield', role: 'Risk' },
  { name: 'shadow', corp: 'legalshield', role: 'Shadow' },
  // FinanceDesk Corp
  { name: 'banker', corp: 'financedesk', role: 'CEO' },
  { name: 'deal', corp: 'financedesk', role: 'Deals' },
  { name: 'rate', corp: 'financedesk', role: 'Rates' },
  { name: 'pitch', corp: 'financedesk', role: 'Pitches' },
]

type AgentStatus = 'working' | 'idle' | 'break' | 'meeting'

function deriveStatus(lastActionAt: Date | null, queueDepth: number): AgentStatus {
  if (!lastActionAt) return 'idle'
  const minutesAgo = (Date.now() - lastActionAt.getTime()) / 60000
  if (minutesAgo < 5) return 'working'
  if (minutesAgo < 30) {
    // Simulate break/meeting based on time of day
    const hour = new Date().getHours()
    if (hour === 9 || hour === 14) return 'meeting'
    if (queueDepth > 3) return 'working'
    return 'break'
  }
  return 'idle'
}

export async function GET() {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

    // Get last action for each agent in one query
    const recentActions = await db
      .select()
      .from(agentActions)
      .where(gte(agentActions.createdAt, thirtyMinAgo))
      .orderBy(desc(agentActions.createdAt))
      .limit(200)

    // Build a map of agent -> last action
    const lastActionMap = new Map<string, { at: Date; actionType: string; outcome: string | null }>()
    const queueMap = new Map<string, number>()

    for (const action of recentActions) {
      if (!lastActionMap.has(action.agentName)) {
        lastActionMap.set(action.agentName, {
          at: action.createdAt ?? new Date(0),
          actionType: action.actionType,
          outcome: action.outcome,
        })
      }
      queueMap.set(action.agentName, (queueMap.get(action.agentName) ?? 0) + 1)
    }

    const agents = ALL_AGENTS.map(agent => {
      const lastAction = lastActionMap.get(agent.name) ?? null
      const queueDepth = queueMap.get(agent.name) ?? 0
      const status = deriveStatus(lastAction?.at ?? null, queueDepth)
      const currentTask = status === 'idle'
        ? getIdleBehavior(agent.name)
        : status === 'working'
        ? `Running: ${lastAction?.actionType ?? 'task'}`
        : status === 'meeting'
        ? 'In corp meeting'
        : 'On break'

      return {
        name: agent.name,
        corp: agent.corp,
        role: agent.role,
        status,
        currentTask,
        lastActionAt: lastAction?.at?.toISOString() ?? null,
        lastOutcome: lastAction?.outcome ?? null,
        actionsLast30Min: queueDepth,
      }
    })

    const summary = {
      total: agents.length,
      working: agents.filter(a => a.status === 'working').length,
      idle: agents.filter(a => a.status === 'idle').length,
      onBreak: agents.filter(a => a.status === 'break').length,
      inMeeting: agents.filter(a => a.status === 'meeting').length,
    }

    return NextResponse.json({
      ok: true,
      agents,
      summary,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[agents/status]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
