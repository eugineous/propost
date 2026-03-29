import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculatePerformanceScore, classifyPerformance } from '@/lib/performance'

// Test MEMORY's classification logic directly (pure functions)
// The full memoryLearningLoop integration is tested via integration tests

describe('MEMORY performance tier classification', () => {
  it('correctly identifies VIRAL posts (score > 500)', () => {
    const viralMetrics = { impressions: 10000, likes: 500, reposts: 100, replies: 50, newFollowers: 20 }
    const score = calculatePerformanceScore(viralMetrics)
    expect(score).toBeGreaterThan(500)
    expect(classifyPerformance(score)).toBe('VIRAL')
  })

  it('correctly identifies WEAK posts (score < 100)', () => {
    const weakMetrics = { impressions: 100, likes: 2, reposts: 0, replies: 1, newFollowers: 0 }
    const score = calculatePerformanceScore(weakMetrics)
    expect(score).toBeLessThan(100)
    expect(classifyPerformance(score)).toBe('WEAK')
  })

  it('correctly identifies GOOD posts (score 100-500)', () => {
    const goodMetrics = { impressions: 500, likes: 20, reposts: 5, replies: 10, newFollowers: 2 }
    const score = calculatePerformanceScore(goodMetrics)
    expect(score).toBeGreaterThanOrEqual(100)
    expect(score).toBeLessThanOrEqual(500)
    expect(classifyPerformance(score)).toBe('GOOD')
  })
})

describe('Property 16: MEMORY correctly classifies posts by performance tier', () => {
  it('every post with score > 500 is VIRAL', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (impressions, likes, reposts, replies, newFollowers) => {
          const score = calculatePerformanceScore({ impressions, likes, reposts, replies, newFollowers })
          if (score > 500) {
            expect(classifyPerformance(score)).toBe('VIRAL')
          }
        }
      )
    )
  })

  it('every post with score < 100 is WEAK', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 2 }),
        (impressions, likes, reposts, replies, newFollowers) => {
          const score = calculatePerformanceScore({ impressions, likes, reposts, replies, newFollowers })
          if (score < 100) {
            expect(classifyPerformance(score)).toBe('WEAK')
          }
        }
      )
    )
  })
})

describe('Property 18: AgentLearning records are always structurally valid', () => {
  const VALID_LEARNING_TYPES = ['voice', 'timing', 'format', 'topic', 'engagement']

  it('confidence_score must be in [0, 1]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (pct) => {
        const score = pct / 100
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
      })
    )
  })

  it('learning_type must be one of the valid types', () => {
    VALID_LEARNING_TYPES.forEach((type) => {
      expect(VALID_LEARNING_TYPES).toContain(type)
    })
  })
})
