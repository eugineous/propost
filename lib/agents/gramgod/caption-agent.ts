// CAPTION — GramGod Tier 3 caption agent
// Generates Instagram captions with hashtag blocks

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo } from '../../logger'
import type { Task } from '../../types'

export class CAPTION extends BaseAgent {
  readonly name = 'CAPTION'
  readonly tier = 3 as const
  readonly company = 'gramgod' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('instagram')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return { success: false, error: `HAWK rate limit reached for Instagram` }
      }

      const taskData = task.result as Record<string, unknown> | undefined
      const mediaUrl = taskData?.mediaUrl as string | undefined

      // 2. Generate caption with hashtag block via AI Router
      const generated = await aiRouter.route(
        'generate',
        `Write an Instagram caption for Eugine Micah about: ${task.contentPillar ?? 'lifestyle and culture'}. 
        Requirements:
        - Engaging, authentic, culturally grounded
        - Authority-driven and storytelling-forward
        - Include a hashtag block at the end with 15-20 relevant hashtags
        - Use em dashes for emphasis
        - No AI filler phrases
        Format: [caption text]\n\n[hashtag block]`,
        { platform: 'instagram', contentPillar: task.contentPillar, role: 'CAPTION' }
      )

      const content = generated.content

      // 3. Post
      const igAdapter = getPlatformAdapter('instagram')
      const result = await igAdapter.post({
        text: content,
        mediaUrls: mediaUrl ? [mediaUrl] : undefined,
      })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'instagram',
        actionType: 'post',
        content,
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await hawk.recordAction('instagram')
      await this.setStatus('idle')
      return { success: true, platformPostId: result.postId }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const caption = new CAPTION()
