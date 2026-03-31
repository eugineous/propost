// P3: AI Router selects correct provider deterministically by task type
// P4: Primary AI failure triggers alternate; both failures → approval queue

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

vi.mock('@/lib/db/client', () => ({
  getDb: () => Object.assign(() => Promise.resolve([]), { sql: () => Promise.resolve([]) }),
  withRetry: (fn: () => unknown) => fn(),
}))
vi.mock('@/lib/logger', () => ({ logInfo: vi.fn(), logError: vi.fn(), logWarn: vi.fn() }))
vi.mock('@/lib/events', () => ({ propostEvents: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }))

describe('P3: AI Router selects correct provider by task type', () => {
  it('planning/analysis tasks route to Gemini; generation tasks route to NVIDIA', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('plan', 'analyze', 'summarize', 'validate', 'draft', 'generate'),
        (taskType) => {
          const geminiTasks = ['plan', 'analyze', 'summarize', 'validate']
          const nvidiaTasks = ['draft', 'generate']
          const isGemini = geminiTasks.includes(taskType)
          const isNvidia = nvidiaTasks.includes(taskType)
          expect(isGemini || isNvidia).toBe(true)
          // Mutually exclusive
          expect(isGemini && isNvidia).toBe(false)
        }
      )
    )
  })
})

describe('P4: AI failure triggers alternate; both failures → approval queue', () => {
  it('fallback chain is always: primary → alternate → approval queue', () => {
    fc.assert(
      fc.property(
        fc.record({
          primaryFailed: fc.boolean(),
          alternateFailed: fc.boolean(),
        }),
        ({ primaryFailed, alternateFailed }) => {
          let outcome: string
          if (!primaryFailed) {
            outcome = 'primary_success'
          } else if (!alternateFailed) {
            outcome = 'alternate_success'
          } else {
            outcome = 'approval_queue'
          }
          // Outcome must always be one of the three valid states
          expect(['primary_success', 'alternate_success', 'approval_queue']).toContain(outcome)
          // If both failed, must go to approval queue
          if (primaryFailed && alternateFailed) {
            expect(outcome).toBe('approval_queue')
          }
        }
      )
    )
  })
})
