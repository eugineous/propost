// TONE_VALIDATOR — Tier 4, system
// Validates content against Founder voice profile with up to 2 regeneration retries

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo, logWarn } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

// Banned AI filler phrases
const BANNED_PHRASES = ['delve', 'game-changer', 'dive into', "in today's world", 'game changer']

// Founder voice requirements
const VOICE_REQUIREMENTS = `
- Authority-driven: speaks with confidence and expertise
- Culturally grounded: references Kenyan/African context where relevant
- Storytelling-forward: uses narrative structure
- Uses em dashes (—) for emphasis
- No AI filler phrases: delve, game-changer, dive into, in today's world
- No generic motivational clichés
`

export class ToneValidator extends BaseAgent {
  readonly name = 'TONE_VALIDATOR'
  readonly tier = 4 as const
  readonly company = 'system' as const

  async validateTone(
    content: string
  ): Promise<{ valid: boolean; issues?: string[]; retryCount: number }> {
    // Quick check for banned phrases
    const bannedFound = BANNED_PHRASES.filter((phrase) =>
      content.toLowerCase().includes(phrase.toLowerCase())
    )

    if (bannedFound.length > 0) {
      return {
        valid: false,
        issues: [`Contains banned phrases: ${bannedFound.join(', ')}`],
        retryCount: 0,
      }
    }

    // AI-based tone validation
    const response = await aiRouter.route(
      'validate',
      `Validate this content against Eugine Micah's voice profile:
      ${VOICE_REQUIREMENTS}
      
      Content: "${content}"
      
      Respond with: VALID or INVALID followed by specific issues if invalid.`,
      { role: 'TONE_VALIDATOR', context: 'tone_validation' }
    )

    const text = response.content
    const valid = text.toUpperCase().startsWith('VALID') && !text.toUpperCase().startsWith('INVALID')

    if (!valid) {
      const issueText = text.replace(/^INVALID[:\s]*/i, '').trim()
      const issues = issueText.split('\n').filter((l) => l.trim().length > 0)
      return { valid: false, issues, retryCount: 0 }
    }

    return { valid: true, retryCount: 0 }
  }

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      let content = taskData?.content as string | undefined
      const originalPrompt = taskData?.originalPrompt as string | undefined

      if (!content) {
        return { success: false, error: 'TONE_VALIDATOR requires content in task data' }
      }

      let retryCount = 0
      const MAX_RETRIES = 2

      while (retryCount <= MAX_RETRIES) {
        const validation = await this.validateTone(content)

        if (validation.valid) {
          logInfo(`[TONE_VALIDATOR] Content approved after ${retryCount} retries`)
          await this.setStatus('idle')
          return {
            success: true,
            data: { approved: true, content, retryCount },
          }
        }

        logWarn(`[TONE_VALIDATOR] Tone validation failed (attempt ${retryCount + 1})`, {
          issues: validation.issues,
          taskId: task.id,
        })

        if (retryCount >= MAX_RETRIES) {
          // 3rd failure — insert into approval_queue
          await this.submitToApprovalQueue(task, content, validation.issues ?? [])
          await this.setStatus('idle')
          return {
            success: true,
            data: {
              approved: false,
              queued: true,
              retryCount,
              issues: validation.issues,
            },
          }
        }

        // Regenerate content via AI Router
        const regenerated = await aiRouter.route(
          'generate',
          `Rewrite this content to match Eugine Micah's voice profile:
          ${VOICE_REQUIREMENTS}
          
          Issues with current version: ${validation.issues?.join('; ')}
          
          Original prompt: ${originalPrompt ?? 'social media post'}
          Current content: "${content}"
          
          Rewrite it maintaining the same message but fixing the tone issues.`,
          { role: 'TONE_VALIDATOR', context: 'tone_regeneration', attempt: retryCount + 1 }
        )

        content = regenerated.content
        retryCount++
      }

      await this.setStatus('idle')
      return { success: false, error: 'Tone validation failed after max retries' }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async submitToApprovalQueue(
    task: Task,
    content: string,
    issues: string[]
  ): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score,
          failure_context, status
        ) VALUES (
          ${task.id}, 'tone_review', ${(task.result as Record<string, unknown>)?.platform as string ?? null},
          ${this.name}, ${content}, ${content.slice(0, 100)},
          'medium', 45,
          ${JSON.stringify({ issues, reason: 'tone_validation_failed_3_times' })}, 'pending'
        )
      `
    })
    logWarn(`[TONE_VALIDATOR] Content submitted to approval queue after 3 failed attempts`, {
      taskId: task.id,
    })
  }
}

export const toneValidator = new ToneValidator()
