// ECHO — XForce Tier 3 Reply Specialist
// Replies to X mentions, comments, and DMs
// Target: 20 replies per day, randomized timing, human-like tone
// Uses Eugine's voice — warm with fans, sharp with challengers, professional with brands

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo, logError } from '../../logger'
import { BRAND_CONTEXT } from '../../brand/context'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

const DAILY_REPLY_LIMIT = 20
const REPLY_DELAY_MIN_MS = 3 * 60 * 1000   // 3 minutes minimum between replies
const REPLY_DELAY_MAX_MS = 15 * 60 * 1000  // 15 minutes maximum between replies

function randomDelay(): number {
  return REPLY_DELAY_MIN_MS + Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// Classify the type of mention/reply to determine tone
type ReplyTone = 'fan' | 'challenger' | 'brand' | 'peer' | 'question' | 'spam'

function classifyTone(text: string): ReplyTone {
  const lower = text.toLowerCase()
  if (lower.includes('collab') || lower.includes('partner') || lower.includes('sponsor') || lower.includes('brand deal')) return 'brand'
  if (lower.includes('wrong') || lower.includes('disagree') || lower.includes('actually') || lower.includes('no you')) return 'challenger'
  if (lower.includes('?') || lower.includes('how') || lower.includes('what') || lower.includes('why')) return 'question'
  if (lower.includes('love') || lower.includes('great') || lower.includes('amazing') || lower.includes('fire') || lower.includes('🔥')) return 'fan'
  if (lower.includes('follow') || lower.includes('check out') || lower.includes('dm me') || lower.includes('click')) return 'spam'
  return 'peer'
}

const TONE_PROMPTS: Record<ReplyTone, string> = {
  fan: `Reply warmly and personally. Acknowledge them. Make them feel seen. Short — 1-2 sentences max. No emojis overload. Genuine.`,
  challenger: `Reply with one sharp, precise counter. Don't argue. State your position clearly and move on. Under 200 chars. No aggression — just clarity.`,
  brand: `Reply professionally but briefly. Acknowledge the interest. Direct them to DM for details. Under 150 chars.`,
  peer: `Reply as a peer — conversational, adds value, extends the conversation. 1-2 sentences.`,
  question: `Answer the question directly and specifically. No fluff. If you don't know, say so. Under 280 chars.`,
  spam: `Do not reply to spam. Return null.`,
}

export class ECHO extends BaseAgent {
  readonly name = 'ECHO'
  readonly tier = 3 as const
  readonly company = 'xforce' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // Check daily reply count
      const todayCount = await this.getTodayReplyCount()
      if (todayCount >= DAILY_REPLY_LIMIT) {
        logInfo(`[ECHO] Daily reply limit reached (${todayCount}/${DAILY_REPLY_LIMIT})`)
        await this.setStatus('idle')
        return { success: true, data: { skipped: true, reason: 'daily_limit_reached', count: todayCount } }
      }

      // Get mentions/replies to respond to
      const mentions = await this.fetchMentions()
      if (mentions.length === 0) {
        logInfo(`[ECHO] No mentions to reply to`)
        await this.setStatus('idle')
        return { success: true, data: { replied: 0 } }
      }

      const xAdapter = getPlatformAdapter('x')
      let replied = 0
      const repliedIds: string[] = []

      for (const mention of mentions) {
        if (todayCount + replied >= DAILY_REPLY_LIMIT) break

        // Check HAWK rate limit
        const rateStatus = await hawk.checkRateLimit('x')
        if (!rateStatus.allowed) {
          logInfo(`[ECHO] HAWK rate limit hit, stopping replies`)
          break
        }

        // Classify tone
        const tone = classifyTone(mention.text)
        if (tone === 'spam') {
          logInfo(`[ECHO] Skipping spam mention: ${mention.id}`)
          continue
        }

        // Generate reply
        const tonePrompt = TONE_PROMPTS[tone]
        const generated = await aiRouter.route(
          'generate',
          `You are replying to this X post as Eugine Micah:

Original post: "${mention.text}"
Author: @${mention.authorUsername}
Tone classification: ${tone}

${tonePrompt}

VOICE RULES:
${BRAND_CONTEXT.slice(0, 500)}

Write ONLY the reply text. No quotes. No "Reply:" prefix. Just the reply itself.
If tone is spam, write exactly: SKIP`,
          { platform: 'x', role: 'ECHO', tone }
        )

        const replyText = generated.content.trim()
        if (replyText === 'SKIP' || replyText.toLowerCase().includes('skip')) continue

        // Apply human-like delay
        const delay = await hawk.getDelay('x')
        const humanDelay = Math.max(delay, randomDelay())
        logInfo(`[ECHO] Waiting ${Math.round(humanDelay / 1000)}s before replying to @${mention.authorUsername}`)
        await sleep(Math.min(humanDelay, 5000)) // cap at 5s in execution context

        // Post the reply
        const result = await xAdapter.reply(mention.id, replyText.slice(0, 280))

        await logAction({
          taskId: task.id,
          agentName: this.name,
          company: this.company,
          platform: 'x',
          actionType: 'reply',
          content: replyText,
          status: 'success',
          platformPostId: result.postId,
          platformResponse: result.rawResponse,
        })

        await hawk.recordAction('x')
        repliedIds.push(mention.id)
        replied++

        logInfo(`[ECHO] Replied to @${mention.authorUsername} (${replied}/${DAILY_REPLY_LIMIT - todayCount} remaining today)`)
      }

      await this.setStatus('idle')
      return { success: true, data: { replied, repliedIds, todayTotal: todayCount + replied } }
    } catch (err) {
      logError(`[ECHO] Reply cycle failed`, err)
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async getTodayReplyCount(): Promise<number> {
    try {
      const db = getDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const rows = await db`
        SELECT COUNT(*) as count FROM actions
        WHERE agent_name = 'ECHO'
          AND action_type = 'reply'
          AND status = 'success'
          AND timestamp >= ${today.toISOString()}
      `
      return parseInt((rows as Array<{ count: string }>)[0]?.count ?? '0')
    } catch {
      return 0
    }
  }

  private async fetchMentions(): Promise<Array<{ id: string; text: string; authorUsername: string; authorId: string }>> {
    // Try X API first
    try {
      const apiKey = process.env.X_API_KEY
      const accessToken = process.env.X_ACCESS_TOKEN
      const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET
      const apiSecret = process.env.X_API_SECRET

      if (!apiKey || !accessToken || !accessTokenSecret || !apiSecret) {
        return this.getMockMentions()
      }

      const { signOAuth1 } = await import('../../platforms/x')
      const url = 'https://api.twitter.com/2/users/me/mentions?tweet.fields=author_id,text&expansions=author_id&user.fields=username&max_results=20'
      const auth = await signOAuth1('GET', url.split('?')[0], {}, apiKey, apiSecret, accessToken, accessTokenSecret)

      const res = await fetch(url, { headers: { Authorization: auth } })
      if (!res.ok) return this.getMockMentions()

      const data = await res.json() as {
        data?: Array<{ id: string; text: string; author_id: string }>
        includes?: { users?: Array<{ id: string; username: string }> }
      }

      const users = new Map((data.includes?.users ?? []).map(u => [u.id, u.username]))

      return (data.data ?? []).map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: users.get(tweet.author_id) ?? 'unknown',
      }))
    } catch {
      return this.getMockMentions()
    }
  }

  // Fallback when API isn't available — returns empty so no fake replies are sent
  private getMockMentions(): Array<{ id: string; text: string; authorUsername: string; authorId: string }> {
    return []
  }
}

export const echo = new ECHO()
