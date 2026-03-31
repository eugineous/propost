// SENTRY — IntelCore Tier 3 trend analyst
// Assesses trend relevance to all 10 content pillars and distributes briefs to CEO agents

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { propostEvents } from '../../events'
import { logInfo } from '../../logger'
import type { Task, ContentPillar } from '../../types'

const ALL_PILLARS: ContentPillar[] = [
  'ai_news',
  'youth_empowerment',
  'trending_topics',
  'elite_conversations',
  'kenyan_entertainment',
  'fashion',
  'media_journalism',
  'personal_story',
  'entrepreneurship',
  'culture_identity',
]

const CEO_AGENTS = ['ZARA', 'NOVA', 'AURORA', 'CHIEF', 'ROOT', 'ORACLE']
const BRIEF_DEADLINE_MS = 5 * 60 * 1000 // 5 minutes

export class SENTRY extends BaseAgent {
  readonly name = 'SENTRY'
  readonly tier = 3 as const
  readonly company = 'intelcore' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    const startTime = Date.now()

    try {
      logInfo(`[SENTRY] Assessing trend relevance across all 10 pillars`, { taskId: task.id })

      // Analyze trends across all 10 content pillars
      const analysisResponse = await aiRouter.route(
        'analyze',
        `Analyze current global and Kenyan trends and assess their relevance to each of these 10 content pillars for Eugine Micah:
        ${ALL_PILLARS.join(', ')}
        
        For each pillar, provide:
        1. Top trending topic (1-2 sentences)
        2. Relevance score (1-10)
        3. Recommended content angle
        4. Urgency level (immediate/this_week/this_month)
        
        Focus on: AI developments, Kenyan/African culture, youth trends, entrepreneurship, media.`,
        { role: 'SENTRY', context: 'trend_analysis', pillars: ALL_PILLARS }
      )

      const brief = analysisResponse.content

      // Check if within 5-minute deadline
      const elapsed = Date.now() - startTime
      if (elapsed > BRIEF_DEADLINE_MS) {
        logInfo(`[SENTRY] Brief generation took ${elapsed}ms (exceeded 5min target)`)
      }

      // Distribute brief to all CEO agents
      for (const ceoAgent of CEO_AGENTS) {
        propostEvents.emit('trend:brief', {
          from: this.name,
          to: ceoAgent,
          brief,
          pillars: ALL_PILLARS,
          generatedAt: new Date().toISOString(),
          elapsedMs: elapsed,
        })
      }

      propostEvents.emit('activity', {
        type: 'task_complete',
        agentName: this.name,
        company: this.company,
        contentPreview: `Trend brief distributed to ${CEO_AGENTS.length} CEO agents`,
        timestamp: new Date().toISOString(),
      })

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          brief,
          distributedTo: CEO_AGENTS,
          elapsedMs: elapsed,
          withinDeadline: elapsed <= BRIEF_DEADLINE_MS,
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const sentry = new SENTRY()
