// ECHO — XForce Tier 3 reply specialist
// Drafts and posts replies on X, with QC pipeline and approval queue routing

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

export class ECHO extends BaseAgent {
  readonly name = 'ECHO'
  readonly tier = 3 as const
  readonly company = 'xforce' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const targetId = taskData?.targetId as string | undefined
      const originalContent = taskData?.originalContent as string | undefined

      if (!targetId) {
        return { success: false, error: 'ECHO requires targetId in task result data' }
      }

      // 1. Draft reply using AI Router
      const draftResponse = await aiRouter.route(
        'draft',
        `Write a reply to this X post: "${originalContent ?? 'unknown post'}". Be authentic, culturally grounded, and authority-driven. Use em dashes where appropriate. No AI filler phrases.`,
        { platform: 'x', role: 'ECHO', taskId: task.id }
      )
      const replyContent = draftResponse.content.slice(0, 280)

      // 2. Check follower count to determine routing
      const followerCount = await this.getFollowerCount()

      if (followerCount >= 10000) {
        // High-follower account: post directly after HAWK check
        const rateStatus = await hawk.checkRateLimit('x')
        if (!rateStatus.allowed) {
          await this.setStatus('idle')
          return { success: false, error: 'HAWK rate limit reached' }
        }

        const delay = await hawk.getDelay('x')
        await new Promise((r) => setTimeout(r, delay))

        const xAdapter = getPlatformAdapter('x')
        const result = await xAdapter.reply(targetId, replyContent)

        await logAction({
          taskId: task.id,
          agentName: this.name,
          company: this.company,
          platform: 'x',
          actionType: 'reply',
          content: replyContent,
          status: 'success',
          platformPostId: result.postId,
          platformResponse: result.rawResponse,
        })

        await hawk.recordAction('x')
        await this.setStatus('idle')
        return { success: true, platformPostId: result.postId }
      } else {
        // Low-follower account: submit to approval queue
        await this.submitToApprovalQueue(task, replyContent, targetId)
        await this.setStatus('idle')
        return { success: true, data: { queued: true, content: replyContent } }
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async getFollowerCount(): Promise<number> {
    // Query analytics snapshots for follower count
    try {
      const db = getDb()
      const rows = await db`
        SELECT value FROM analytics_snapshots
        WHERE platform = 'x' AND metric_type = 'followers'
        ORDER BY snapshot_date DESC
        LIMIT 1
      `
      return Number((rows as Array<{ value: bigint }>)[0]?.value ?? 0)
    } catch {
      return 0
    }
  }

  private async submitToApprovalQueue(task: Task, content: string, targetId: string): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score, status
        ) VALUES (
          ${task.id}, 'reply', 'x', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'low', 20, 'pending'
        )
      `
    })
    logInfo(`[ECHO] Reply submitted to approval queue`, { taskId: task.id, targetId })
  }
}

export const echo = new ECHO()
