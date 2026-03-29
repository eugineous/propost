export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions, posts, trends } from '@/lib/schema'
import { desc, gte, sql } from 'drizzle-orm'

function actionPreview(actionType: string, details: Record<string, unknown>): string {
  if (actionType === 'dm_backlog_reply') {
    const u = (details.senderUsername as string) ?? 'unknown'
    const sent = details.sent === false ? 'FAILED' : 'sent'
    const isBrand = details.isBrandDeal ? ' • brand' : ''
    const msg = (details.messagePreview as string) ?? ''
    return `@${u} • ${sent}${isBrand} • "${msg.slice(0, 60)}"`
  }
  if (actionType === 'dm_backlog_summary') {
    return String(details.summary ?? 'DM backlog summary').slice(0, 120)
  }
  if (actionType === 'post_published') {
    const url = (details.url as string) ?? ''
    const snippet = (details.content as string) ?? (details.caption as string) ?? ''
    return `${snippet.slice(0, 80)}${url ? ` • ${url}` : ''}`
  }
  if (actionType === 'command_dispatched') {
    const text = (details.text as string) ?? ''
    const corp = (details.targetCorp as string) ?? ''
    const agent = (details.targetAgent as string) ?? ''
    return `→ ${corp}/${agent}: "${text.slice(0, 80)}"`
  }
  return String(details.summary ?? details.message ?? details.response ?? actionType).slice(0, 120)
}

export async function GET() {
  try {
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    // Last 50 agent actions
    const actions = await db
      .select()
      .from(agentActions)
      .orderBy(desc(agentActions.createdAt))
      .limit(50)

    // Total actions today
    const todayActions = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentActions)
      .where(gte(agentActions.createdAt, startOfDay))

    const totalActionsToday = Number(todayActions[0]?.count ?? 0)

    // Group by agent — latest action per agent
    const agentMap: Record<string, {
      agentName: string
      company: string
      lastAction: string
      lastActionTime: string
      lastOutput: string
      status: 'active' | 'idle'
      actionCount: number
    }> = {}

    for (const row of actions) {
      const key = row.agentName
      if (!agentMap[key]) {
        const lastActionTime = row.createdAt ? new Date(row.createdAt).toISOString() : now.toISOString()
        const ageMs = now.getTime() - new Date(lastActionTime).getTime()
        const status: 'active' | 'idle' = ageMs < 5 * 60 * 1000 ? 'active' : 'idle'

        const details = (row.details ?? {}) as Record<string, unknown>
        const outputPreview =
          (details.summary as string) ??
          (details.message as string) ??
          (details.response as string) ??
          row.actionType

        agentMap[key] = {
          agentName: row.agentName,
          company: row.company,
          lastAction: row.actionType,
          lastActionTime,
          lastOutput: String(outputPreview).slice(0, 120),
          status,
          actionCount: 1,
        }
      } else {
        agentMap[key].actionCount++
      }
    }

    const agents = Object.values(agentMap)

    // Recent posts published today
    const recentPosts = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(gte(posts.createdAt, startOfDay))

    const postsToday = Number(recentPosts[0]?.count ?? 0)

    // Trends found today
    const recentTrends = await db
      .select({ count: sql<number>`count(*)` })
      .from(trends)
      .where(gte(trends.detectedAt, startOfDay))

    const trendsToday = Number(recentTrends[0]?.count ?? 0)

    // Process start time (approximate uptime from first action today)
    const firstAction = await db
      .select({ createdAt: agentActions.createdAt })
      .from(agentActions)
      .where(gte(agentActions.createdAt, startOfDay))
      .orderBy(agentActions.createdAt)
      .limit(1)

    const uptimeMs = firstAction[0]?.createdAt
      ? now.getTime() - new Date(firstAction[0].createdAt).getTime()
      : 0

    return NextResponse.json({
      ok: true,
      currentTime: now.toISOString(),
      uptimeMs,
      totalActionsToday,
      postsToday,
      trendsToday,
      agents,
      recentActions: actions.slice(0, 20).map((a) => ({
        id: a.id,
        agentName: a.agentName,
        company: a.company,
        actionType: a.actionType,
        outcome: a.outcome,
        createdAt: a.createdAt,
        outputPreview: (() => {
          const d = (a.details ?? {}) as Record<string, unknown>
          return actionPreview(a.actionType, d).slice(0, 100)
        })(),
      })),
    })
  } catch (err) {
    console.error('[monitor/live] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
