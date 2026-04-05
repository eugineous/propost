// POST /api/agents/work
// The agent execution loop — called by Cloudflare Worker every 5 minutes.
// Picks up queued tasks and dispatches them to the correct agent.
// Also runs heartbeats for all agents.

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { getDb, withRetry } from '@/lib/db/client'
import { agentRegistry } from '@/lib/agents/index'
import { logInfo, logError } from '@/lib/logger'
import { propostEvents } from '@/lib/events'
import type { TaskRow } from '@/lib/db/schema'
import type { Task, TaskType, Company, Platform, ContentPillar, TaskStatus } from '@/lib/types'

const MAX_TASKS_PER_CYCLE = 3  // process up to 3 tasks per invocation (more time per task)
const CYCLE_BUDGET_MS = 50_000  // 50s total — Vercel Hobby caps at 60s
const TASK_TIMEOUT_MS = 25_000  // 25s per task — enough for AI gen + API call + retries

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    type: row.type as TaskType,
    company: row.company as Company,
    platform: row.platform as Platform | undefined,
    assignedAgent: row.assigned_agent ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    status: row.status as TaskStatus,
    priority: (row.priority ?? 2) as 1 | 2 | 3,
    contentPillar: row.content_pillar as ContentPillar | undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
  }
}

export async function POST(req: NextRequest) {
  // Accept calls from CF Worker (cron secret), internal services, or the dashboard (no auth = public POST)
  // This endpoint only processes already-queued tasks from the DB — safe to allow public triggering.
  const isCron = verifyCronSecret(req)
  const isInternal = req.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET
  void isCron; void isInternal // always allow for now — dashboard triggers this directly

  const results: Array<{ taskId: string; agent: string; success: boolean; error?: string }> = []
  const cycleStart = Date.now()

  try {
    const db = getDb()

    // 1. Run heartbeats for all agents (update last_heartbeat)
    const agentNames = Object.keys(agentRegistry)
    await withRetry(() =>
      db`
        UPDATE agents
        SET last_heartbeat = NOW()
        WHERE name = ANY(${agentNames})
      `
    ).catch(() => {}) // non-fatal

    // 2. Pick up queued tasks assigned to known agents
    const pendingRows = await db`
      SELECT * FROM tasks
      WHERE status = 'queued'
        AND assigned_agent = ANY(${agentNames})
      ORDER BY priority ASC, created_at ASC
      LIMIT ${MAX_TASKS_PER_CYCLE}
    `

    const tasks = (pendingRows as TaskRow[]).map(rowToTask)
    logInfo(`[work] Processing ${tasks.length} queued tasks`)

    for (const task of tasks) {
      const agentName = task.assignedAgent
      if (!agentName) continue

      const agent = agentRegistry[agentName]
      if (!agent) {
        logError(`[work] No agent found for: ${agentName}`)
        continue
      }

      // Stop processing if we're approaching the 60s Vercel limit
      if (Date.now() - cycleStart + TASK_TIMEOUT_MS > CYCLE_BUDGET_MS) {
        logInfo(`[work] Cycle budget reached — deferring remaining ${tasks.length - results.length} tasks`)
        break
      }

      try {
        // Mark task as active
        await withRetry(() =>
          db`UPDATE tasks SET status = 'active', started_at = NOW() WHERE id = ${task.id}`
        )

        logInfo(`[work] Executing task ${task.id} with agent ${agentName}`)

        // Execute the task — race against timeout so we never blow the 60s Vercel limit
        const result = await Promise.race([
          agent.execute(task),
          new Promise<{ success: false; data?: undefined; error: string }>((resolve) =>
            setTimeout(() => resolve({ success: false as const, data: undefined, error: `Task timeout (${TASK_TIMEOUT_MS / 1000}s)` }), TASK_TIMEOUT_MS)
          ),
        ])

        // Mark task complete or failed
        const finalStatus = result.success ? 'completed' : 'failed'
        const resultData = 'data' in result && result.data ? JSON.stringify(result.data) : null
        await withRetry(() =>
          db`
            UPDATE tasks
            SET status = ${finalStatus},
                completed_at = NOW(),
                result = ${resultData},
                error = ${result.error ?? null}
            WHERE id = ${task.id}
          `
        )

        // Emit activity event
        propostEvents.emit('activity', {
          id: task.id,
          type: result.success ? 'task_complete' : 'alert',
          agentName,
          company: task.company,
          platform: task.platform,
          contentPreview: result.success
            ? `${task.type} completed`
            : `${task.type} failed: ${result.error}`,
          timestamp: new Date().toISOString(),
        })

        results.push({ taskId: task.id, agent: agentName, success: result.success, error: result.error })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logError(`[work] Task ${task.id} threw exception`, err)

        await withRetry(() =>
          db`UPDATE tasks SET status = 'failed', error = ${msg}, completed_at = NOW() WHERE id = ${task.id}`
        ).catch(() => {})

        results.push({ taskId: task.id, agent: agentName, success: false, error: msg })
      }
    }

    // 3. Also emit heartbeat events for dashboard SSE
    const agentStatuses = await db`
      SELECT name, status, last_heartbeat FROM agents ORDER BY name
    `.catch(() => [])

    for (const a of agentStatuses as Array<{ name: string; status: string }>) {
      propostEvents.emit('agent:status', { agentName: a.name, status: a.status })
    }

    return NextResponse.json({
      ok: true,
      tasksProcessed: results.length,
      results,
      agentsActive: agentNames.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('[work] Work loop failed', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
