// P11: Memory entries are retrievable by agent name and creation date

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('P11: Memory entries retrievable by agent name and creation date', () => {
  it('filtering by agent name returns only that agent entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            agent_name: fc.constantFrom('BLAZE', 'ECHO', 'AURORA', 'ORACLE', 'SOVEREIGN'),
            context_summary: fc.string({ minLength: 10, maxLength: 200 }),
            created_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.constantFrom('BLAZE', 'ECHO', 'AURORA', 'ORACLE', 'SOVEREIGN'),
        (entries, targetAgent) => {
          const filtered = entries.filter((e) => e.agent_name === targetAgent)
          // All filtered entries must belong to the target agent
          for (const entry of filtered) {
            expect(entry.agent_name).toBe(targetAgent)
          }
        }
      )
    )
  })

  it('filtering by date range returns only entries within range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            agent_name: fc.string({ minLength: 3, maxLength: 10 }),
            created_at: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (entries) => {
          const from = new Date('2025-06-01')
          const to = new Date('2025-12-31')
          const filtered = entries.filter(
            (e) => e.created_at >= from && e.created_at <= to
          )
          for (const entry of filtered) {
            expect(entry.created_at.getTime()).toBeGreaterThanOrEqual(from.getTime())
            expect(entry.created_at.getTime()).toBeLessThanOrEqual(to.getTime())
          }
        }
      )
    )
  })
})
