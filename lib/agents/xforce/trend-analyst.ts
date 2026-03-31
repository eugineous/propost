// SCOUT — XForce Tier 3 trend analyst
// Analyzes trending topics on X and notifies ZARA

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { propostEvents } from '../../events'
import { logInfo } from '../../logger'
import type { Task } from '../../types'

export class SCOUT extends BaseAgent {
  readonly name = 'SCOUT'
  readonly tier = 3 as const
  readonly company = 'xforce' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[SCOUT] Analyzing trending topics`, { taskId: task.id })

      // Analyze trending topics using AI Router
      const analysisResponse = await aiRouter.route(
        'analyze',
        'Analyze current trending topics on X (Twitter) relevant to: AI, youth empowerment, Kenyan entertainment, fashion, entrepreneurship, and culture. Score each topic 1-10 for relevance to Eugine Micah\'s brand. Return top 5 trends with scores and recommended content angles.',
        { role: 'SCOUT', platform: 'x', contentPillar: task.contentPillar }
      )

      const analysis = analysisResponse.content

      // Score relevance and extract top trends
      const trends = this.parseTrends(analysis)

      // Notify ZARA via propostEvents
      propostEvents.emit('activity', {
        type: 'alert',
        agentName: this.name,
        company: this.company,
        platform: 'x',
        contentPreview: `Trend brief: ${trends.slice(0, 2).join(', ')}`,
        timestamp: new Date().toISOString(),
      })

      propostEvents.emit('trend:brief', {
        from: this.name,
        to: 'ZARA',
        trends,
        analysis,
        timestamp: new Date().toISOString(),
      })

      await this.setStatus('idle')
      return { success: true, data: { trends, analysis } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private parseTrends(analysis: string): string[] {
    // Extract trend names from AI analysis text
    const lines = analysis.split('\n').filter((l) => l.trim().length > 0)
    return lines.slice(0, 5).map((l) => l.replace(/^\d+\.\s*/, '').split(':')[0].trim())
  }
}

export const scout = new SCOUT()
