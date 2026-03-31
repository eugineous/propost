// SOVEREIGN — Tier 1, IntelCore
// Supreme orchestrator: parses Founder commands, dispatches tasks to CEO agents

import { BaseAgent, type TaskResult } from './base'
import { aiRouter } from '../ai/router'
import { taskOrchestrator } from '../tasks/orchestrator'
import { logInfo, logError } from '../logger'
import { propostEvents } from '../events'
import type { Task, FounderMessage, AgentResponse, Company } from '../types'

// Map company names to their CEO agent names
const CEO_AGENTS: Record<string, string> = {
  xforce: 'ZARA',
  linkedelite: 'NOVA',
  gramgod: 'AURORA',
  pagepower: 'CHIEF',
  webboss: 'ROOT',
  intelcore: 'ORACLE',
}

// Keywords that indicate which company should handle a task
const COMPANY_KEYWORDS: Record<string, string[]> = {
  xforce: ['x', 'twitter', 'tweet', 'thread', 'xforce'],
  linkedelite: ['linkedin', 'professional', 'network', 'connection', 'linkedelite'],
  gramgod: ['instagram', 'reel', 'story', 'caption', 'gramgod', 'ig'],
  pagepower: ['facebook', 'page', 'community', 'fb', 'pagepower'],
  webboss: ['website', 'blog', 'seo', 'web', 'webboss', 'speed', 'security'],
  intelcore: ['trend', 'analyze', 'intel', 'report', 'analytics', 'intelcore'],
}

export class SOVEREIGN extends BaseAgent {
  readonly name = 'SOVEREIGN'
  readonly tier = 1 as const
  readonly company = 'intelcore' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[SOVEREIGN] Executing task ${task.id}`, { type: task.type })

      const plan = await aiRouter.route(
        'plan',
        `Execute task: ${task.type} for company ${task.company}`,
        { role: 'SOVEREIGN', taskId: task.id, taskType: task.type }
      )

      // Dispatch to appropriate CEO based on task company
      if (task.company !== 'system') {
        await this.dispatchToCEO(task.company, {
          parentTaskId: task.id,
          type: task.type,
          platform: task.platform,
          contentPillar: task.contentPillar,
        })
      }

      await this.setStatus('idle')
      return { success: true, data: { plan: plan.content } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  async receiveMessage(message: FounderMessage): Promise<AgentResponse> {
    logInfo(`[SOVEREIGN] Received founder command`, { content: message.content })
    await this.setStatus('active')

    try {
      // Use AI Router to generate a structured action plan
      const planResponse = await aiRouter.route(
        'plan',
        message.content,
        { role: 'SOVEREIGN', context: 'founder_command' }
      )

      const plan = planResponse.content

      // Identify which companies are involved based on keywords in the message
      const involvedCompanies = this.identifyCompanies(message.content + ' ' + plan)

      // Create tasks for each relevant company
      const taskIds: string[] = []
      for (const company of involvedCompanies) {
        const task = await taskOrchestrator.createTask({
          type: 'report_generate',
          company: company as Company,
          priority: 1,
          assignedAgent: CEO_AGENTS[company],
        })
        taskIds.push(task.id)
        logInfo(`[SOVEREIGN] Dispatched task to ${CEO_AGENTS[company]}`, { taskId: task.id, company })
      }

      // Emit activity event
      propostEvents.emit('activity', {
        type: 'task_complete',
        agentName: this.name,
        company: this.company,
        contentPreview: plan.slice(0, 100),
        timestamp: new Date().toISOString(),
      })

      await this.setStatus('idle')

      return {
        content: plan,
        agentName: this.name,
        taskId: taskIds[0],
      }
    } catch (err) {
      this.handleError(err)
      await this.setStatus('error')
      return {
        content: `SOVEREIGN encountered an error processing your command: ${err instanceof Error ? err.message : String(err)}`,
        agentName: this.name,
      }
    }
  }

  /** Identify which companies are relevant based on message content */
  private identifyCompanies(text: string): string[] {
    const lower = text.toLowerCase()
    const found: string[] = []

    for (const [company, keywords] of Object.entries(COMPANY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        found.push(company)
      }
    }

    // Default to all companies if none identified
    if (found.length === 0) {
      return Object.keys(CEO_AGENTS)
    }

    return found
  }

  /** Dispatch a task to a CEO agent for a given company */
  private async dispatchToCEO(company: string, taskSpec: Record<string, unknown>): Promise<void> {
    const ceoName = CEO_AGENTS[company]
    if (!ceoName) {
      logError(`[SOVEREIGN] No CEO found for company: ${company}`)
      return
    }

    const task = await taskOrchestrator.createTask({
      type: (taskSpec.type as string) as import('../types').TaskType || 'report_generate',
      company: company as Company,
      platform: taskSpec.platform as import('../types').Platform | undefined,
      contentPillar: taskSpec.contentPillar as import('../types').ContentPillar | undefined,
      parentTaskId: taskSpec.parentTaskId as string | undefined,
      priority: 1,
      assignedAgent: ceoName,
    })

    logInfo(`[SOVEREIGN] Dispatched to CEO ${ceoName}`, { taskId: task.id, company })
  }
}

export const sovereign = new SOVEREIGN()
