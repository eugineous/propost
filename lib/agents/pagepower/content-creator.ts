// REACH — PagePower Tier 3 content creator
// Generates Facebook posts with community-oriented framing

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction } from '../../logger'
import type { Task } from '../../types'

export class REACH extends BaseAgent {
  readonly name = 'REACH'
  readonly tier = 3 as const
  readonly company = 'pagepower' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('facebook')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return { success: false, error: `HAWK rate limit reached for Facebook` }
      }

      // 2. Generate community-oriented post via AI Router
      const generated = await aiRouter.route(
        'generate',
        `Write a Facebook post for Eugine Micah about: ${task.contentPillar ?? 'community and culture'}.
        Requirements:
        - Community-oriented framing — speak to and with the community, not at them
        - Invite engagement: ask a question or prompt a discussion
        - Authentic, culturally grounded, authority-driven
        - 100-300 characters optimal for Facebook reach
        - No AI filler phrases`,
        { platform: 'facebook', contentPillar: task.contentPillar, role: 'REACH' }
      )

      const content = generated.content

      // 3. Post
      const fbAdapter = getPlatformAdapter('facebook')
      const result = await fbAdapter.post({ text: content })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'facebook',
        actionType: 'post',
        content,
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await hawk.recordAction('facebook')
      await this.setStatus('idle')
      return { success: true, platformPostId: result.postId }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const reach = new REACH()
