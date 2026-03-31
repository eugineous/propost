// COMMUNITY — PagePower Tier 3 community agent
// Classifies Facebook comments and generates replies via Approval Queue

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

type CommentSentiment = 'positive' | 'neutral' | 'negative' | 'spam'

export class COMMUNITY extends BaseAgent {
  readonly name = 'COMMUNITY'
  readonly tier = 3 as const
  readonly company = 'pagepower' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const commentContent = taskData?.content as string | undefined
      const commentId = taskData?.commentId as string | undefined

      if (!commentContent) {
        return { success: false, error: 'COMMUNITY requires comment content in task data' }
      }

      // 1. Classify comment sentiment
      const classifyResponse = await aiRouter.route(
        'analyze',
        `Classify this Facebook comment sentiment into exactly one category: positive, neutral, negative, or spam.
        Comment: "${commentContent}"
        Respond with only the category name.`,
        { role: 'COMMUNITY', platform: 'facebook' }
      )

      const sentiment = this.parseSentiment(classifyResponse.content)
      logInfo(`[COMMUNITY] Comment classified as: ${sentiment}`, { taskId: task.id, commentId })

      // 2. If spam, discard
      if (sentiment === 'spam') {
        await this.setStatus('idle')
        return { success: true, data: { sentiment, action: 'discarded' } }
      }

      // 3. Generate reply
      const replyResponse = await aiRouter.route(
        'draft',
        `Write a Facebook comment reply for Eugine Micah to this ${sentiment} comment.
        Comment: "${commentContent}"
        Be authentic, community-oriented, and represent the brand well.
        Keep it concise (under 200 characters). No AI filler phrases.`,
        { role: 'COMMUNITY', platform: 'facebook', sentiment }
      )

      const reply = replyResponse.content.slice(0, 200)

      // 4. Submit to Approval Queue
      const approvalId = await this.submitToApprovalQueue(task, reply, sentiment, commentId)

      await this.setStatus('idle')
      return { success: true, data: { sentiment, queued: true, approvalId, reply } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private parseSentiment(text: string): CommentSentiment {
    const lower = text.toLowerCase().trim()
    if (lower.includes('positive')) return 'positive'
    if (lower.includes('negative')) return 'negative'
    if (lower.includes('spam')) return 'spam'
    return 'neutral'
  }

  private async submitToApprovalQueue(
    task: Task,
    content: string,
    sentiment: CommentSentiment,
    commentId?: string
  ): Promise<string> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score,
          failure_context, status
        ) VALUES (
          ${task.id}, 'reply', 'facebook', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'low', 15,
          ${JSON.stringify({ sentiment, commentId: commentId ?? null })}, 'pending'
        )
        RETURNING id
      `
    })
    return (rows as Array<{ id: string }>)[0]?.id ?? ''
  }
}

export const community = new COMMUNITY()
