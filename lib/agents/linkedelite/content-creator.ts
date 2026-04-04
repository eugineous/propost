// ORATOR — LinkedElite Tier 3 content creator
// Generates professional LinkedIn posts aligned with active Content Pillar

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

export class ORATOR extends BaseAgent {
  readonly name = 'ORATOR'
  readonly tier = 3 as const
  readonly company = 'linkedelite' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('linkedin')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return { success: false, error: `HAWK rate limit reached for LinkedIn` }
      }

      // 2. Get content — use pre-loaded content if available, otherwise generate
      const taskData = task.result as Record<string, unknown> | undefined
      let content: string = (taskData?.content as string) ?? ''

      if (!content) {
        // Generate professional post via AI Router
        const pillar = task.contentPillar ?? await this.getActivePillar()
        const generated = await aiRouter.route(
          'generate',
          `Write a professional LinkedIn post for Eugine Micah about: ${pillar}. 
          Requirements: minimum 150 characters, professional long-form format, 
          authority-driven tone, culturally grounded, storytelling-forward. 
          Use em dashes for emphasis. No AI filler phrases like "delve", "game-changer", "dive into".`,
          { platform: 'linkedin', contentPillar: pillar, role: 'ORATOR' }
        )
        content = generated.content
      }

      // 3. Pass through Tone Validator before publishing
      const toneCheck = await aiRouter.route(
        'validate',
        `Validate this LinkedIn post for tone compliance. Check for: authority-driven voice, no AI filler phrases (delve, game-changer, dive into, in today's world), culturally grounded, storytelling-forward. Post: "${content}"`,
        { role: 'TONE_VALIDATOR', platform: 'linkedin' }
      )

      if (toneCheck.content.toLowerCase().includes('fail') || toneCheck.content.toLowerCase().includes('reject')) {
        logInfo(`[ORATOR] Tone validation failed, submitting to approval queue`)
        await this.submitToApprovalQueue(task, content)
        await this.setStatus('idle')
        return { success: true, data: { queued: true, reason: 'tone_validation_failed' } }
      }

      // 4. Post
      const liAdapter = getPlatformAdapter('linkedin')
      const result = await liAdapter.post({ text: content })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'linkedin',
        actionType: 'post',
        content,
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await hawk.recordAction('linkedin')
      await this.setStatus('idle')
      return { success: true, platformPostId: result.postId }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async getActivePillar(): Promise<string> {
    try {
      const db = getDb()
      const rows = await db`
        SELECT slug FROM content_pillars WHERE active = true ORDER BY created_at ASC LIMIT 1
      `
      return (rows as Array<{ slug: string }>)[0]?.slug ?? 'entrepreneurship'
    } catch {
      return 'entrepreneurship'
    }
  }

  private async submitToApprovalQueue(task: Task, content: string): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score, status
        ) VALUES (
          ${task.id}, 'post', 'linkedin', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'low', 15, 'pending'
        )
      `
    })
  }
}

export const orator = new ORATOR()
