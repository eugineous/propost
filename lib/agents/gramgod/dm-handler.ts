// CHAT — GramGod Tier 3 DM handler
// Classifies Instagram DMs and generates replies for non-spam

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

type DMCategory = 'brand_inquiry' | 'fan' | 'spam'

export class CHAT extends BaseAgent {
  readonly name = 'CHAT'
  readonly tier = 3 as const
  readonly company = 'gramgod' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const dmContent = taskData?.content as string | undefined
      const senderId = taskData?.senderId as string | undefined

      if (!dmContent) {
        return { success: false, error: 'CHAT requires DM content in task data' }
      }

      // 1. Classify DM using AI Router
      const classifyResponse = await aiRouter.route(
        'analyze',
        `Classify this Instagram DM into exactly one category: brand_inquiry, fan, or spam.
        DM: "${dmContent}"
        Respond with only the category name.`,
        { role: 'CHAT', platform: 'instagram' }
      )

      const category = this.parseCategory(classifyResponse.content)
      logInfo(`[CHAT] DM classified as: ${category}`, { taskId: task.id, senderId })

      // 2. If spam, discard
      if (category === 'spam') {
        await this.setStatus('idle')
        return { success: true, data: { category, action: 'discarded' } }
      }

      // 3. Generate reply for non-spam
      const dmTier = category === 'brand_inquiry' ? 'Tier 1 (brand/collab)' : 'Tier 2-3 (fan/community)'
      const replyResponse = await aiRouter.route(
        'draft',
        `Write a reply to this Instagram DM. DM category: ${dmTier}.
        DM content: "${dmContent}"
        
        VOICE RULES:
        - If brand inquiry: Professional + warm. Ask for brief. Route to euginemicah@gmail.com.
        - If fan: Personal, warm, brief. Make them feel seen. Use Sheng if they wrote in Sheng.
        - NEVER use: "I hope this helps", "excited to share", "as an AI"
        - Use em dashes (—) not hyphens. Contractions are fine.
        - Under 200 characters. Sound like Eugine Micah, not a bot.
        
        If message is over 48h old, open with: "Just caught up on DMs — sorry for the delay."`,
        { role: 'CHAT', platform: 'instagram', dmCategory: category }
      )

      const reply = replyResponse.content.slice(0, 200)

      // 4. Submit to Approval Queue
      const approvalId = await this.submitToApprovalQueue(task, reply, category, senderId)

      await this.setStatus('idle')
      return { success: true, data: { category, queued: true, approvalId, reply } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private parseCategory(text: string): DMCategory {
    const lower = text.toLowerCase().trim()
    if (lower.includes('brand_inquiry') || lower.includes('brand inquiry')) return 'brand_inquiry'
    if (lower.includes('spam')) return 'spam'
    return 'fan'
  }

  private async submitToApprovalQueue(
    task: Task,
    content: string,
    category: DMCategory,
    senderId?: string
  ): Promise<string> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score,
          failure_context, status
        ) VALUES (
          ${task.id}, 'dm', 'instagram', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'low', 10,
          ${JSON.stringify({ category, senderId: senderId ?? null })}, 'pending'
        )
        RETURNING id
      `
    })
    return (rows as Array<{ id: string }>)[0]?.id ?? ''
  }
}

export const chat = new CHAT()
