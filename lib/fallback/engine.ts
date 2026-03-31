// FallbackEngine — handles platform, AI, and DB failures
// Logs every failure to fallback_log; routes to Playwright or Approval Queue

import type { Task } from '../types'
import { getDb, withRetry } from '../db/client'
import { propostEvents } from '../events'

// Lazy import of playwright wrapper to avoid hard dependency
type PlaywrightModule = {
  executeWithPlaywright: (task: {
    platform: string
    action: 'post' | 'reply'
    content: string
    targetUrl?: string
  }) => Promise<{ success: boolean; postId?: string }>
}

async function getPlaywright(): Promise<PlaywrightModule | null> {
  try {
    // Dynamic require to avoid static analysis on optional module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./playwright') as PlaywrightModule
  } catch {
    return null
  }
}

export type FallbackResult =
  | { outcome: 'success'; method: 'playwright' | 'alternate_ai'; result: unknown }
  | { outcome: 'queued'; approvalId: string }
  | { outcome: 'critical'; logged: true }

interface FallbackLogEntry {
  taskId?: string
  agentName: string
  platform?: string
  errorType: string
  errorMessage: string
  fallbackSteps: Array<{ step: string; outcome: string; detail?: string }>
  finalOutcome: string
}

async function writeFallbackLog(entry: FallbackLogEntry): Promise<void> {
  const db = getDb()
  await withRetry(async () => {
    await db`
      INSERT INTO fallback_log (
        task_id,
        agent_name,
        platform,
        error_type,
        error_message,
        fallback_steps,
        final_outcome
      ) VALUES (
        ${entry.taskId ?? null},
        ${entry.agentName},
        ${entry.platform ?? null},
        ${entry.errorType},
        ${entry.errorMessage},
        ${JSON.stringify(entry.fallbackSteps)},
        ${entry.finalOutcome}
      )
    `
  })
}

async function insertApprovalQueue(
  task: Task,
  content: string,
  failureContext: unknown
): Promise<string> {
  const db = getDb()
  const rows = await withRetry(async () =>
    db`
      INSERT INTO approval_queue (
        task_id,
        action_type,
        platform,
        agent_name,
        content,
        content_preview,
        risk_level,
        failure_context,
        status
      ) VALUES (
        ${task.id},
        ${task.type},
        ${task.platform ?? null},
        ${task.assignedAgent ?? 'system'},
        ${content},
        ${content.slice(0, 200)},
        'high',
        ${JSON.stringify(failureContext)},
        'pending'
      )
      RETURNING id
    `
  )
  return (rows as Array<{ id: string }>)[0].id
}

export class FallbackEngine {
  async handlePlatformFailure(task: Task, error: Error): Promise<FallbackResult> {
    const steps: FallbackLogEntry['fallbackSteps'] = []

    // Step 1: log the original failure
    steps.push({
      step: 'platform_api',
      outcome: 'failed',
      detail: error.message,
    })

    // Step 2: attempt Playwright automation
    let playwrightResult: { success: boolean; postId?: string } | null = null
    try {
      const pw = await getPlaywright()
      if (pw) {
        playwrightResult = await pw.executeWithPlaywright({
          platform: task.platform ?? 'x',
          action: task.type === 'reply' ? 'reply' : 'post',
          content: typeof task.result === 'string' ? task.result : '',
        })
      }
    } catch (pwErr) {
      steps.push({
        step: 'playwright',
        outcome: 'failed',
        detail: String(pwErr),
      })
    }

    if (playwrightResult?.success) {
      steps.push({ step: 'playwright', outcome: 'success' })
      await writeFallbackLog({
        taskId: task.id,
        agentName: task.assignedAgent ?? 'system',
        platform: task.platform,
        errorType: error.name,
        errorMessage: error.message,
        fallbackSteps: steps,
        finalOutcome: 'success',
      })
      return { outcome: 'success', method: 'playwright', result: playwrightResult }
    }

    // Step 3: place in approval queue
    const failureContext = {
      originalError: { name: error.name, message: error.message },
      playwrightAttempted: true,
      playwrightResult,
    }
    const approvalId = await insertApprovalQueue(
      task,
      typeof task.result === 'string' ? task.result : JSON.stringify(task.result ?? ''),
      failureContext
    )

    steps.push({ step: 'approval_queue', outcome: 'queued', detail: approvalId })

    await writeFallbackLog({
      taskId: task.id,
      agentName: task.assignedAgent ?? 'system',
      platform: task.platform,
      errorType: error.name,
      errorMessage: error.message,
      fallbackSteps: steps,
      finalOutcome: 'queued',
    })

    return { outcome: 'queued', approvalId }
  }

  async handleAIFailure(task: Task, error: Error): Promise<FallbackResult> {
    const steps: FallbackLogEntry['fallbackSteps'] = [
      { step: 'primary_ai', outcome: 'failed', detail: error.message },
      { step: 'alternate_ai', outcome: 'failed', detail: 'Both providers exhausted' },
    ]

    // Both AI providers already tried by AI Router — go straight to approval queue
    const originalPrompt =
      typeof task.result === 'string'
        ? task.result
        : `Task: ${task.type} for ${task.platform ?? 'unknown'} — ${task.contentPillar ?? ''}`

    const approvalId = await insertApprovalQueue(task, originalPrompt, {
      originalError: { name: error.name, message: error.message },
      bothProvidersExhausted: true,
    })

    steps.push({ step: 'approval_queue', outcome: 'queued', detail: approvalId })

    await writeFallbackLog({
      taskId: task.id,
      agentName: task.assignedAgent ?? 'system',
      platform: task.platform,
      errorType: error.name,
      errorMessage: error.message,
      fallbackSteps: steps,
      finalOutcome: 'queued',
    })

    return { outcome: 'queued', approvalId }
  }

  async handleDBFailure(write: () => Promise<void>, error: Error): Promise<FallbackResult> {
    const steps: FallbackLogEntry['fallbackSteps'] = [
      { step: 'db_write_initial', outcome: 'failed', detail: error.message },
    ]

    try {
      // withRetry handles 3 retries with exponential backoff
      await withRetry(write)
      steps.push({ step: 'db_write_retry', outcome: 'success' })

      // Best-effort log (may fail if DB is still down)
      try {
        await writeFallbackLog({
          taskId: undefined,
          agentName: 'system',
          errorType: error.name,
          errorMessage: error.message,
          fallbackSteps: steps,
          finalOutcome: 'success',
        })
      } catch {
        // ignore — DB is still down
      }

      return { outcome: 'success', method: 'alternate_ai', result: null }
    } catch (retryErr) {
      steps.push({
        step: 'db_write_retry',
        outcome: 'failed',
        detail: String(retryErr),
      })

      // Emit critical event
      propostEvents.emit('db:critical', {
        error: error.message,
        retryError: String(retryErr),
        steps,
      })

      return { outcome: 'critical', logged: true }
    }
  }
}

// Singleton export
export const fallbackEngine = new FallbackEngine()
