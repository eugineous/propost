// RISK — IntelCore Tier 3 risk analyzer
// Blocks high-risk actions and requires Founder approval for dangerous operations

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo, logWarn } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

// Actions that are always blocked and require Founder approval
const BLOCKED_ACTION_TYPES = ['mass_unfollow', 'bulk_dm', 'account_deletion', 'bulk_unfollow']

export class RISK extends BaseAgent {
  readonly name = 'RISK'
  readonly tier = 3 as const
  readonly company = 'intelcore' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const actionType = taskData?.actionType as string | undefined
      const content = taskData?.content as string | undefined
      const platform = taskData?.platform as string | undefined

      // 1. Check if action is in blocked list
      if (actionType && BLOCKED_ACTION_TYPES.includes(actionType)) {
        logWarn(`[RISK] Blocked high-risk action: ${actionType}`, { taskId: task.id })
        await this.requireFounderApproval(task, actionType, content, 95)
        await this.setStatus('idle')
        return {
          success: true,
          data: {
            blocked: true,
            reason: `Action "${actionType}" requires Founder approval`,
            riskScore: 95,
          },
        }
      }

      // 2. Analyze risk score using AI Router
      const riskResponse = await aiRouter.route(
        'analyze',
        `Assess the risk score (0-100) for this social media action:
        Action type: ${actionType ?? 'unknown'}
        Platform: ${platform ?? 'unknown'}
        Content: ${content ? content.slice(0, 200) : 'N/A'}
        
        Consider: account safety, brand reputation, platform ToS compliance, audience impact.
        Respond with: RISK_SCORE: [number] followed by brief justification.`,
        { role: 'RISK', context: 'risk_assessment' }
      )

      const riskScore = this.parseRiskScore(riskResponse.content)
      logInfo(`[RISK] Risk score: ${riskScore}`, { taskId: task.id, actionType })

      // 3. Block if risk score > 60
      if (riskScore > 60) {
        await this.requireFounderApproval(task, actionType ?? 'unknown', content, riskScore)
        await this.setStatus('idle')
        return {
          success: true,
          data: {
            blocked: true,
            riskScore,
            reason: `Risk score ${riskScore} exceeds threshold of 60`,
          },
        }
      }

      await this.setStatus('idle')
      return { success: true, data: { blocked: false, riskScore } }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private parseRiskScore(text: string): number {
    const match = text.match(/RISK_SCORE:\s*(\d+)/i)
    if (match) return Math.min(100, Math.max(0, parseInt(match[1], 10)))
    // Fallback: look for any number in the response
    const numMatch = text.match(/\b(\d{1,3})\b/)
    if (numMatch) return Math.min(100, Math.max(0, parseInt(numMatch[1], 10)))
    return 50 // Default to medium risk
  }

  private async requireFounderApproval(
    task: Task,
    actionType: string,
    content: string | undefined,
    riskScore: number
  ): Promise<void> {
    const riskLevel = riskScore >= 90 ? 'critical' : riskScore >= 70 ? 'high' : 'medium'

    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO approval_queue (
          task_id, action_type, platform, agent_name,
          content, content_preview, risk_level, risk_score, status
        ) VALUES (
          ${task.id}, ${actionType}, ${(task.result as Record<string, unknown>)?.platform as string ?? null},
          ${this.name}, ${content ?? null}, ${content ? content.slice(0, 100) : null},
          ${riskLevel}, ${riskScore}, 'pending'
        )
      `
    })

    logWarn(`[RISK] Action blocked — submitted to approval queue`, {
      taskId: task.id,
      actionType,
      riskScore,
      riskLevel,
    })
  }
}

export const risk = new RISK()
