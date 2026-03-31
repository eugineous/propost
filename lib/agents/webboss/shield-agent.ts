// SHIELD — WebBoss Tier 3 security agent
// Alerts ROOT and SOVEREIGN on security vulnerability detection

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { propostEvents } from '../../events'
import { logInfo, logWarn } from '../../logger'
import type { Task } from '../../types'

export class SHIELD extends BaseAgent {
  readonly name = 'SHIELD'
  readonly tier = 3 as const
  readonly company = 'webboss' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const securityReport = taskData?.report as string | undefined
      const vulnerabilityType = taskData?.vulnerabilityType as string | undefined

      logInfo(`[SHIELD] Running security check`, { taskId: task.id })

      // Analyze security posture using AI Router
      const analysisResponse = await aiRouter.route(
        'analyze',
        `Perform a security assessment for a Next.js 14 web application. Check for:
        1. Common web vulnerabilities (XSS, CSRF, injection)
        2. API endpoint security
        3. Authentication and authorization issues
        4. Dependency vulnerabilities
        5. Environment variable exposure risks
        ${securityReport ? `Additional context: ${securityReport}` : ''}
        Classify severity as: critical, high, medium, or low.`,
        { role: 'SHIELD', platform: 'website' }
      )

      const analysis = analysisResponse.content
      const severity = this.detectSeverity(analysis, vulnerabilityType)

      if (severity === 'critical' || severity === 'high') {
        logWarn(`[SHIELD] Security vulnerability detected: ${severity}`, {
          taskId: task.id,
          vulnerabilityType,
        })

        // Alert ROOT and SOVEREIGN
        propostEvents.emit('alert', {
          type: 'security_vulnerability',
          agentName: this.name,
          company: this.company,
          platform: 'website',
          severity,
          vulnerabilityType: vulnerabilityType ?? 'unknown',
          message: `Security vulnerability detected (${severity}): ${analysis.slice(0, 200)}`,
          notifyAgents: ['ROOT', 'SOVEREIGN'],
          timestamp: new Date().toISOString(),
        })
      }

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          severity,
          analysis,
          alertSent: severity === 'critical' || severity === 'high',
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private detectSeverity(
    analysis: string,
    vulnerabilityType?: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const lower = (analysis + ' ' + (vulnerabilityType ?? '')).toLowerCase()
    if (lower.includes('critical') || lower.includes('remote code execution') || lower.includes('sql injection')) {
      return 'critical'
    }
    if (lower.includes('high') || lower.includes('xss') || lower.includes('csrf') || lower.includes('authentication')) {
      return 'high'
    }
    if (lower.includes('medium') || lower.includes('information disclosure')) {
      return 'medium'
    }
    return 'low'
  }
}

export const shield = new SHIELD()
