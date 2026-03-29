// ============================================================
// ProPost Empire — Activity Feed (polling)
// ============================================================
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { desc, gte } from 'drizzle-orm'

export async function GET() {
  try {
    const now = new Date()
    const since = new Date(now.getTime() - 5 * 60 * 1000)
    const actions = await db
      .select()
      .from(agentActions)
      .where(gte(agentActions.createdAt, since))
      .orderBy(desc(agentActions.createdAt))
      .limit(50)

    return NextResponse.json({
      ok: true,
      actions: actions.map((a) => ({
        id: a.id,
        agentName: a.agentName,
        company: a.company,
        actionType: a.actionType,
        outcome: a.outcome,
        createdAt: a.createdAt,
        details: a.details,
      })),
    })
  } catch (err) {
    console.error('[feed]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
