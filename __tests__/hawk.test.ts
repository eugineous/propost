import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// Mock KV and DB dependencies before importing hawk
vi.mock('@/lib/agentState', () => ({
  getAgentState: vi.fn().mockResolvedValue({
    lastRunAt: '',
    lastOutcome: '',
    rateLimitCounters: { postsToday: 0, repliesToday: 0, followsToday: 0 },
    isPaused: false,
  }),
  setAgentState: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}))

vi.mock('@/lib/schema', () => ({
  agentActions: {},
}))

// Mock the hawk agent's run function directly
vi.mock('@/agents/xforce/hawk', () => ({
  run: vi.fn().mockImplementation(async (_task: string, data: Record<string, unknown>) => {
    const content = (data?.content as string) ?? ''
    const hashtags = (content.match(/#\w+/g) ?? []).length
    const hasThreat = /\b(kill|destroy|attack|bomb)\b/i.test(content)
    const hasNSFW = /\b(sex|nude|porn)\b/i.test(content)

    const blockedReasons: string[] = []
    let riskScore = 10

    if (hashtags > 2) {
      blockedReasons.push(`Too many hashtags: ${hashtags} (max 2)`)
      riskScore += hashtags * 5
    }
    if (hasThreat) {
      blockedReasons.push('Threatening language detected')
      riskScore += 30
    }
    if (hasNSFW) {
      blockedReasons.push('NSFW content detected')
      riskScore += 40
    }

    riskScore = Math.min(riskScore, 100)
    const approved = blockedReasons.length === 0 && riskScore < 70

    return {
      agentName: 'hawk',
      action: 'review',
      outcome: 'success',
      data: {
        response: JSON.stringify({
          approved,
          riskScore,
          blockedReasons,
          platform: data?.platform ?? 'x',
          contentPreview: content.slice(0, 50),
          summary: approved ? 'Content approved' : 'Content blocked',
        }),
      },
      tokensUsed: 100,
      durationMs: 50,
    }
  }),
}))

import { hawkReview } from '@/lib/hawk'

describe('HAWK content guardian', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approves clean content', async () => {
    const result = await hawkReview('Nairobi tech scene is growing fast. Thoughts?', 'x', 'blaze')
    expect(result.approved).toBe(true)
    expect(result.riskScore).toBeGreaterThanOrEqual(0)
    expect(result.riskScore).toBeLessThanOrEqual(100)
  })

  it('blocks content with more than 2 hashtags', async () => {
    const result = await hawkReview('Great post #Kenya #Nairobi #Tech #Media #Africa', 'x', 'blaze')
    expect(result.approved).toBe(false)
    expect(result.blockedReasons.length).toBeGreaterThan(0)
    expect(result.blockedReasons.some((r) => r.toLowerCase().includes('hashtag'))).toBe(true)
  })

  it('blocks threatening language', async () => {
    const result = await hawkReview('I will kill this competition', 'x', 'blaze')
    expect(result.approved).toBe(false)
    expect(result.blockedReasons.length).toBeGreaterThan(0)
  })

  it('blocks NSFW content', async () => {
    const result = await hawkReview('Check out this nude photo', 'x', 'blaze')
    expect(result.approved).toBe(false)
    expect(result.blockedReasons.length).toBeGreaterThan(0)
  })

  it('always returns riskScore in [0, 100]', async () => {
    const contents = [
      'Hello world',
      '#tag1 #tag2 #tag3 #tag4 #tag5',
      'I will kill destroy attack bomb everyone',
    ]
    for (const content of contents) {
      const result = await hawkReview(content, 'x', 'blaze')
      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(100)
    }
  })

  it('always has non-empty blockedReasons when approved is false', async () => {
    const result = await hawkReview('#a #b #c #d #e', 'x', 'blaze')
    if (!result.approved) {
      expect(result.blockedReasons.length).toBeGreaterThan(0)
    }
  })
})

// ── Property-based tests ──────────────────────────────────────

describe('Property 2: HawkDecision riskScore is always in range', () => {
  it('riskScore is always in [0, 100] for any content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }),
        async (content) => {
          const result = await hawkReview(content, 'x', 'blaze')
          expect(result.riskScore).toBeGreaterThanOrEqual(0)
          expect(result.riskScore).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('Property 3: HAWK blocks content with more than 2 hashtags', () => {
  it('always blocks when hashtag count > 2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.stringMatching(/^#[a-zA-Z]+$/), { minLength: 3, maxLength: 10 }),
        async (hashtags) => {
          const content = `Some content ${hashtags.join(' ')}`
          const result = await hawkReview(content, 'x', 'blaze')
          expect(result.approved).toBe(false)
          expect(result.blockedReasons.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('Property 7: Rejected HawkDecision always has non-empty blockedReasons', () => {
  it('blockedReasons is non-empty whenever approved is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }),
        async (content) => {
          const result = await hawkReview(content, 'x', 'blaze')
          if (!result.approved) {
            expect(result.blockedReasons.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})
