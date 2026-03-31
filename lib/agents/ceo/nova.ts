// NOVA — CEO of LinkedElite Corp (Tier 2)
// Manages LinkedIn platform operations. When content is pre-loaded on the task,
// executes directly via ORATOR. Otherwise decomposes to Tier 3 agents.

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import { orator } from '../linkedelite/content-creator'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class NOVA extends BaseAgent {
  readonly name = 'NOVA'
  readonly tier = 2 as const
  readonly company = 'linkedelite' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[NOVA] Executing task ${task.id}`, { type: task.type })

      // If content is already on the task, execute directly via ORATOR
      const taskData = task.result as Record<string, unknown> | undefined
      if (taskData?.content) {
        logInfo(`[NOVA] Content pre-loaded, delegating directly to ORATOR`)
        const result = await orator.execute(task)
        await this.setStatus('idle')
        return result
      }

      // Otherwise decompose into sub-tasks for Tier 3 agents
      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'linkedelite',
          platform: task.platform ?? 'linkedin',
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
      `LinkedElite Corp status update request: ${message.content}`,
      { role: 'NOVA', company: 'linkedelite', platform: 'linkedin' }
    )
    return { content: response.content, agentName: this.name }
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'post_content':
      case 'article_publish':
        return ['ORATOR']
      case 'dm_response':
        return ['BRIDGE']
      default:
        return ['ORATOR']
    }
  }
}

export const nova = new NOVA()
