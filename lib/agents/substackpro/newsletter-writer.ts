// QUILL — SubstackPro Tier 3 newsletter writer
//
// Generates long-form Substack newsletters in Eugine Micah's voice.
// Each newsletter is 800-1500 words, HTML-formatted, and published
// directly to Substack via the SubstackAdapter.
//
// Task types handled:
//   - newsletter_publish  (primary — scheduled daily at 8AM EAT)
//   - post_content        (secondary — one-off publish from dashboard)
//
// Content format: newsletter article with:
//   1. Hook (2-3 sentences that demand attention)
//   2. Body (analysis, context, Kenya/Africa lens, 4-6 paragraphs)
//   3. Takeaway (one clear thing the reader should do or think about)
//   4. Sign-off (brief, human, not salesy)

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { hawk } from '../../hawk/engine'
import { SubstackAdapter, mdToHtml } from '../../platforms/substack'
import { logAction, logInfo, logError } from '../../logger'
import { getBestTopic } from '../../content/ai-news-source'
import { PLATFORM_PROMPTS } from '../../brand/context'
import type { Task } from '../../types'

const NEWSLETTER_PROMPT = `You are writing a Substack newsletter for Eugine Micah — Nairobi-based media entrepreneur, AI commentator, and cultural voice.

NEWSLETTER STRUCTURE (write in this exact order):
1. **Title** — punchy, 6-10 words, no question marks, no "How to"
2. **Subtitle** — one sentence that delivers the promise of the piece
3. **Hook** — 2-3 sentences that make the reader unable to stop. Personal angle or provocative take.
4. **The Situation** — what's happening (1-2 paragraphs, facts + context)
5. **The Kenya/Africa Angle** — why this matters here specifically (1-2 paragraphs)
6. **The Deeper Take** — what most people are missing (1-2 paragraphs, original insight)
7. **What You Should Do** — one concrete, actionable takeaway (1 paragraph)
8. **Sign-off** — brief, warm, human. Always end with: "— Eugine"

VOICE RULES:
- Write like you're explaining to your smartest friend, not to a committee
- Em dashes (—) not hyphens for emphasis
- Short sentences punch. Long sentences build momentum. Mix them.
- No AI filler: "delve", "game-changer", "dive into", "in today's rapidly evolving", "transformative"
- Kenyan cultural references welcome (Nairobi, matatu, hustler, etc.)
- 800-1200 words total
- Use ## for section headers (H2)
- Use **bold** for key phrases

FORMAT: Output clean markdown. Title on first line with # prefix. Subtitle on second line (no prefix). Then the body.`

export class QUILL extends BaseAgent {
  readonly name = 'QUILL'
  readonly tier = 3 as const
  readonly company = 'substackpro' as const

  private adapter = new SubstackAdapter()

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      // 1. Check HAWK rate limit
      const rateStatus = await hawk.checkRateLimit('substack')
      if (!rateStatus.allowed) {
        await this.setStatus('idle')
        return {
          success: false,
          error: `HAWK rate limit reached for Substack. Reset at ${rateStatus.resetAt.toISOString()}`,
        }
      }

      // 2. Get content — use pre-loaded content if available, otherwise generate
      const taskData = task.result as Record<string, unknown> | undefined
      let rawContent: string = (taskData?.content as string) ?? ''
      let title = (taskData?.title as string) ?? ''

      if (!rawContent) {
        logInfo(`[QUILL] Generating newsletter for pillar: ${task.contentPillar ?? 'ai_news'}`)

        // Get the best topic to write about
        const topic = await getBestTopic()

        const generated = await aiRouter.route(
          'generate',
          `${NEWSLETTER_PROMPT}

TOPIC: ${topic.headline}

SUMMARY FOR CONTEXT: ${topic.summary}

CONTENT PILLAR: ${task.contentPillar ?? 'ai_news'}

Write the full newsletter now.`,
          {
            platform: 'substack',
            contentPillar: task.contentPillar,
            systemPrompt: PLATFORM_PROMPTS.substack ?? PLATFORM_PROMPTS.linkedin,
            role: 'QUILL',
          }
        )

        rawContent = generated.content
      }

      // 3. Parse title and subtitle from the generated markdown
      const lines = rawContent.split('\n').filter((l) => l.trim())
      if (!title) {
        title = lines[0].replace(/^#+\s*/, '').trim() || 'AI in Africa — This Week'
      }
      const subtitle = lines[1]?.startsWith('#') ? '' : lines[1]?.trim() ?? ''
      const bodyLines = lines.slice(subtitle ? 2 : 1).join('\n')

      logInfo(`[QUILL] Publishing newsletter: "${title}"`)

      // 4. Convert markdown to HTML and publish
      const result = await this.adapter.publishNewsletter({
        title,
        subtitle,
        bodyHtml: mdToHtml(bodyLines),
        audience: 'everyone',
        sendEmail: true,
      })

      // 5. Log action
      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'substack',
        actionType: 'newsletter_publish',
        content: rawContent.slice(0, 500),
        status: 'success',
        platformPostId: result.postId,
        platformResponse: { postId: result.postId, url: result.url },
      })

      await hawk.recordAction('substack')
      await this.setStatus('idle')

      logInfo(`[QUILL] Published: ${result.url}`)
      return {
        success: true,
        platformPostId: result.postId,
        data: { postId: result.postId, url: result.url, title },
      }
    } catch (err) {
      logError(`[QUILL] Newsletter publish failed`, err, { taskId: task.id })
      await logAction({
        taskId: task.id,
        agentName: this.name,
        company: this.company,
        platform: 'substack',
        actionType: 'newsletter_publish',
        status: 'failed',
        platformResponse: { error: err instanceof Error ? err.message : String(err) },
      })
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const quill = new QUILL()
