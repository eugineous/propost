// BLAZE — XForce Tier 3 post executor
// Handles X posts and threads with HAWK rate limiting
// Writes in Eugine Micah's voice — sharp, culturally grounded, authority-driven

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { postViaMake } from '../../make/client'
import { logAction, logInfo, logError } from '../../logger'
import { PLATFORM_PROMPTS } from '../../brand/context'
import { PlatformAPIError } from '../../errors'
import type { Task } from '../../types'

const THREAD_PART_DELAY_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// Pillar-specific X post prompts
const PILLAR_PROMPTS: Record<string, string> = {
  ai_news: `Write a sharp X post about this AI news story. Under 280 characters. Lead with what CHANGED. Add the Kenyan/African angle. End with a provocative question or take. No AI filler phrases. Use em dashes (—) not hyphens.`,
  trending_topics: `Write a hot take X post on this trending topic. Under 200 characters. Polarizing but not toxic. Take a clear position. No hedging.`,
  elite_conversations: `Write an X post for an elite conversation thread. Under 280 characters. Something the top 1% talks about. Sharp. Quotable.`,
  youth_empowerment: `Write an X post for young Kenyans. Under 280 characters. Real talk about money, confidence, or getting ahead. Not preachy — specific.`,
  kenyan_entertainment: `Write an X post about Kenyan entertainment. Under 280 characters. Commentary, not just reporting. Give the take nobody else is giving.`,
  personal_story: `Write an X post from Eugine's personal story. Under 280 characters. Specific moment. Universal lesson.`,
  entrepreneurship: `Write an X post about entrepreneurship. Under 280 characters. Building, pitching, or monetizing. Real and specific.`,
  culture_identity: `Write an X post about Kenyan culture or identity. Under 280 characters. Nairobi lens. Culturally grounded.`,
  media_journalism: `Write an X post about media or journalism. Under 280 characters. Industry insider perspective. Sharp.`,
  fashion: `Write an X post about fashion. Under 280 characters. Style as communication. Nairobi aesthetic.`,
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

      // 2. Get content from task or generate via AI Router
      const taskData = task.result as Record<string, unknown> | undefined
      let content: string = (taskData?.content as string) ?? ''

      if (!content) {
        const pillar = task.contentPillar ?? 'ai_news'
        const pillarPrompt = PILLAR_PROMPTS[pillar] ?? PILLAR_PROMPTS.ai_news
        const generated = await aiRouter.route(
          'generate',
          pillarPrompt,
          { platform: 'x', contentPillar: pillar, taskId: task.id, systemPrompt: PLATFORM_PROMPTS.x }
        )
        content = generated.content
      }

      const xAdapter = getPlatformAdapter('x')

      // 4. Handle thread vs single post
      if (task.type === 'thread_publish') {
        return await this.publishThread(task, content)
      }

      // 5. Try Make.com first (free, no API credits needed)
      const makeResult = await postViaMake({
        platform: 'x',
        content: content.slice(0, 280),
        pillar: task.contentPillar,
        agentName: this.name,
      })

      if (makeResult.ok) {
        logInfo(`[BLAZE] Posted via Make.com webhook`)
        await logAction({
          taskId: task.id,
          agentName: this.name,
          company: this.company,
          platform: 'x',
          actionType: 'post',
          content,
          status: 'success',
          platformResponse: { method: 'make_webhook' },
        })
        await hawk.recordAction('x')
        await this.setStatus('idle')
        return { success: true, data: { method: 'make_webhook' } }
      }

      // 6. Fall back to direct X API
      logInfo(`[BLAZE] Make.com not available (${makeResult.error}), trying direct X API`)
      const result = await xAdapter.post({ text: content.slice(0, 280) })

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
      // 402 CreditsDepleted — X API requires paid plan. Log clearly and fail gracefully.
      if (err instanceof PlatformAPIError && err.statusCode === 402) {
        logError(`[BLAZE] X API credits depleted (402). Activate Make.com X scenario to post for free.`, err)
        await logAction({
          taskId: task.id,
          agentName: this.name,
          company: this.company,
          platform: 'x',
          actionType: 'post',
          status: 'failed',
          platformResponse: { error: 'X API credits depleted. Make.com scenario not active.' },
        })
        await this.setStatus('idle')
        return { success: false, error: 'X API credits depleted — activate Make.com X scenario in make.com dashboard' }
      }
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
