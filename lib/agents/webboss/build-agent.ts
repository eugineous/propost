// BUILD — WebBoss Tier 3 build agent
// Publishes blog posts via WebsiteAdapter

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction } from '../../logger'
import type { Task } from '../../types'

export class BUILD extends BaseAgent {
  readonly name = 'BUILD'
  readonly tier = 3 as const
  readonly company = 'webboss' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      let content = taskData?.content as string | undefined

      // Generate blog post content if not provided
      if (!content) {
        const generated = await aiRouter.route(
          'generate',
          `Write a blog post for Eugine Micah about: ${task.contentPillar ?? 'entrepreneurship and technology'}.
          Requirements:
          - Professional, long-form content (500-800 words)
          - Authority-driven, storytelling-forward
          - Culturally grounded with Kenyan/African perspective
          - SEO-friendly structure with clear headings
          - No AI filler phrases`,
          { platform: 'website', contentPillar: task.contentPillar, role: 'BUILD' }
        )
        content = generated.content
      }

      // Publish via WebsiteAdapter (triggers Vercel deploy)
      const webAdapter = getPlatformAdapter('website')
      const result = await webAdapter.post({ text: content })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'website',
        actionType: 'blog_publish',
        content: content.slice(0, 500),
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await this.setStatus('idle')
      return { success: true, platformPostId: result.postId }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const build = new BUILD()
