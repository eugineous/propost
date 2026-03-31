// APPROVAL_GATE — Tier 4, system
// Routes actions based on risk score; manages approval queue lifecycle

import { BaseAgent, type TaskResult } from '../base'
import { logInfo, logWarn } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { propostEvents } from '../../events'
import type { Task } from '../../types'

const RISK_THRESHOLD = 60
const RELEASE_TIMEOUT_MS = 10_000 // 10 seconds

export class ApprovalGate extends BaseAgent {
  readonly name = 'APPROVAL_GATE'
  readonly tier = 4 as const
  readonly company = 'system' as const

  async routeAction(
    task: Task,
    riskScore: number,
    content: string
  ): Promise<'auto' | 'approval_queue'> {
    if (riskScore > RISK_THRESHOLD) {
      logWarn(`[APPROVAL_GATE] Risk score ${riskScore} > ${RISK_THRESHOLD} — routing to approval queue`, {
        taskId: task.id,
      })

      await withRetry(async () => {
        const db = getDb()
        await db`
          INSERT INTO approval_queue (
            task_id, action_type, platform, agent_name,
            content, content_preview, risk_level, risk_score, status
          ) VALUES (
            ${task.id},
            ${task.type},
            ${task.platform ?? null},
            ${task.assignedAgent ?? 'SYSTEM'},
            ${content},
            ${content.slice(0, 100)},
            ${riskScore >= 90 ? 'critical' : riskScore >= 70 ? 'high' : 'medium'},
            ${riskScore},
            'pending'
          )
        `
      })

      await taskOrchestrator.updateStatus(task.id, 'pending_approval')
      return 'approval_queue'
    }

    return 'auto'
  }

  async releaseApproval(approvalId: string, editedContent?: string): Promise<void> {
    logInfo(`[APPROVAL_GATE] Releasing approval ${approvalId}`)

    // Update approval queue status
    await withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE approval_queue
        SET status = ${editedContent ? 'edited' : 'approved'},
            edited_content = ${editedContent ?? null},
            resolved_at = NOW()
        WHERE id = ${approvalId}
      `
    })

    // Get associated task and activate it
    const db = getDb()
    const rows = await db`
      SELECT task_id FROM approval_queue WHERE id = ${approvalId}
    `
    const taskId = (rows as Array<{ task_id: string | null }>)[0]?.task_id

    if (taskId) {
      // Release within 10 seconds
      setTimeout(async () => {
        await taskOrchestrator.updateStatus(taskId, 'active')
        propostEvents.emit('activity', {
          type: 'approval',
          agentName: this.name,
          company: this.company,
          contentPreview: `Approval ${approvalId} released`,
          timestamp: new Date().toISOString(),
        })
      }, Math.min(RELEASE_TIMEOUT_MS, 100))
    }
  }

  async rejectApproval(approvalId: string, reason: string): Promise<void> {
    logInfo(`[APPROVAL_GATE] Rejecting approval ${approvalId}`, { reason })

    await withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE approval_queue
        SET status = 'rejected',
            founder_note = ${reason},
            resolved_at = NOW()
        WHERE id = ${approvalId}
      `
    })

    // Get associated task and cancel it
    const db = getDb()
    const rows = await db`
      SELECT task_id FROM approval_queue WHERE id = ${approvalId}
    `
    const taskId = (rows as Array<{ task_id: string | null }>)[0]?.task_id

    if (taskId) {
      await taskOrchestrator.updateStatus(taskId, 'cancelled', undefined, reason)
      propostEvents.emit('activity', {
        type: 'approval',
        agentName: this.name,
        company: this.company,
        contentPreview: `Approval ${approvalId} rejected: ${reason}`,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const riskScore = (taskData?.riskScore as number) ?? 50
      const content = (taskData?.content as string) ?? ''
      const approvalId = taskData?.approvalId as string | undefined
      const action = taskData?.action as string | undefined

      if (action === 'release' && approvalId) {
        await this.releaseApproval(approvalId, taskData?.editedContent as string | undefined)
        await this.setStatus('idle')
        return { success: true, data: { released: true, approvalId } }
      }

      if (action === 'reject' && approvalId) {
        await this.rejectApproval(approvalId, (taskData?.reason as string) ?? 'Rejected by Founder')
        await this.setStatus('idle')
        return { success: true, data: { rejected: true, approvalId } }
      }

      const route = await this.routeAction(task, riskScore, content)
      await this.setStatus('idle')
      return { success: true, data: { route, riskScore } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const approvalGate = new ApprovalGate()
