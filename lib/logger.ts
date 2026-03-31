// Structured logger — writes to `actions` table and console
// Uses withRetry from lib/db/client.ts; never silently discards

import { getDb, withRetry } from './db/client'
import type { Company, Platform } from './types'

export interface LogActionInput {
  taskId?: string
  agentName: string
  company: Company
  platform: Platform
  actionType: string
  content?: string
  status: 'success' | 'failed' | 'pending'
  platformPostId?: string
  platformResponse?: unknown
}

/**
 * Persist an action record to the `actions` table.
 * Returns the generated action ID.
 */
export async function logAction(input: LogActionInput): Promise<string> {
  const rows = await withRetry(async () => {
    const db = getDb()
    return db`
      INSERT INTO actions (
        task_id,
        agent_name,
        company,
        platform,
        action_type,
        content,
        status,
        platform_post_id,
        platform_response
      ) VALUES (
        ${input.taskId ?? null},
        ${input.agentName},
        ${input.company},
        ${input.platform},
        ${input.actionType},
        ${input.content ?? null},
        ${input.status},
        ${input.platformPostId ?? null},
        ${input.platformResponse !== undefined ? JSON.stringify(input.platformResponse) : null}
      )
      RETURNING id
    `
  })

  const id = (rows as Array<{ id: string }>)[0]?.id
  if (!id) {
    throw new Error('[logger] INSERT into actions returned no ID')
  }
  return id
}

/** Structured console info log */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  console.log(
    JSON.stringify({ level: 'info', message, ...(context ?? {}), ts: new Date().toISOString() })
  )
}

/** Structured console error log */
export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): void {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
      ...(context ?? {}),
      ts: new Date().toISOString(),
    })
  )
}

/** Structured console warn log */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  console.warn(
    JSON.stringify({ level: 'warn', message, ...(context ?? {}), ts: new Date().toISOString() })
  )
}
