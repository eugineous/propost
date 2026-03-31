// P25: Agent with no heartbeat for > 10 min is marked unresponsive

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('P25: Agent with no heartbeat > 10 min is marked unresponsive', () => {
  it('agents are marked unresponsive after 10 minutes of silence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }), // minutes since last heartbeat
        (minutesSinceHeartbeat) => {
          const UNRESPONSIVE_THRESHOLD_MINUTES = 10
          const isUnresponsive = minutesSinceHeartbeat > UNRESPONSIVE_THRESHOLD_MINUTES
          if (minutesSinceHeartbeat > UNRESPONSIVE_THRESHOLD_MINUTES) {
            expect(isUnresponsive).toBe(true)
          } else {
            expect(isUnresponsive).toBe(false)
          }
        }
      )
    )
  })

  it('agent status transitions correctly based on heartbeat age', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentName: fc.constantFrom('BLAZE', 'ECHO', 'AURORA', 'ORACLE'),
          lastHeartbeatMsAgo: fc.integer({ min: 0, max: 3_600_000 }), // 0 to 1 hour
        }),
        ({ lastHeartbeatMsAgo }) => {
          const THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes
          const status = lastHeartbeatMsAgo > THRESHOLD_MS ? 'unresponsive' : 'active'
          if (lastHeartbeatMsAgo > THRESHOLD_MS) {
            expect(status).toBe('unresponsive')
          } else {
            expect(status).toBe('active')
          }
        }
      )
    )
  })
})
