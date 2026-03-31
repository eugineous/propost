// BRIDGE — LinkedElite Tier 3 networking agent
// Drafts connection messages and submits to Approval Queue before sending

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

export class BRIDGE extends BaseAgent {
  readonly name = 'BRIDGE'
  readonly tier = 3 as const
  readonly company = 'linkedelite' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const targetProfile = taskData?.targetProfile as string | undefined
      const targetName = taskData?.targetName as string | undefined

      // Draft connection message using AI Router
      const draftResponse = await aiRouter.route(
        'draft',
        `Write a professional LinkedIn connection request message to ${targetName ?? 'a professional'}${targetProfile ? ` (${targetProfile})` : ''}. 
        Be authentic, concise (under 300 characters), and mention Eugine Micah's background in media, AI, and youth empowerment. 
        No generic phrases. Make it personal and compelling.`,
        { role: 'BRIDGE', platform: 'linkedin', taskId: task.id }
      )

      const message = draftResponse.content.slice(0, 300)

      // Always submit to Approval Queue before sending
      const approvalId = await this.submitToApprovalQueue(task, message, targetProfile)

      logInfo(`[BRIDGE] Connection message submitted to approval queue`, {
        taskId: task.id,
        approvalId,
        targetProfile,
      })

      await this.setStatus('idle')
      return { success: true, data: { queued: true, approvalId, message } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async submitToApprovalQueue(
    task: Task,
    content: string,
    targetProfile?: string
  ): Promise<string> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score,
          failure_context, status
        ) VALUES (
          ${task.id}, 'dm', 'linkedin', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'medium', 40,
          ${JSON.stringify({ targetProfile: targetProfile ?? null })}, 'pending'
        )
        RETURNING id
      `
    })
    return (rows as Array<{ id: string }>)[0]?.id ?? ''
  }
}

export const bridge = new BRIDGE()
