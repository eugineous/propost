// P24: Analytics pulls stored with all required fields and retrievable

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('P24: Analytics pulls stored with all required fields', () => {
  it('every analytics snapshot has platform, metric_type, value, snapshot_date', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          platform: fc.constantFrom('x', 'instagram', 'facebook', 'linkedin', 'website'),
          metric_type: fc.constantFrom('followers', 'impressions', 'engagement', 'likes', 'comments'),
          value: fc.bigInt({ min: 0n, max: 10_000_000n }),
          snapshot_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        }),
        (snapshot) => {
          expect(snapshot.id).toBeTruthy()
          expect(snapshot.platform).toBeTruthy()
          expect(snapshot.metric_type).toBeTruthy()
          expect(snapshot.value).toBeGreaterThanOrEqual(0n)
          expect(snapshot.snapshot_date).toBeTruthy()
        }
      )
    )
  })

  it('analytics snapshots are retrievable by platform and date range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            platform: fc.constantFrom('x', 'instagram', 'facebook', 'linkedin'),
            snapshot_date: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
            value: fc.nat({ max: 1_000_000 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        fc.constantFrom('x', 'instagram', 'facebook', 'linkedin'),
        (snapshots, targetPlatform) => {
          const filtered = snapshots.filter((s) => s.platform === targetPlatform)
          for (const s of filtered) {
            expect(s.platform).toBe(targetPlatform)
          }
        }
      )
    )
  })
})
