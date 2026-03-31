// STORY — GramGod Tier 3 story agent
// Publishes Instagram Stories within 2 min of scheduled time

import { BaseAgent, type TaskResult } from '../base'
import { hawk } from '../../hawk/engine'
import { InstagramAdapter } from '../../platforms/instagram'
import { logAction, logWarn } from '../../logger'
import type { Task } from '../../types'

const MAX_SCHEDULE_DRIFT_MS = 2 * 60 * 1000 // 2 minutes

export class STORY extends BaseAgent {
  readonly name = 'STORY'
  readonly tier = 3 as const
  readonly company = 'gramgod' as const

  private igAdapter = new InstagramAdapter()

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check if within 2 min of scheduled time
      if (task.scheduledAt) {
        const drift = Math.abs(Date.now() - new Date(task.scheduledAt).getTime())
        if (drift > MAX_SCHEDULE_DRIFT_MS) {
          logWarn(`[STORY] Task executed ${Math.round(drift / 1000)}s from scheduled time`, {
            taskId: task.id,
            scheduledAt: task.scheduledAt,
          })
        }
      }

      // 2. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('instagram')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return { success: false, error: `HAWK rate limit reached for Instagram` }
      }

      const taskData = task.result as Record<string, unknown> | undefined
      const mediaUrl = taskData?.mediaUrl as string | undefined
      const caption = (taskData?.caption as string) ?? ''

      if (!mediaUrl) {
        return { success: false, error: 'STORY requires mediaUrl in task data' }
      }

      // 3. Apply HAWK delay
      const delay = await hawk.getDelay('instagram')
      await new Promise((r) => setTimeout(r, delay))

      // 4. Publish story
      const result = await this.igAdapter.storyPublish({
        text: caption,
        mediaUrls: [mediaUrl],
      })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'instagram',
        actionType: 'story_publish',
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

export const story = new STORY()
