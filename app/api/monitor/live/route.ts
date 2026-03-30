export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAllAgentWorkflowStates } from '@/lib/workflowState'
import { ALL_AGENT_NAMES } from '@/lib/agentState'
import { db } from '@/lib/db'
import { agentActions, posts, trends } from '@/lib/schema'
import { gte, sql } from 'drizzle-orm'

export async function GET() {
  const [states, actionsCount, postsCount, trendsCount] = await Promise.all([
    getAllAgentWorkflowStates(ALL_AGENT_NAMES),
    db.select({ count: sql<number>`count(*)` }).from(agentActions)
      .where(gte(agentActions.createdAt, new Date(new Date().setHours(0, 0, 0, 0))))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` }).from(posts)
      .where(gte(posts.createdAt, new Date(new Date().setHours(0, 0, 0, 0))))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` }).from(trends)
      .where(gte(trends.detectedAt, new Date(new Date().setHours(0, 0, 0, 0))))
      .then((r) => Number(r[0]?.count ?? 0)),
  ])

  // Return both map (for Office3D) and array (for DashboardClient agent states)
  const agentArray = ALL_AGENT_NAMES.map((name) => ({
    agentName: name,
    status: states[name]?.status ?? 'idle',
    workflowStep: states[name]?.currentStep,
    progress: states[name]?.progress ?? 0,
  }))

  return NextResponse.json({
    ok: true,
    agents: states,          // map for Office3D
    agentList: agentArray,   // array for DashboardClient
    totalActionsToday: actionsCount,
    postsToday: postsCount,
    trendsToday: trendsCount,
    timestamp: new Date().toISOString(),
  })
}
