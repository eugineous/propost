// SPEED — WebBoss Tier 3 speed monitor
// Alerts ROOT and SOVEREIGN when response time > 3s for 3 consecutive checks

import { BaseAgent, type TaskResult } from '../base'
import { propostEvents } from '../../events'
import { logInfo, logWarn } from '../../logger'
import type { Task } from '../../types'

const RESPONSE_TIME_THRESHOLD_MS = 3000
const CONSECUTIVE_FAILURES_THRESHOLD = 3

// In-memory tracking of consecutive slow checks
let consecutiveSlowChecks = 0

export class SPEED extends BaseAgent {
  readonly name = 'SPEED'
  readonly tier = 3 as const
  readonly company = 'webboss' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const targetUrl = (taskData?.url as string) ?? 'https://euginemicah.com'

      logInfo(`[SPEED] Checking response time for ${targetUrl}`)

      const responseTime = await this.measureResponseTime(targetUrl)
      logInfo(`[SPEED] Response time: ${responseTime}ms`, { url: targetUrl })

      if (responseTime > RESPONSE_TIME_THRESHOLD_MS) {
        consecutiveSlowChecks++
        logWarn(`[SPEED] Slow response detected (${responseTime}ms). Consecutive: ${consecutiveSlowChecks}`)

        if (consecutiveSlowChecks >= CONSECUTIVE_FAILURES_THRESHOLD) {
          // Alert ROOT and SOVEREIGN
          propostEvents.emit('alert', {
            type: 'performance_degradation',
            agentName: this.name,
            company: this.company,
            platform: 'website',
            message: `Website response time exceeded ${RESPONSE_TIME_THRESHOLD_MS}ms for ${consecutiveSlowChecks} consecutive checks. Current: ${responseTime}ms`,
            notifyAgents: ['ROOT', 'SOVEREIGN'],
            responseTime,
            consecutiveSlowChecks,
            url: targetUrl,
            timestamp: new Date().toISOString(),
          })

          consecutiveSlowChecks = 0 // Reset after alerting
        }
      } else {
        consecutiveSlowChecks = 0 // Reset on healthy check
      }

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          responseTime,
          healthy: responseTime <= RESPONSE_TIME_THRESHOLD_MS,
          consecutiveSlowChecks,
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async measureResponseTime(url: string): Promise<number> {
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      await fetch(url, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeout)
    } catch {
      // Timeout or network error counts as slow
    }
    return Date.now() - start
  }
}

export const speed = new SPEED()
