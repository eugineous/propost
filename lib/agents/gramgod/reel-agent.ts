// REEL — GramGod Tier 3 reel agent
// Publishes Instagram Reels via InstagramAdapter.reelPublish()

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { InstagramAdapter } from '../../platforms/instagram'
import { logAction } from '../../logger'
import type { Task } from '../../types'

export class REEL extends BaseAgent {
  readonly name = 'REEL'
  readonly tier = 3 as const
  readonly company = 'gramgod' as const

  private igAdapter = new InstagramAdapter()

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
      const videoUrl = taskData?.videoUrl as string | undefined

      if (!videoUrl) {
        return { success: false, error: 'REEL requires videoUrl in task data' }
      }

      // 2. Generate caption for the reel
      const captionResponse = await aiRouter.route(
        'generate',
        `Write a short, punchy Instagram Reel caption for Eugine Micah about: ${task.contentPillar ?? 'culture and lifestyle'}. 
        Max 150 characters. Include 5-8 hashtags. Be authentic and engaging.`,
        { platform: 'instagram', contentPillar: task.contentPillar, role: 'REEL' }
      )

      const caption = captionResponse.content

      // 3. Apply HAWK delay
      const delay = await hawk.getDelay('instagram')
      await new Promise((r) => setTimeout(r, delay))

      // 4. Publish reel via InstagramAdapter.reelPublish()
      const result = await this.igAdapter.reelPublish({
        text: caption,
        mediaUrls: [videoUrl],
      })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'instagram',
        actionType: 'reel_publish',
        content: caption,
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

export const reel = new REEL()
