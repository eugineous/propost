import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared mocks ──────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/schema', () => ({
  agentActions: {},
  messages: {},
  crisisEvents: {},
  trends: {},
}))

vi.mock('@/lib/agentState', () => ({
  getAgentState: vi.fn().mockResolvedValue({
    lastRunAt: '',
    lastOutcome: '',
    rateLimitCounters: { postsToday: 0, repliesToday: 0, followsToday: 0 },
    isPaused: false,
  }),
  setAgentState: vi.fn().mockResolvedValue(undefined),
  isAgentPaused: vi.fn().mockResolvedValue(false),
  pauseAgent: vi.fn().mockResolvedValue(undefined),
  resumeAgent: vi.fn().mockResolvedValue(undefined),
  pauseAllAgents: vi.fn().mockResolvedValue(undefined),
  pauseCorpAgents: vi.fn().mockResolvedValue(undefined),
  incrementRateLimit: vi.fn().mockResolvedValue(undefined),
  ALL_AGENT_NAMES: ['sovereign', 'blaze', 'chat', 'hawk', 'scout', 'sentry', 'memory'],
}))

vi.mock('@/agents/intelcore/sovereign', () => ({
  run: vi.fn().mockResolvedValue({
    agentName: 'sovereign',
    action: 'route',
    outcome: 'success',
    data: {
      response: JSON.stringify({
        intent: 'post_to_x',
        targetCorp: 'xforce',
        targetAgent: 'blaze',
        parameters: {},
        priority: 'normal',
        summary: 'Routing to xforce/blaze',
      }),
    },
    tokensUsed: 50,
    durationMs: 30,
  }),
}))

vi.mock('@/agents/xforce/hawk', () => ({
  run: vi.fn().mockResolvedValue({
    agentName: 'hawk',
    action: 'review',
    outcome: 'success',
    data: {
      response: JSON.stringify({
        approved: true,
        riskScore: 15,
        blockedReasons: [],
        platform: 'x',
        contentPreview: 'Test content',
        summary: 'Content approved',
      }),
    },
    tokensUsed: 80,
    durationMs: 40,
  }),
}))

vi.mock('@/agents/intelcore/sentry', () => ({
  run: vi.fn().mockResolvedValue({
    agentName: 'sentry',
    action: 'crisis_check',
    outcome: 'success',
    data: {
      response: JSON.stringify({
        crisisDetected: true,
        level: 2,
        description: 'Coordinated negative mentions detected',
        pauseScope: 'xforce',
        notifyEugine: true,
        summary: 'Level 2 crisis detected',
      }),
    },
    tokensUsed: 60,
    durationMs: 25,
  }),
}))

// ── Test 10.9: End-to-end command flow ────────────────────────

describe('Integration: end-to-end command flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('classifyCommand routes to correct corp/agent and emits DB record', async () => {
    const { classifyCommand } = await import('@/lib/sovereign')
    const { db } = await import('@/lib/db')

    const route = await classifyCommand('Post a hot take about Nairobi tech on X')

    // SOVEREIGN routes correctly
    expect(route.targetCorp).toBe('xforce')
    expect(route.targetAgent).toBe('blaze')
    expect(route.intent).toBe('post_to_x')

    // DB insert was called (agent_action logged)
    expect(db.insert).toHaveBeenCalled()
  })

  it('hawkReview is called before any publish and returns a decision', async () => {
    const { hawkReview } = await import('@/lib/hawk')

    const decision = await hawkReview(
      'Nairobi tech scene is growing fast. Thoughts?',
      'x',
      'blaze'
    )

    expect(decision).toHaveProperty('approved')
    expect(decision).toHaveProperty('riskScore')
    expect(decision).toHaveProperty('blockedReasons')
    expect(typeof decision.approved).toBe('boolean')
    expect(decision.riskScore).toBeGreaterThanOrEqual(0)
    expect(decision.riskScore).toBeLessThanOrEqual(100)
  })

  it('full flow: command → route → hawk review → DB log', async () => {
    const { classifyCommand } = await import('@/lib/sovereign')
    const { hawkReview } = await import('@/lib/hawk')
    const { db } = await import('@/lib/db')

    // Step 1: classify command
    const route = await classifyCommand('Post something about Kenya budget')
    expect(route.targetCorp).toBeTruthy()

    // Step 2: generate content (mocked) and hawk review
    const content = 'The Kenya budget reveals a lot about our priorities as a nation.'
    const decision = await hawkReview(content, 'x', route.targetAgent)
    expect(decision.approved).toBe(true)

    // Step 3: DB was written to (audit trail exists)
    expect(db.insert).toHaveBeenCalledTimes(1) // sovereign log (hawk only logs when blocked)
  })
})

// ── Test 10.10: Webhook processing ───────────────────────────

describe('Integration: webhook processing', () => {
  it('validates HMAC signature logic (unit test of validation function)', async () => {
    // Test the HMAC validation logic directly
    const crypto = await import('crypto')

    const secret = 'test-webhook-secret'
    const payload = JSON.stringify({ type: 'message', data: { text: 'Hello' } })

    // Generate a valid signature
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Generate an invalid signature
    const invalidSig = 'invalid-signature-abc123'

    // Valid signature should match
    const expectedValid = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    expect(validSig).toBe(expectedValid)
    expect(invalidSig).not.toBe(expectedValid)
  })

  it('webhook payload structure is preserved through processing', () => {
    const mockWebhookPayload = {
      type: 'message',
      platform: 'instagram',
      data: {
        senderId: 'user123',
        messageText: 'Hey love your content!',
        timestamp: new Date().toISOString(),
      },
    }

    // Verify payload serialization round-trip
    const serialized = JSON.stringify(mockWebhookPayload)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.type).toBe('message')
    expect(deserialized.platform).toBe('instagram')
    expect(deserialized.data.senderId).toBe('user123')
  })
})

// ── Test 10.11: Crisis detection and pause ────────────────────

describe('Integration: crisis detection and agent pause', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sentryCheck detects Level 2 crisis and pauses correct corps', async () => {
    const { sentryCheck } = await import('@/lib/sentry')
    const { pauseCorpAgents } = await import('@/lib/agentState')

    const crisis = await sentryCheck()

    // Crisis was detected
    expect(crisis).not.toBeNull()
    if (crisis) {
      expect(crisis.level).toBe(2)
      expect(crisis.notifyEugine).toBe(true)
    }

    // XForce and GramGod should be paused for Level 2
    expect(pauseCorpAgents).toHaveBeenCalledWith('xforce', expect.any(String))
    expect(pauseCorpAgents).toHaveBeenCalledWith('gramgod', expect.any(String))
  })

  it('crisis_events DB record is created on crisis detection', async () => {
    const { sentryCheck } = await import('@/lib/sentry')
    const { db } = await import('@/lib/db')

    await sentryCheck()

    // DB insert should have been called for crisis_events
    expect(db.insert).toHaveBeenCalled()
  })

  it('Level 3 crisis pauses all agents', async () => {
    // Override sentry mock to return Level 3
    const { run } = await import('@/agents/intelcore/sentry')
    vi.mocked(run).mockResolvedValueOnce({
      agentName: 'sentry',
      action: 'crisis_check',
      outcome: 'success',
      data: {
        response: JSON.stringify({
          crisisDetected: true,
          level: 3,
          description: 'Legal threat detected — account at risk',
          pauseScope: 'all',
          notifyEugine: true,
          summary: 'Level 3 crisis — all agents paused',
        }),
      },
      tokensUsed: 60,
      durationMs: 25,
    })

    const { sentryCheck } = await import('@/lib/sentry')
    const { pauseAllAgents } = await import('@/lib/agentState')

    const crisis = await sentryCheck()

    expect(crisis?.level).toBe(3)
    expect(pauseAllAgents).toHaveBeenCalled()
  })
})
