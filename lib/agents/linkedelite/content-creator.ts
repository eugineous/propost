// ORATOR — LinkedElite Tier 3 content creator
// Writes as Eugine Micah. Draws from real life arcs, Nairobi angles, 60-day calendar.
// Inspired by Steven Bartlett: Hook → Story → Insight → Provocation

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo } from '../../logger'
import { getDb } from '../../db/client'
import { PLATFORM_PROMPTS } from '../../brand/context'
import { formatContent } from '../../content/formatter'
import {
  EUGINE_BIO,
  EUGINE_LIFE_ARCS,
  NAIROBI_ANGLES,
  HOOK_FORMULAS,
  CONTENT_PILLARS_DEEP,
  CONTENT_CALENDAR_60_DAYS,
  VOICE_PATTERNS,
} from '../../brand/eugine'
import type { Task } from '../../types'

// Pick today's calendar slot (day of year mod 60, 1-indexed)
function getTodayCalendarSlot() {
  const now = new Date()
  const start = new Date(now.getUTCFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  const slotIndex = (dayOfYear - 1) % 60
  return CONTENT_CALENDAR_60_DAYS[slotIndex]
}

// Get a random life arc for personal storytelling
function getRandomArc() {
  return EUGINE_LIFE_ARCS[Math.floor(Math.random() * EUGINE_LIFE_ARCS.length)]
}

// Pick a hook formula for LinkedIn
function getHookFormula() {
  const hooks = HOOK_FORMULAS.linkedin
  return hooks[Math.floor(Math.random() * hooks.length)]
}

// Get a random Nairobi angle
function getNairobiAngle() {
  return NAIROBI_ANGLES[Math.floor(Math.random() * NAIROBI_ANGLES.length)]
}

export class ORATOR extends BaseAgent {
  readonly name = 'ORATOR'
  readonly tier = 3 as const
  readonly company = 'linkedelite' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('linkedin')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return { success: false, error: `HAWK rate limit reached for LinkedIn` }
      }

      // 2. Get content — use pre-loaded content if available, otherwise generate
      const taskData = task.result as Record<string, unknown> | undefined
      let content: string = (taskData?.content as string) ?? ''

      if (!content) {
        const pillar = task.contentPillar ?? await this.getActivePillar()
        content = await this.generatePost(pillar)
      }

      // 3. Post
      const liAdapter = getPlatformAdapter('linkedin')
      const result = await liAdapter.post({ text: content })

      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'linkedin',
        actionType: 'post',
        content,
        status: 'success',
        platformPostId: result.postId,
        platformResponse: result.rawResponse,
      })

      await hawk.recordAction('linkedin')
      await this.setStatus('idle')
      return { success: true, platformPostId: result.postId }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async generatePost(pillar: string): Promise<string> {
    const calendar = getTodayCalendarSlot()
    const hook = getHookFormula()
    const nairobiAngle = getNairobiAngle()
    const pillarData = CONTENT_PILLARS_DEEP[pillar as keyof typeof CONTENT_PILLARS_DEEP]
    const arc = getRandomArc()

    // Build the specific angle — use calendar slot if pillar matches, else use pillar angles
    const calendarAngle = calendar.pillar === pillar
      ? calendar.angle
      : (pillarData?.angles?.[0] ?? calendar.angle)

    // For personal story pillar, include the actual arc to draw from
    const storyContext = pillar === 'personal_story'
      ? `\n\nSTORY ARC TO DRAW FROM:\nHook: "${arc.hook}"\nStory: "${arc.story}"\nLesson: "${arc.lesson}"`
      : ''

    const prompt = `${EUGINE_BIO}

TODAY'S ANGLE: ${calendarAngle}

PILLAR RULE: ${pillarData?.rule ?? 'Write from direct personal experience with Kenyan context.'}

HOOK FORMULA TO USE (adapt it, don't copy verbatim):
"${hook}"

NAIROBI GROUNDING: Weave in this relatable angle if it fits: "${nairobiAngle}"
${storyContext}

WRITE A LINKEDIN POST using the Steven Bartlett formula:
1. HOOK (1-2 lines) — Stop the scroll. Use the hook formula above, adapted naturally.
2. PERSONAL STORY (2-3 short paragraphs) — Real, specific, Kenyan. The kind of story you'd tell at a dinner table.
3. UNIVERSAL LESSON — What does this mean for anyone reading this in Nairobi/Africa?
4. PROVOCATION or QUESTION — Something that makes them think or want to respond.
5. 3-4 HASHTAGS at the very end using # symbol.

LENGTH: 400-800 characters. Short paragraphs. White space between sections.

ABSOLUTE RULES — break any of these and the post is trash:
1. OUTPUT ONLY THE POST. First word of your output = first word of the post. No "Here's a post:", no intro, no explanation.
2. First person (I, my, we). Never third person about yourself. Never "Eugine Micah" in the post.
3. NEVER use: ${VOICE_PATTERNS.forbidden.join(' / ')}
4. Hashtags: # symbol only. Never "hashtag#". Max 4 hashtags. At the very end only.
5. Em dashes (—) for emphasis. Never plain hyphens.
6. No bold (**text**) — LinkedIn renders this poorly and looks AI-generated.
7. No bullet points with asterisks or dashes. Write in paragraphs.
8. Never mention being an AI, a bot, an agent, or ORATOR.`

    const generated = await aiRouter.route(
      'generate',
      prompt,
      { systemPrompt: PLATFORM_PROMPTS.linkedin, platform: 'linkedin', contentPillar: pillar }
    )

    const cleaned = formatContent(generated.content, 'linkedin', pillar).content
    logInfo(`[ORATOR] Generated LinkedIn post for pillar: ${pillar}, angle: ${calendarAngle.slice(0, 50)}`)
    return cleaned
  }

  private async getActivePillar(): Promise<string> {
    try {
      const db = getDb()
      const rows = await db`
        SELECT slug FROM content_pillars WHERE active = true ORDER BY created_at ASC LIMIT 1
      `
      return (rows as Array<{ slug: string }>)[0]?.slug ?? 'personal_story'
    } catch {
      // Default to today's calendar pillar
      return getTodayCalendarSlot().pillar
    }
  }
}

export const orator = new ORATOR()
