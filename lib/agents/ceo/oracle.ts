// ORACLE — CEO of IntelCore Corp (Tier 2)
// Manages intelligence, analytics, and cross-platform strategy

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class ORACLE extends BaseAgent {
  readonly name = 'ORACLE'
  readonly tier = 2 as const
  readonly company = 'intelcore' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[ORACLE] Decomposing task ${task.id}`, { type: task.type })

      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'intelcore',
          platform: task.platform,
          contentPillar: task.contentPillar,
          parentTaskId: task.id,
          priority: task.priority,
          assignedAgent: agentName,
        })
      }

      await this.setStatus('idle')
      return { success: true, data: { decomposedTo: subTasks } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  async receiveMessage(message: FounderMessage): Promise<AgentResponse> {
    const response = await aiRouter.route(
      'summarize',
      `IntelCore Corp status update request: ${message.content}`,
      { role: 'ORACLE', company: 'intelcore' }
    )
    return { content: response.content, agentName: this.name }
  }

  /** Generate a cross-platform strategic brief using AI analysis */
  async generateStrategicBrief(): Promise<string> {
    const response = await aiRouter.route(
      'analyze',
      'Generate a cross-platform strategic brief covering all 6 companies: XForce (X), LinkedElite (LinkedIn), GramGod (Instagram), PagePower (Facebook), WebBoss (Website), IntelCore (Intelligence). Include performance insights, trending opportunities, and recommended actions.',
      { role: 'ORACLE', context: 'strategic_brief', companies: ['xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore'] }
    )
    return response.content
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'trend_analysis':
        return ['SENTRY']
      case 'memory_store':
        return ['MEMORY']
      case 'report_generate':
        return ['SENTRY', 'MEMORY']
      case 'health_check':
        return ['RISK']
      default:
        return ['SENTRY']
    }
  }
}

export const oracle = new ORACLE()
