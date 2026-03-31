// POST /api/cron/replies
// Runs ECHO (X replies) and CHAT (Instagram DMs) — called by CF Worker
// Fires 3x per day: 9AM, 1PM, 6PM EAT
// Each run handles up to 7 replies/DMs (3 runs × 7 = ~20/day)

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { echo } from '@/lib/agents/xforce/reply-specialist'
import { chat } from '@/lib/agents/gramgod/dm-handler'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { logInfo } from '@/lib/logger'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[replies] Starting reply cycle')
  const results: Record<string, unknown> = {}

  // Create tasks and execute ECHO (X replies)
  try {
    const xTask = await taskOrchestrator.createTask({
      type: 'reply',
      company: 'xforce',
      platform: 'x',
      contentPillar: 'trending_topics',
      priority: 2,
      assignedAgent: 'ECHO',
    })
    const xResult = await echo.execute(xTask)
    results.x = xResult.data ?? { success: xResult.success }
    logInfo(`[replies] ECHO done: ${JSON.stringify(results.x)}`)
  } catch (err) {
    results.x = { error: err instanceof Error ? err.message : String(err) }
  }

  // Create tasks and execute CHAT (Instagram DMs)
  try {
    const igTask = await taskOrchestrator.createTask({
      type: 'dm_response',
      company: 'gramgod',
      platform: 'instagram',
      priority: 2,
      assignedAgent: 'CHAT',
    })
    const igResult = await chat.execute(igTask)
    results.instagram = igResult.data ?? { success: igResult.success }
    logInfo(`[replies] CHAT done: ${JSON.stringify(results.instagram)}`)
  } catch (err) {
    results.instagram = { error: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json({ ok: true, results })
}
