// MEMORY — IntelCore Tier 3 memory agent
// Records significant action context to Memory Store

import { BaseAgent, type TaskResult } from '../base'
import { memoryStore } from '../../memory/store'
import { logInfo } from '../../logger'
import type { Task, Platform } from '../../types'

export class MEMORY extends BaseAgent {
  readonly name = 'MEMORY'
  readonly tier = 3 as const
  readonly company = 'intelcore' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined

      const agentName = (taskData?.agentName as string) ?? 'SYSTEM'
      const contextSummary = (taskData?.contextSummary as string) ?? this.buildContextSummary(task)
      const relatedActionIds = taskData?.relatedActionIds as string[] | undefined
      const platform = taskData?.platform as Platform | undefined
      const tags = taskData?.tags as string[] | undefined

      logInfo(`[MEMORY] Recording context for agent: ${agentName}`, {
        taskId: task.id,
        platform,
        tags,
      })

      const entryId = await memoryStore.store({
        agentName,
        contextSummary,
        relatedActionIds,
        platform,
        tags: tags ?? this.buildTags(task),
      })

      await this.setStatus('idle')
      return { success: true, data: { entryId, agentName, contextSummary } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private buildContextSummary(task: Task): string {
    return `Task ${task.type} for ${task.company}${task.platform ? ` on ${task.platform}` : ''} completed at ${new Date().toISOString()}`
  }

  private buildTags(task: Task): string[] {
    const tags: string[] = [task.type, task.company]
    if (task.platform) tags.push(task.platform)
    if (task.contentPillar) tags.push(task.contentPillar)
    return tags
  }
}

export const memory = new MEMORY()
