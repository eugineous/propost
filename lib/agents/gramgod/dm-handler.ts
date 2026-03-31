// CHAT — GramGod Tier 3 DM Handler
// Handles Instagram DMs — 20 per day, human-like timing
// Classifies: fan | brand_deal | friend | spam
// Responds in Eugine's voice — warm with fans, professional with brands

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { logAction, logInfo, logError } from '../../logger'
import { BRAND_CONTEXT } from '../../brand/context'
import { getDb } from '../../db/client'
import type { Task } from '../../types'

const DAILY_DM_LIMIT = 20
const MIN_RESPONSE_DELAY_MS = 2 * 60 * 1000   // 2 min min
const MAX_RESPONSE_DELAY_MS = 8 * 60 * 1000   // 8 min max

type DMTone = 'fan' | 'brand_deal' | 'friend' | 'spam' | 'question'

function classifyDM(text: string): DMTone {
  const lower = text.toLowerCase()
  if (lower.includes('collab') || lower.includes('sponsor') || lower.includes('brand deal') || lower.includes('partnership') || lower.includes('paid')) return 'brand_deal'
  if (lower.includes('bro') || lower.includes('fam') || lower.includes('boss') || lower.includes('chief')) return 'friend'
  if (lower.includes('?') || lower.includes('how') || lower.includes('where') || lower.includes('when')) return 'question'
  if (lower.includes('follow') || lower.includes('check out my') || lower.includes('click link')) return 'spam'
  return 'fan'
}

const DM_PROMPTS: Record<DMTone, string> = {
  fan: `Reply warmly and personally. Make them feel seen and appreciated. 1-2 sentences. Genuine, not generic.`,
  brand_deal: `Reply professionally. Acknowledge the interest. Ask them to send their media kit and rates. Keep it brief and professional. Under 200 chars.`,
  friend: `Reply casually like you're talking to a friend. Use their energy. Short and real.`,
  question: `Answer the question directly. If you don't know, say so honestly. Under 200 chars.`,
  spam: `Do not reply. Return SKIP.`,
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export class CHAT extends BaseAgent {
  readonly name = 'CHAT'
  readonly tier = 3 as const
  readonly company = 'gramgod' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const todayCount = await this.getTodayDMCount()
      if (todayCount >= DAILY_DM_LIMIT) {
        logInfo(`[CHAT] Daily DM limit reached (${todayCount}/${DAILY_DM_LIMIT})`)
        await this.setStatus('idle')
        return { success: true, data: { skipped: true, reason: 'daily_limit_reached' } }
      }

      const dms = await this.fetchPendingDMs()
      if (dms.length === 0) {
        await this.setStatus('idle')
        return { success: true, data: { replied: 0 } }
      }

      let replied = 0

      for (const dm of dms) {
        if (todayCount + replied >= DAILY_DM_LIMIT) break

        const rateStatus = await hawk.checkRateLimit('instagram')
        if (!rateStatus.allowed) break

        const tone = classifyDM(dm.text)
        if (tone === 'spam') continue

        const generated = await aiRouter.route(
          'generate',
          `You are replying to this Instagram DM as Eugine Micah:

Message: "${dm.text}"
From: ${dm.senderName}
Tone: ${tone}

${DM_PROMPTS[tone]}

VOICE:
${BRAND_CONTEXT.slice(0, 400)}

Write ONLY the reply. No quotes. No prefix. Just the message.
If spam, write: SKIP`,
          { platform: 'instagram', role: 'CHAT', tone }
        )

        const reply = generated.content.trim()
        if (reply === 'SKIP') continue

        // Human-like delay
        const delay = MIN_RESPONSE_DELAY_MS + Math.random() * (MAX_RESPONSE_DELAY_MS - MIN_RESPONSE_DELAY_MS)
        await sleep(Math.min(delay, 3000))

        // Send via Instagram API
        const sent = await this.sendInstagramDM(dm.threadId, reply)

        if (sent) {
          await logAction({
            taskId: task.id,
            agentName: this.name,
            company: this.company,
            platform: 'instagram',
            actionType: 'dm_reply',
            content: reply,
            status: 'success',
          })
          await hawk.recordAction('instagram')
          replied++
          logInfo(`[CHAT] Replied to DM from ${dm.senderName} (tone: ${tone})`)
        }
      }

      await this.setStatus('idle')
      return { success: true, data: { replied, todayTotal: todayCount + replied } }
    } catch (err) {
      logError(`[CHAT] DM cycle failed`, err)
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async getTodayDMCount(): Promise<number> {
    try {
      const db = getDb()
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const rows = await db`
        SELECT COUNT(*) as count FROM actions
        WHERE agent_name = 'CHAT' AND action_type = 'dm_reply'
          AND status = 'success' AND timestamp >= ${today.toISOString()}
      `
      return parseInt((rows as Array<{ count: string }>)[0]?.count ?? '0')
    } catch { return 0 }
  }

  private async fetchPendingDMs(): Promise<Array<{ threadId: string; text: string; senderName: string; senderId: string }>> {
    try {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN
      const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
      if (!token || !igId) return []

      const res = await fetch(
        `https://graph.instagram.com/v18.0/${igId}/conversations?fields=messages{message,from}&access_token=${token}`
      )
      if (!res.ok) return []

      const data = await res.json() as {
        data?: Array<{
          id: string
          messages?: { data?: Array<{ message: string; from: { id: string; name: string } }> }
        }>
      }

      const dms: Array<{ threadId: string; text: string; senderName: string; senderId: string }> = []
      for (const thread of data.data ?? []) {
        const msgs = thread.messages?.data ?? []
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg && lastMsg.from.id !== igId) {
          dms.push({
            threadId: thread.id,
            text: lastMsg.message,
            senderName: lastMsg.from.name,
            senderId: lastMsg.from.id,
          })
        }
      }
      return dms.slice(0, 20)
    } catch { return [] }
  }

  private async sendInstagramDM(threadId: string, message: string): Promise<boolean> {
    try {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN
      const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
      if (!token || !igId) return false

      const res = await fetch(`https://graph.instagram.com/v18.0/${igId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { thread_key: threadId },
          message: { text: message },
          access_token: token,
        }),
      })
      return res.ok
    } catch { return false }
  }
}

export const chat = new CHAT()
