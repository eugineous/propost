// ROOT — CEO of WebBoss Corp (Tier 2)
// Manages website/blog operations

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class ROOT extends BaseAgent {
  readonly name = 'ROOT'
  readonly tier = 2 as const
  readonly company = 'webboss' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[ROOT] Decomposing task ${task.id}`, { type: task.type })

      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'webboss',
          platform: task.platform ?? 'website',
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
      `WebBoss Corp status update request: ${message.content}`,
      { role: 'ROOT', company: 'webboss', platform: 'website' }
    )
    return { content: response.content, agentName: this.name }
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'blog_publish':
        return ['BUILD']
      case 'seo_audit':
        return ['CRAWL']
      case 'health_check':
        return ['SPEED', 'SHIELD']
      default:
        return ['BUILD']
    }
  }
}

export const root = new ROOT()
