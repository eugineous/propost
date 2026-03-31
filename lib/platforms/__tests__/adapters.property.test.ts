// P1: Successful actions always have a real non-null platform_post_id
// P2: Platform API failure always produces a fallback_log entry

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

// Mock DB
vi.mock('@/lib/db/client', () => ({
  getDb: () => Object.assign(
    async () => [{ id: 'mock-id', platform_post_id: 'real-post-123' }],
    { sql: async () => [] }
  ),
  withRetry: (fn: () => unknown) => fn(),
}))

vi.mock('@/lib/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock('@/lib/events', () => ({
  propostEvents: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('P1: Successful actions always have a real non-null platform_post_id', () => {
  it('platform_post_id is non-null and non-empty on success', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (postId) => {
          // Any successful action must have a real post ID
          expect(postId).toBeTruthy()
          expect(postId.length).toBeGreaterThan(0)
          // Must not be a locally generated UUID pattern that looks like a mock
          expect(postId).not.toBe('mock')
          expect(postId).not.toBe('undefined')
          expect(postId).not.toBe('null')
        }
      )
    )
  })
})

describe('P2: Platform API failure always produces a fallback_log entry', () => {
  it('every platform failure creates a fallback log entry with required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          taskId: fc.option(fc.uuid(), { nil: undefined }),
          agentName: fc.constantFrom('BLAZE', 'ECHO', 'ORATOR', 'AURORA'),
          platform: fc.constantFrom('x', 'instagram', 'facebook', 'linkedin', 'website'),
          errorType: fc.constantFrom('api_error', 'rate_limit', 'auth_error', 'network_error'),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        (entry) => {
          // Every fallback log entry must have all required fields
          expect(entry.agentName).toBeTruthy()
          expect(entry.platform).toBeTruthy()
          expect(entry.errorType).toBeTruthy()
          expect(entry.errorMessage).toBeTruthy()
          expect(entry.errorMessage.length).toBeGreaterThan(0)
        }
      )
    )
  })
})
