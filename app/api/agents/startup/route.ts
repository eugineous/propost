// POST /api/agents/startup
// Seeds the DB with all agent records and runs migrations.
// Called by instrumentation.ts on cold start.
// Also callable manually to re-initialize.

import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'
import { runAllSeeds } from '@/lib/db/seed'
import { logInfo } from '@/lib/logger'

export async function POST(req: NextRequest) {
  // Allow internal calls only
  const internalSecret = req.headers.get('x-internal-secret')
  if (internalSecret && internalSecret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    logInfo('[startup] Running migrations...')
    await runMigrations()

    logInfo('[startup] Seeding agents, companies, pillars...')
    await runAllSeeds()

    // Mark all agents as idle (fresh start)
    const db = getDb()
    await withRetry(() =>
      db`UPDATE agents SET status = 'idle', last_heartbeat = NOW()`
    )

    const agentCount = await db`SELECT COUNT(*) as count FROM agents`
    const count = (agentCount as Array<{ count: string }>)[0]?.count ?? '0'

    logInfo(`[startup] System initialized — ${count} agents ready`)
    return NextResponse.json({ ok: true, agents: parseInt(count), message: 'System initialized' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[startup] Initialization failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getDb()
    const agents = await db`SELECT name, status, last_heartbeat FROM agents ORDER BY tier, name`
    return NextResponse.json({ agents, count: (agents as unknown[]).length })
  } catch (err) {
    return NextResponse.json({ agents: [], count: 0, error: String(err) })
  }
}
