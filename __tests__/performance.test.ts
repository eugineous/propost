import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculatePerformanceScore, classifyPerformance } from '@/lib/performance'
import type { PostMetrics } from '@/lib/types'

// ── Unit tests ────────────────────────────────────────────────

describe('calculatePerformanceScore', () => {
  it('computes the exact formula', () => {
    const metrics: PostMetrics = {
      impressions: 1000,
      likes: 50,
      reposts: 10,
      replies: 20,
      newFollowers: 5,
    }
    // (1000 × 0.1) + (50 × 2) + (10 × 5) + (20 × 3) + (5 × 20)
    // = 100 + 100 + 50 + 60 + 100 = 410
    expect(calculatePerformanceScore(metrics)).toBe(410)
  })

  it('returns 0 for all-zero metrics', () => {
    expect(calculatePerformanceScore({ impressions: 0, likes: 0, reposts: 0, replies: 0, newFollowers: 0 })).toBe(0)
  })

  it('boundary: score exactly 500 → GOOD', () => {
    // newFollowers × 20 = 500 → 25 new followers
    const score = calculatePerformanceScore({ impressions: 0, likes: 0, reposts: 0, replies: 0, newFollowers: 25 })
    expect(score).toBe(500)
    expect(classifyPerformance(score)).toBe('GOOD')
  })

  it('boundary: score 501 → VIRAL', () => {
    const score = calculatePerformanceScore({ impressions: 0, likes: 0, reposts: 0, replies: 0, newFollowers: 26 })
    expect(score).toBeGreaterThan(500)
    expect(classifyPerformance(score)).toBe('VIRAL')
  })

  it('boundary: score 100 → GOOD', () => {
    const score = calculatePerformanceScore({ impressions: 0, likes: 50, reposts: 0, replies: 0, newFollowers: 0 })
    expect(score).toBe(100)
    expect(classifyPerformance(score)).toBe('GOOD')
  })

  it('boundary: score 99 → WEAK', () => {
    const score = calculatePerformanceScore({ impressions: 0, likes: 49, reposts: 0, replies: 1, newFollowers: 0 })
    // (49 × 2) + (1 × 3) = 98 + 3 = 101 — adjust
    const score2 = calculatePerformanceScore({ impressions: 0, likes: 49, reposts: 0, replies: 0, newFollowers: 0 })
    expect(score2).toBe(98)
    expect(classifyPerformance(score2)).toBe('WEAK')
  })
})

describe('classifyPerformance', () => {
  it('classifies VIRAL for score > 500', () => {
    expect(classifyPerformance(501)).toBe('VIRAL')
    expect(classifyPerformance(10000)).toBe('VIRAL')
  })

  it('classifies GOOD for score 100–500', () => {
    expect(classifyPerformance(100)).toBe('GOOD')
    expect(classifyPerformance(300)).toBe('GOOD')
    expect(classifyPerformance(500)).toBe('GOOD')
  })

  it('classifies WEAK for score < 100', () => {
    expect(classifyPerformance(0)).toBe('WEAK')
    expect(classifyPerformance(99)).toBe('WEAK')
  })
})

// ── Property-based tests ──────────────────────────────────────

describe('Property 19: PerformanceScore formula is exact', () => {
  it('matches manual calculation for any non-negative inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (impressions, likes, reposts, replies, newFollowers) => {
          const expected = impressions * 0.1 + likes * 2 + reposts * 5 + replies * 3 + newFollowers * 20
          const actual = calculatePerformanceScore({ impressions, likes, reposts, replies, newFollowers })
          expect(actual).toBeCloseTo(expected, 10)
        }
      )
    )
  })
})

describe('Property 20: PerformanceScore is always non-negative', () => {
  it('returns non-negative for any non-negative inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (impressions, likes, reposts, replies, newFollowers) => {
          const score = calculatePerformanceScore({ impressions, likes, reposts, replies, newFollowers })
          expect(score).toBeGreaterThanOrEqual(0)
        }
      )
    )
  })
})

describe('Property 21: Performance tier classification covers all scores', () => {
  it('VIRAL for any score > 500', () => {
    fc.assert(
      fc.property(fc.integer({ min: 501, max: 1_000_000 }), (score) => {
        expect(classifyPerformance(score)).toBe('VIRAL')
      })
    )
  })

  it('GOOD for any score in [100, 500]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 500 }), (score) => {
        expect(classifyPerformance(score)).toBe('GOOD')
      })
    )
  })

  it('WEAK for any score < 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (score) => {
        expect(classifyPerformance(score)).toBe('WEAK')
      })
    )
  })
})
