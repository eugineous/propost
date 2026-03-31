// AURORA — CEO of GramGod Corp (Tier 2)
// Manages Instagram platform operations

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class AURORA extends BaseAgent {
  readonly name = 'AURORA'
  readonly tier = 2 as const
  readonly company = 'gramgod' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[AURORA] Decomposing task ${task.id}`, { type: task.type })

      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'gramgod',
          platform: task.platform ?? 'instagram',
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
      `GramGod Corp status update request: ${message.content}`,
      { role: 'AURORA', company: 'gramgod', platform: 'instagram' }
    )
    return { content: response.content, agentName: this.name }
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'post_content':
        return ['CAPTION']
      case 'reel_publish':
        return ['REEL']
      case 'story_publish':
        return ['STORY']
      case 'dm_response':
        return ['CHAT']
      default:
        return ['CAPTION']
    }
  }
}

export const aurora = new AURORA()
