// QC_AGENT — Tier 4, system
// Reviews content quality before publishing

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo } from '../../logger'
import type { Task } from '../../types'

export class QCAgent extends BaseAgent {
  readonly name = 'QC_AGENT'
  readonly tier = 4 as const
  readonly company = 'system' as const

  async reviewContent(content: string): Promise<{ approved: boolean; feedback?: string }> {
    const response = await aiRouter.route(
      'validate',
      `Review this content for quality and brand alignment for Eugine Micah:
      "${content}"
      
      Check for:
      1. Factual accuracy and coherence
      2. Brand voice consistency (authority-driven, culturally grounded, storytelling-forward)
      3. No harmful, offensive, or misleading content
      4. Appropriate length and format for the platform
      5. No AI filler phrases (delve, game-changer, dive into, in today's world)
      
      Respond with: APPROVED or REJECTED followed by brief feedback.`,
      { role: 'QC_AGENT', context: 'content_review' }
    )

    const text = response.content
    const approved = text.toUpperCase().includes('APPROVED') && !text.toUpperCase().includes('REJECTED')
    const feedback = text.replace(/^(APPROVED|REJECTED)[:\s]*/i, '').trim()

    logInfo(`[QC_AGENT] Content review: ${approved ? 'APPROVED' : 'REJECTED'}`, {
      contentPreview: content.slice(0, 50),
    })

    return { approved, feedback: feedback || undefined }
  }

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const content = taskData?.content as string | undefined

      if (!content) {
        return { success: false, error: 'QC_AGENT requires content in task data' }
      }

      const review = await this.reviewContent(content)

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          approved: review.approved,
          feedback: review.feedback,
          content,
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const qcAgent = new QCAgent()
