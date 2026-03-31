// CHIEF — CEO of PagePower Corp (Tier 2)
// Manages Facebook platform operations

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class CHIEF extends BaseAgent {
  readonly name = 'CHIEF'
  readonly tier = 2 as const
  readonly company = 'pagepower' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[CHIEF] Decomposing task ${task.id}`, { type: task.type })

      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'pagepower',
          platform: task.platform ?? 'facebook',
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
      `PagePower Corp status update request: ${message.content}`,
      { role: 'CHIEF', company: 'pagepower', platform: 'facebook' }
    )
    return { content: response.content, agentName: this.name }
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'post_content':
        return ['REACH']
      case 'reply':
      case 'dm_response':
        return ['COMMUNITY']
      case 'analytics_pull':
        return ['PULSE']
      default:
        return ['REACH']
    }
  }
}

export const chief = new CHIEF()
