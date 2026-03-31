// BLAZE — XForce Tier 3 post executor
// Handles X posts and threads with HAWK rate limiting

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo, logError } from '../../logger'
import type { Task } from '../../types'

const THREAD_PART_DELAY_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class BLAZE extends BaseAgent {
  readonly name = 'BLAZE'
  readonly tier = 3 as const
  readonly company = 'xforce' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('x')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return {
          success: false,
          error: `HAWK rate limit reached for X. Reset at ${rateStatus.resetAt.toISOString()}`,
        }
      }

      // 2. Apply HAWK delay
      const delay = await hawk.getDelay('x')
      logInfo(`[BLAZE] Applying HAWK delay: ${delay}ms`)
      await sleep(delay)

      // 3. Get content from task or generate via AI Router
      const taskData = task.result as Record<string, unknown> | undefined
      let content: string = (taskData?.content as string) ?? ''

      if (!content) {
        const pillarContext = task.contentPillar ? `Content pillar: ${task.contentPillar}. ` : ''
        const generated = await aiRouter.route(
          'generate',
          `${pillarContext}Write a compelling X (Twitter) post for Eugine Micah. Keep it under 280 characters. Be authentic, culturally grounded, and authority-driven.`,
          { platform: 'x', contentPillar: task.contentPillar, taskId: task.id }
        )
        content = generated.content
      }

      const xAdapter = getPlatformAdapter('x')

      // 4. Handle thread vs single post
      if (task.type === 'thread_publish') {
        return await this.publishThread(task, content)
      }

      // 5. Post to X
      const result = await xAdapter.post({ text: content.slice(0, 280) })

      // 6. Log action
      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'x',
        actionType: 'post',
        content,
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await hawk.recordAction('x')
      await this.setStatus('idle')

      return { success: true, platformPostId: result.postId, data: { postId: result.postId, url: result.url } }
    } catch (err) {
      logError(`[BLAZE] Post failed`, err, { taskId: task.id })
      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'x',
        actionType: 'post',
        status: 'failed',
        platformResponse: { error: err instanceof Error ? err.message : String(err) },
      })
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async publishThread(task: Task, content: string): Promise<TaskResult> {
    // Split content into thread parts (each ≤ 280 chars)
    const parts = this.splitIntoThreadParts(content)
    const xAdapter = getPlatformAdapter('x')
    const postIds: string[] = []
    let replyToId: string | undefined

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await sleep(THREAD_PART_DELAY_MS)

      const result = await xAdapter.post({ text: parts[i], replyToId })
      if (!result.postId) throw new Error(`Thread part ${i + 1} returned no post ID`)

      postIds.push(result.postId)
      replyToId = result.postId

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'x',
        actionType: 'thread_part',
        content: parts[i],
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })
    }

    await hawk.recordAction('x')
    await this.setStatus('idle')
    return { success: true, platformPostId: postIds[0], data: { threadIds: postIds } }
  }

  private splitIntoThreadParts(content: string): string[] {
    const MAX = 270 // leave room for numbering
    if (content.length <= 280) return [content]

    const sentences = content.split(/(?<=[.!?])\s+/)
    const parts: string[] = []
    let current = ''

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length <= MAX) {
        current = (current + ' ' + sentence).trim()
      } else {
        if (current) parts.push(current)
        current = sentence.slice(0, MAX)
      }
    }
    if (current) parts.push(current)

    return parts.length > 0 ? parts : [content.slice(0, 280)]
  }
}

export const blaze = new BLAZE()
