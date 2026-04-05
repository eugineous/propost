// ORATOR — LinkedElite Tier 3 content creator
// Generates professional LinkedIn posts aligned with active Content Pillar

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { getPlatformAdapter } from '../../platforms/index'
import { logAction, logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import { PLATFORM_PROMPTS } from '../../brand/context'
import { formatContent } from '../../content/formatter'
import type { Task } from '../../types'

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

        // Pillar-specific LinkedIn post angles — each gives the AI a specific human angle
        const PILLAR_ANGLES: Record<string, string> = {
          ai_news: `Write about a recent AI development and its direct meaning for Kenya/Africa. Start with a bold first-person hook: "I've been watching [X] for [Y] years..." or "Everyone's talking about [topic]. Nobody's asking what it means for Nairobi." 3-4 short paragraphs. End with 1 direct question. 3-4 hashtags.`,
          youth_empowerment: `Write about getting ahead as a young Kenyan professional — real, specific advice. Start with a moment or observation. 3-4 paragraphs. End with one question. 3-4 hashtags.`,
          elite_conversations: `Write about wealth, access, or leadership the top 1% in Kenya discusses but most avoid. Bold opening. Confident. 3-4 paragraphs. Provocative question at end. 3-4 hashtags.`,
          entrepreneurship: `Write about building a media or digital business in Kenya — share a specific lesson or insight from your experience. First-person, specific. 3-4 paragraphs. 3-4 hashtags.`,
          media_journalism: `Write about the state of media or journalism in Kenya/Africa. Industry insider perspective. What's changing, what's broken. 3-4 paragraphs. 3-4 hashtags.`,
          personal_story: `Write from your personal journey — from growing up in Western Kenya (Bunyore/Maragoli) to building a media career in Nairobi. One specific moment. Universal lesson. First-person. 3-4 paragraphs. 3-4 hashtags.`,
          trending_topics: `Write reacting to a major trend in tech, media, or business with the Kenyan angle front and center. Sharp take. 3-4 paragraphs. 3-4 hashtags.`,
        }

        const angle = PILLAR_ANGLES[pillar] ?? PILLAR_ANGLES.ai_news

        const generated = await aiRouter.route(
          'generate',
          `You ARE Eugine Micah writing your own LinkedIn post. AI Builder & TV Host based in Nairobi. Urban News host on StarTimes. Author of "Born Broke, Built Loud." 2,665 followers counting on real content.

WRITE THIS POST: ${angle}

ABSOLUTE RULES — breaking any = discard the whole post:
1. Start the post immediately with its first word. DO NOT write "Here's a post:", "Here is:", "Below is:", or ANY intro before the post.
2. Write in first person (I, my, we). Never third person about yourself.
3. Never use: "game-changer" / "delve into" / "dive into" / "in today's fast-paced world" / "unlock your potential" / "excited to share" / "leverage" / "synergies"
4. Hashtags use # symbol only. Never "hashtag#". Max 4 hashtags, at the very end.
5. Em dashes (—) for emphasis. Never plain hyphens (-).
6. No bold formatting on LinkedIn — write plain text only.`,
          { systemPrompt: PLATFORM_PROMPTS.linkedin, platform: 'linkedin', contentPillar: pillar }
        )
        content = formatContent(generated.content, 'linkedin', pillar).content
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

  private async getActivePillar(): Promise<string> {
    try {
      const db = getDb()
      const rows = await db`
        SELECT slug FROM content_pillars WHERE active = true ORDER BY created_at ASC LIMIT 1
      `
      return (rows as Array<{ slug: string }>)[0]?.slug ?? 'entrepreneurship'
    } catch {
      return 'entrepreneurship'
    }
  }

  private async submitToApprovalQueue(task: Task, content: string): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score, status
        ) VALUES (
          ${task.id}, 'post', 'linkedin', ${this.name},
          ${content}, ${content.slice(0, 100)}, 'low', 15, 'pending'
        )
      `
    })
  }
}

export const orator = new ORATOR()
