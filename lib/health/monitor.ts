// HealthMonitor — Tier 5, system
// Monitors platform connections, agent heartbeats, and database connectivity

import { getPlatformAdapter } from '../platforms/index'
import { getDb, withRetry } from '../db/client'
import { propostEvents } from '../events'
import { logInfo, logWarn, logError } from '../logger'
import type { Platform } from '../types'

const ALL_PLATFORMS: Platform[] = ['x', 'instagram', 'facebook', 'linkedin', 'website']
const AGENT_HEARTBEAT_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const DB_ALERT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

let dbUnavailableSince: Date | null = null

export class HealthMonitor {
  private platformInterval: ReturnType<typeof setInterval> | null = null
  private agentInterval: ReturnType<typeof setInterval> | null = null
  private dbInterval: ReturnType<typeof setInterval> | null = null

  /** Check all platform connections and update platform_connections table */
  async checkAllPlatforms(): Promise<void> {
    logInfo('[HealthMonitor] Checking all platform connections')

    for (const platform of ALL_PLATFORMS) {
      try {
        const adapter = getPlatformAdapter(platform)
        const connected = await adapter.verifyCredentials()

        await withRetry(async () => {
          const db = getDb()
          await db`
            INSERT INTO platform_connections (platform, status, last_verified, updated_at)
            VALUES (${platform}, ${connected ? 'connected' : 'error'}, NOW(), NOW())
            ON CONFLICT (platform) DO UPDATE
              SET status = EXCLUDED.status,
                  last_verified = NOW(),
                  updated_at = NOW(),
                  error_message = ${connected ? null : 'Credential verification failed'}
          `
        })

        if (!connected) {
          propostEvents.emit('alert', {
            type: 'platform_disconnected',
            platform,
            message: `Platform ${platform} connection check failed`,
            timestamp: new Date().toISOString(),
          })
        }

        logInfo(`[HealthMonitor] ${platform}: ${connected ? 'connected' : 'disconnected'}`)
      } catch (err) {
        logError(`[HealthMonitor] Failed to check ${platform}`, err)
      }
    }
  }

  /** Mark agents as unresponsive if no heartbeat in > 10 minutes */
  async checkAgentHeartbeats(): Promise<void> {
    try {
      const db = getDb()
      const cutoff = new Date(Date.now() - AGENT_HEARTBEAT_TIMEOUT_MS)

      const staleAgents = await db`
        SELECT name, last_heartbeat, status
        FROM agents
        WHERE last_heartbeat < ${cutoff.toISOString()}
          AND status NOT IN ('unresponsive', 'paused')
      `

      for (const agent of staleAgents as Array<{ name: string; last_heartbeat: Date; status: string }>) {
        logWarn(`[HealthMonitor] Agent ${agent.name} unresponsive since ${agent.last_heartbeat}`)

        await withRetry(async () => {
          const db2 = getDb()
          await db2`
            UPDATE agents SET status = 'unresponsive' WHERE name = ${agent.name}
          `
        })

        propostEvents.emit('agent:status', { agentName: agent.name, status: 'unresponsive' })
        propostEvents.emit('alert', {
          type: 'agent_unresponsive',
          agentName: agent.name,
          lastHeartbeat: agent.last_heartbeat,
          message: `Agent ${agent.name} has not sent a heartbeat in over 10 minutes`,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (err) {
      logError('[HealthMonitor] Failed to check agent heartbeats', err)
    }
  }

  /** Check DB connectivity; alert if unavailable > 5 minutes */
  async checkDatabase(): Promise<void> {
    try {
      const db = getDb()
      await db`SELECT 1`

      if (dbUnavailableSince) {
        logInfo('[HealthMonitor] Database connectivity restored')
        dbUnavailableSince = null
      }
    } catch (err) {
      if (!dbUnavailableSince) {
        dbUnavailableSince = new Date()
        logError('[HealthMonitor] Database connectivity lost', err)
      }

      const unavailableMs = Date.now() - dbUnavailableSince.getTime()
      if (unavailableMs >= DB_ALERT_TIMEOUT_MS) {
        propostEvents.emit('db:critical', {
          message: `Database has been unavailable for ${Math.round(unavailableMs / 60000)} minutes`,
          since: dbUnavailableSince.toISOString(),
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  /** Start all monitoring intervals */
  startMonitoring(): void {
    logInfo('[HealthMonitor] Starting monitoring intervals')

    // Platform check every 5 minutes
    this.platformInterval = setInterval(() => {
      this.checkAllPlatforms().catch((err) =>
        logError('[HealthMonitor] Platform check error', err)
      )
    }, 5 * 60 * 1000)

    // Agent heartbeat check every 2 minutes
    this.agentInterval = setInterval(() => {
      this.checkAgentHeartbeats().catch((err) =>
        logError('[HealthMonitor] Agent heartbeat check error', err)
      )
    }, 2 * 60 * 1000)

    // DB check every 2 minutes
    this.dbInterval = setInterval(() => {
      this.checkDatabase().catch((err) =>
        logError('[HealthMonitor] DB check error', err)
      )
    }, 2 * 60 * 1000)

    // Run initial checks
    this.checkAllPlatforms().catch((err) => logError('[HealthMonitor] Initial platform check failed', err))
    this.checkAgentHeartbeats().catch((err) => logError('[HealthMonitor] Initial heartbeat check failed', err))
    this.checkDatabase().catch((err) => logError('[HealthMonitor] Initial DB check failed', err))
  }

  /** Stop all monitoring intervals */
  stopMonitoring(): void {
    if (this.platformInterval) clearInterval(this.platformInterval)
    if (this.agentInterval) clearInterval(this.agentInterval)
    if (this.dbInterval) clearInterval(this.dbInterval)
    this.platformInterval = null
    this.agentInterval = null
    this.dbInterval = null
    logInfo('[HealthMonitor] Monitoring stopped')
  }
}

export const healthMonitor = new HealthMonitor()
