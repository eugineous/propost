// BLAZE — XForce Tier 3 post executor
// Handles X posts and threads. Writes as Eugine Micah — sharp, Nairobi-grounded.
// Makes every post feel like it came from a real person who lives in this city.

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { postViaMake } from '../../make/client'
import { logAction, logInfo, logError } from '../../logger'
import { PLATFORM_PROMPTS } from '../../brand/context'
import { formatContent } from '../../content/formatter'
import {
  EUGINE_BIO,
  EUGINE_LIFE_ARCS,
  NAIROBI_ANGLES,
  HOOK_FORMULAS,
  CONTENT_PILLARS_DEEP,
  VOICE_PATTERNS,
} from '../../brand/eugine'
import { PlatformAPIError } from '../../errors'
import type { Task } from '../../types'

const THREAD_PART_DELAY_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function getRandomArc() {
  return EUGINE_LIFE_ARCS[Math.floor(Math.random() * EUGINE_LIFE_ARCS.length)]
}

function getXHook() {
  const hooks = HOOK_FORMULAS.x
  return hooks[Math.floor(Math.random() * hooks.length)]
}

function getNairobiAngle() {
  return NAIROBI_ANGLES[Math.floor(Math.random() * NAIROBI_ANGLES.length)]
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
        const pillar = task.contentPillar ?? 'nairobi_life'
        content = await this.generateTweet(pillar)
      }

      // 3. Handle thread vs single post
      if (task.type === 'thread_publish') {
        return await this.publishThread(task, content)
      }

      // 4. Try Make.com first (free, no API credits needed)
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

      // 5. Fall back to direct X API
      logInfo(`[BLAZE] Make.com not available (${makeResult.error}), trying direct X API`)
      const xAdapter = getPlatformAdapter('x')
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

  private async generateTweet(pillar: string): Promise<string> {
    const arc = getRandomArc()
    const hookFormula = getXHook()
    const nairobiAngle = getNairobiAngle()
    const pillarData = CONTENT_PILLARS_DEEP[pillar as keyof typeof CONTENT_PILLARS_DEEP]

    // Vary format — sometimes life story hook, sometimes hot take, sometimes question
    const minute = new Date().getUTCMinutes()
    const formats = [
      `Write a sharp X post from this real moment: "${arc.hook}" — Lesson: "${arc.lesson}". Under 220 chars. First person. No preamble.`,
      `Write an X hot take about this Nairobi/Kenya angle: "${nairobiAngle}". Under 220 chars. Polarizing but true. First person.`,
      `Write an X post using this hook formula (adapt naturally): "${hookFormula}". Topic: ${pillarData?.angles?.[0] ?? nairobiAngle}. Under 220 chars.`,
      `Write an X post reacting to Nairobi life. Observation: "${nairobiAngle}". End with a question that demands a response. Under 230 chars.`,
    ]
    const formatPrompt = formats[minute % formats.length]

    const prompt = `${EUGINE_BIO}

TASK: ${formatPrompt}

ABSOLUTE RULES:
1. OUTPUT ONLY THE TWEET TEXT. Zero intro. Zero explanation. Zero quotes around it.
2. First person always. Under 260 characters total.
3. 0 hashtags preferred. 1 max if truly necessary.
4. Em dashes (—) not hyphens. No exclamation marks.
5. NEVER use: ${VOICE_PATTERNS.forbidden.slice(0, 10).join(' / ')}
6. Never mention being AI, a bot, or an agent.
7. Sound like a real person who lives in Nairobi, not a content bot.`

    const generated = await aiRouter.route(
      'generate',
      prompt,
      { systemPrompt: PLATFORM_PROMPTS.x, platform: 'x', contentPillar: pillar }
    )

    const cleaned = formatContent(generated.content, 'x', pillar).content
      .trim()
      .replace(/^["']|["']$/g, '') // strip surrounding quotes if any

    logInfo(`[BLAZE] Generated X post for pillar: ${pillar}`)
    return cleaned
  }

  private async publishThread(task: Task, content: string): Promise<TaskResult> {
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
    const MAX = 270
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
