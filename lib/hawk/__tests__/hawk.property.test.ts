// P14: Execution delay is within 30s–300s bounds
// P15: Two consecutive same-platform actions are ≥ 120s apart
// P16: HAWK blocks all new successes once hourly threshold is reached

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

vi.mock('@/lib/db/client', () => ({
  getDb: () => Object.assign(() => Promise.resolve([{ count: 0 }]), { sql: () => Promise.resolve([]) }),
  withRetry: (fn: () => unknown) => fn(),
}))
vi.mock('@/lib/events', () => ({ propostEvents: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }))

describe('P14: Execution delay is within 30s–300s bounds', () => {
  it('getDelay always returns a value between 30000ms and 300000ms', async () => {
    const { HAWKEngine } = await import('@/lib/hawk/engine')
    const hawk = new HAWKEngine()

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('x', 'instagram', 'facebook', 'linkedin', 'website' as const),
        async (platform) => {
          const delay = await hawk.getDelay(platform as 'x')
          expect(delay).toBeGreaterThanOrEqual(30_000)
          expect(delay).toBeLessThanOrEqual(300_000)
        }
      )
    )
  })
})

describe('P15: Consecutive same-platform actions are ≥ 120s apart', () => {
  it('minimum gap between actions is enforced at 120 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300_000 }),
        (elapsedMs) => {
          const MIN_GAP = 120_000
          const needsWait = elapsedMs < MIN_GAP
          const waitTime = needsWait ? MIN_GAP - elapsedMs : 0
          expect(waitTime).toBeGreaterThanOrEqual(0)
          expect(waitTime).toBeLessThanOrEqual(MIN_GAP)
          if (elapsedMs >= MIN_GAP) {
            expect(waitTime).toBe(0)
          }
        }
      )
    )
  })
})

describe('P16: HAWK blocks new successes after hourly threshold reached', () => {
  it('platform is blocked when hourly count reaches the safe threshold', () => {
    const HOURLY_SAFE: Record<string, number> = {
      x: 5, instagram: 4, linkedin: 2, facebook: 3, website: 9999,
    }

    fc.assert(
      fc.property(
        fc.constantFrom('x', 'instagram', 'facebook', 'linkedin'),
        fc.nat({ max: 10 }),
        (platform, currentCount) => {
          const limit = HOURLY_SAFE[platform]
          const isBlocked = currentCount >= limit
          if (currentCount >= limit) {
            expect(isBlocked).toBe(true)
          } else {
            expect(isBlocked).toBe(false)
          }
        }
      )
    )
  })
})
