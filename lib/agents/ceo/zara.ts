// ZARA — CEO of XForce Corp (Tier 2)
// Manages X platform operations. When content is pre-loaded on the task,
// executes directly via BLAZE. Otherwise decomposes to Tier 3 agents.

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { taskOrchestrator } from '../../tasks/orchestrator'
import { logInfo } from '../../logger'
import { blaze } from '../xforce/post-executor'
import type { Task, FounderMessage, AgentResponse } from '../../types'

export class ZARA extends BaseAgent {
  readonly name = 'ZARA'
  readonly tier = 2 as const
  readonly company = 'xforce' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[ZARA] Executing task ${task.id}`, { type: task.type })

      // If content is already on the task, execute directly via BLAZE
      const taskData = task.result as Record<string, unknown> | undefined
      if (taskData?.content) {
        logInfo(`[ZARA] Content pre-loaded, delegating directly to BLAZE`)
        const result = await blaze.execute(task)
        await this.setStatus('idle')
        return result
      }

      // Otherwise decompose into sub-tasks for Tier 3 agents
      const subTasks = this.getSubTaskAgents(task.type)
      for (const agentName of subTasks) {
        await taskOrchestrator.createTask({
          type: task.type,
          company: 'xforce',
          platform: task.platform ?? 'x',
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
      `XForce Corp status update request: ${message.content}`,
      { role: 'ZARA', company: 'xforce', platform: 'x' }
    )
    return { content: response.content, agentName: this.name }
  }

  private getSubTaskAgents(taskType: string): string[] {
    switch (taskType) {
      case 'post_content':
      case 'thread_publish':
        return ['BLAZE']
      case 'reply':
        return ['ECHO']
      case 'trend_analysis':
        return ['SCOUT']
      default:
        return ['BLAZE']
    }
  }
}

export const zara = new ZARA()
