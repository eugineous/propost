// HAWKEngine — Anti-Ban compliance engine
// Enforces per-platform rate limits, minimum action gaps, and platform halts

import type { Platform } from '../types'
import { getDb } from '../db/client'
import { propostEvents } from '../events'

export interface RateLimitStatus {
  allowed: boolean
  currentCount: number
  limit: number
  resetAt: Date
  haltedUntil?: Date
}

// Per-platform daily limits — raised for high-frequency posting
const DAILY_LIMITS: Record<Platform, number> = {
  x: 48,        // 2/hour × 24h = 48 max (HAWK will enforce safe spacing)
  instagram: 25,
  linkedin: 20,  // 2/hour during active hours
  facebook: 10,
  website: 9999,
}

// Per-platform hourly safe thresholds — 2 posts/hour for X and LinkedIn
const HOURLY_SAFE: Record<Platform, number> = {
  x: 2,          // 2 per hour — randomized timing prevents bot detection
  instagram: 4,
  linkedin: 2,   // 2 per hour
  facebook: 3,
  website: 9999,
}

// In-memory rate tracking: key = `${platform}:${hourKey}` → count
const rateMap = new Map<string, number>()

// In-memory halt map: platform → halt expiry timestamp (ms)
const haltMap = new Map<Platform, number>()

function hourKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class HAWKEngine {
  async checkRateLimit(platform: Platform): Promise<RateLimitStatus> {
    // Check halt first
    if (await this.isPlatformHalted(platform)) {
      const haltedUntil = new Date(haltMap.get(platform)!)
      return {
        allowed: false,
        currentCount: 0,
        limit: HOURLY_SAFE[platform],
        resetAt: haltedUntil,
        haltedUntil,
      }
    }

    const db = getDb()
    const now = new Date()

    // Current hour window
    const hourStart = new Date(now)
    hourStart.setUTCMinutes(0, 0, 0)
    const hourEnd = new Date(hourStart)
    hourEnd.setUTCHours(hourEnd.getUTCHours() + 1)

    // Current day window
    const dayStart = new Date(now)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    const [hourRows, dayRows] = await Promise.all([
      db`
        SELECT COUNT(*)::int AS count FROM actions
        WHERE platform = ${platform}
          AND status = 'success'
          AND timestamp >= ${hourStart.toISOString()}
          AND timestamp < ${hourEnd.toISOString()}
      `,
      db`
        SELECT COUNT(*)::int AS count FROM actions
        WHERE platform = ${platform}
          AND status = 'success'
          AND timestamp >= ${dayStart.toISOString()}
          AND timestamp < ${dayEnd.toISOString()}
      `,
    ])

    const hourCount = (hourRows as Array<{ count: number }>)[0]?.count ?? 0
    const dayCount = (dayRows as Array<{ count: number }>)[0]?.count ?? 0

    const hourLimit = HOURLY_SAFE[platform]
    const dayLimit = DAILY_LIMITS[platform]

    // Check hourly threshold breach
    if (hourCount >= hourLimit) {
      await this.haltPlatform(platform, 3600000) // 1 hour
      return {
        allowed: false,
        currentCount: hourCount,
        limit: hourLimit,
        resetAt: hourEnd,
      }
    }

    // Check daily limit
    if (dayCount >= dayLimit) {
      return {
        allowed: false,
        currentCount: dayCount,
        limit: dayLimit,
        resetAt: dayEnd,
      }
    }

    return {
      allowed: true,
      currentCount: hourCount,
      limit: hourLimit,
      resetAt: hourEnd,
    }
  }

  async recordAction(platform: Platform): Promise<void> {
    const key = `${platform}:${hourKey()}`
    rateMap.set(key, (rateMap.get(key) ?? 0) + 1)
  }

  /** Returns a random delay between 30,000ms and 300,000ms */
  async getDelay(_platform: Platform): Promise<number> {
    return Math.floor(Math.random() * (300000 - 30000) + 30000)
  }

  /** Waits if the last action on this platform was < 120s ago */
  async enforceMinGap(platform: Platform): Promise<void> {
    const db = getDb()
    const rows = await db`
      SELECT timestamp FROM actions
      WHERE platform = ${platform}
        AND status = 'success'
      ORDER BY timestamp DESC
      LIMIT 1
    `
    const last = (rows as Array<{ timestamp: Date }>)[0]?.timestamp
    if (!last) return

    const elapsed = Date.now() - new Date(last).getTime()
    // X and LinkedIn: minimum 20 minutes between posts (human-like pacing)
    // Other platforms: 120 seconds
    const minGap = (platform === 'x' || platform === 'linkedin') ? 20 * 60 * 1000 : 120_000

    if (elapsed < minGap) {
      const wait = minGap - elapsed
      await sleep(wait)
    }
  }

  /** Halt a platform for durationMs; emit alert event */
  async haltPlatform(platform: Platform, durationMs: number): Promise<void> {
    const expiry = Date.now() + durationMs
    haltMap.set(platform, expiry)

    propostEvents.emit('alert', {
      type: 'platform_halted',
      platform,
      haltedUntil: new Date(expiry).toISOString(),
      message: `HAWK: ${platform} halted for ${Math.round(durationMs / 60000)} minutes due to rate limit breach`,
    })
  }

  async isPlatformHalted(platform: Platform): Promise<boolean> {
    const expiry = haltMap.get(platform)
    if (!expiry) return false
    if (Date.now() >= expiry) {
      haltMap.delete(platform)
      return false
    }
    return true
  }
}

// Singleton export
export const hawk = new HAWKEngine()
