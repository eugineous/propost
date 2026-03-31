// Abstract BaseAgent — all ProPost agents extend this class
// Provides: status management, heartbeat, error handling, message handling

import type { AgentStatus, Company, Task, FounderMessage, AgentResponse } from '../types'
import { getDb, withRetry } from '../db/client'
import { logError, logInfo } from '../logger'
import { propostEvents } from '../events'

export interface TaskResult {
  success: boolean
  data?: unknown
  error?: string
  platformPostId?: string
}

export abstract class BaseAgent {
  abstract readonly name: string
  abstract readonly tier: 1 | 2 | 3 | 4 | 5
  abstract readonly company: Company

  status: AgentStatus = 'idle'

  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null

  /** Execute a task — implemented by each concrete agent */
  abstract execute(task: Task): Promise<TaskResult>

  /** Handle a direct message from the Founder */
  async receiveMessage(message: FounderMessage): Promise<AgentResponse> {
    logInfo(`[${this.name}] Received founder message`, { content: message.content })
    return {
      content: `${this.name} received your message and is processing it.`,
      agentName: this.name,
    }
  }

  /**
   * Upsert this agent into the `agents` table and update last_heartbeat.
   * Call once to start the 60s interval; the interval is stored internally.
   */
  async heartbeat(): Promise<void> {
    await this._writeHeartbeat()

    if (!this._heartbeatTimer) {
      this._heartbeatTimer = setInterval(() => {
        this._writeHeartbeat().catch((err) => {
          logError(`[${this.name}] Heartbeat write failed`, err)
        })
      }, 60_000)
    }
  }

  /** Stop the heartbeat interval (call on agent shutdown) */
  stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer)
      this._heartbeatTimer = null
    }
  }

  /** Update agent status in DB and emit SSE event */
  protected async setStatus(status: AgentStatus): Promise<void> {
    this.status = status
    propostEvents.emit('agent:status', { agentName: this.name, status })

    await withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE agents
        SET status = ${status}
        WHERE name = ${this.name}
      `
    }).catch((err) => {
      logError(`[${this.name}] Failed to persist status update`, err)
    })
  }

  /**
   * Centralised error handler:
   * 1. Logs the error via Logger
   * 2. Sets agent status to 'error'
   * 3. Emits 'alert' event so SOVEREIGN can listen
   */
  protected handleError(err: unknown, taskId?: string): void {
    const message = err instanceof Error ? err.message : String(err)
    logError(`[${this.name}] Unhandled error`, err, { taskId })

    this.status = 'error'
    propostEvents.emit('agent:status', { agentName: this.name, status: 'error' })
    propostEvents.emit('alert', {
      agentName: this.name,
      company: this.company,
      error: message,
      taskId,
      timestamp: new Date().toISOString(),
    })

    // Persist error status to DB (best-effort)
    withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE agents
        SET status = 'error'
        WHERE name = ${this.name}
      `
    }).catch((dbErr) => {
      logError(`[${this.name}] Failed to persist error status`, dbErr)
    })
  }

  /** Write heartbeat to agents table (upsert) */
  private async _writeHeartbeat(): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO agents (name, tier, company, status, last_heartbeat)
        VALUES (${this.name}, ${this.tier}, ${this.company}, ${this.status}, NOW())
        ON CONFLICT (name) DO UPDATE
          SET last_heartbeat = NOW(),
              status = EXCLUDED.status
      `
    })
  }
}
