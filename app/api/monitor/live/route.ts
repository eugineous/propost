export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { ALL_AGENT_NAMES } from '@/lib/agentState'
import { AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'
import { db } from '@/lib/db'
import { agentActions, posts, trends } from '@/lib/schema'
import { desc, gte, sql } from 'drizzle-orm'

export async function GET() {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0))

  const [recentActions, actionsCount, postsCount, trendsCount] = await Promise.all([
    // Get latest action per agent from DB
    db.select({
      agentName: agentActions.agentName,
      company: agentActions.company,
      actionType: agentActions.actionType,
      outcome: agentActions.outcome,
      createdAt: agentActions.createdAt,
      details: agentActions.details,
    })
      .from(agentActions)
      .orderBy(desc(agentActions.createdAt))
      .limit(500),
    db.select({ count: sql<number>`count(*)` }).from(agentActions)
      .where(gte(agentActions.createdAt, todayStart))
      .then((r: Array<{ count: number }>) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` }).from(posts)
      .where(gte(posts.createdAt, todayStart))
      .then((r: Array<{ count: number }>) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` }).from(trends)
      .where(gte(trends.detectedAt, todayStart))
      .then((r: Array<{ count: number }>) => Number(r[0]?.count ?? 0)),
  ])

  // Build per-agent state from most recent DB actions
  const agentMap: Record<string, {
    agentName: string; company: string; lastAction: string; lastActionTime: string
    lastOutput: string; status: string; actionCount: number
  }> = {}

  for (const row of recentActions) {
    if (!agentMap[row.agentName]) {
      const details = row.details as Record<string, unknown> | null
      agentMap[row.agentName] = {
        agentName: row.agentName,
        company: row.company ?? AGENT_CORP_LOOKUP[row.agentName] ?? 'intelcore',
        lastAction: row.actionType,
        lastActionTime: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        lastOutput: (details?.summary as string) ?? (details?.response as string)?.slice(0, 120) ?? `Executed ${row.actionType}`,
        status: row.outcome === 'error' ? 'error' : 'idle',
        actionCount: 1,
      }
    } else {
      agentMap[row.agentName].actionCount++
    }
  }

  // Fill in agents with no DB actions yet
  for (const name of ALL_AGENT_NAMES) {
    if (!agentMap[name]) {
      agentMap[name] = {
        agentName: name,
        company: AGENT_CORP_LOOKUP[name] ?? 'intelcore',
        lastAction: 'waiting',
        lastActionTime: new Date().toISOString(),
        lastOutput: 'Waiting for first task...',
        status: 'idle',
        actionCount: 0,
      }
    }
  }

  const agentList = Object.values(agentMap)
  const recentFeed = recentActions.slice(0, 50)

  return NextResponse.json({
    ok: true,
    agents: agentList,       // array — used by EmpireOffice
    agentList,               // same array — used by DashboardClient
    recentActions: recentFeed,
    totalActionsToday: actionsCount,
    postsToday: postsCount,
    trendsToday: trendsCount,
    uptimeMs: 0,
    currentTime: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  })
}
