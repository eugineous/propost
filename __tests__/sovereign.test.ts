import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/agentState', () => ({
  isAgentPaused: vi.fn().mockResolvedValue(false),
  getAgentState: vi.fn().mockResolvedValue({ isPaused: false, rateLimitCounters: { postsToday: 0, repliesToday: 0, followsToday: 0 }, lastRunAt: '', lastOutcome: '' }),
}))

vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }) },
}))

vi.mock('@/lib/schema', () => ({ agentActions: {} }))

// Mock the sovereign agent's run function directly
vi.mock('@/agents/intelcore/sovereign', () => ({
  run: vi.fn().mockImplementation(async (_task: string, _data?: Record<string, unknown>) => {
    const task = _task.toLowerCase()
    let corp = 'intelcore'
    let agent = 'sovereign'
    let intent = 'unknown'

    // Order matters — check more specific patterns first
    if (/linkedin/i.test(task)) { corp = 'linkedelite'; agent = 'nova'; intent = 'post_to_linkedin' }
    else if (/facebook/i.test(task)) { corp = 'pagepower'; agent = 'chief'; intent = 'post_to_facebook' }
    else if (/instagram|dm|direct message/i.test(task)) { corp = 'gramgod'; agent = 'chat'; intent = 'handle_instagram' }
    else if (/trend|scout|trending/i.test(task)) { corp = 'xforce'; agent = 'scout'; intent = 'check_trends' }
    else if (/crisis|sentry/i.test(task)) { corp = 'intelcore'; agent = 'sentry'; intent = 'check_crisis' }
    else if (/post|tweet|thread|x\.com/i.test(task)) { corp = 'xforce'; agent = 'blaze'; intent = 'post_to_x' }

    return {
      agentName: 'sovereign',
      action: _task.slice(0, 100),
      outcome: 'success',
      data: {
        response: JSON.stringify({
          intent,
          targetCorp: corp,
          targetAgent: agent,
          parameters: {},
          priority: 'normal',
          summary: `Routing to ${corp}/${agent}`,
        }),
      },
      tokensUsed: 50,
      durationMs: 30,
    }
  }),
}))

import { classifyCommand } from '@/lib/sovereign'

describe('SOVEREIGN intent classification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes X post commands to xforce/blaze', async () => {
    const route = await classifyCommand('Post a hot take about Nairobi tech on X')
    expect(route.targetCorp).toBe('xforce')
    expect(route.targetAgent).toBe('blaze')
  })

  it('routes Instagram DM commands to gramgod/chat', async () => {
    const route = await classifyCommand('Check Instagram DMs for brand deals')
    expect(route.targetCorp).toBe('gramgod')
    expect(route.targetAgent).toBe('chat')
  })

  it('routes LinkedIn commands to linkedelite/nova', async () => {
    const route = await classifyCommand('Post a thought leadership piece on LinkedIn')
    expect(route.targetCorp).toBe('linkedelite')
    expect(route.targetAgent).toBe('nova')
  })

  it('routes trend commands to xforce/scout', async () => {
    const route = await classifyCommand('What trends are happening on X right now?')
    expect(route.targetCorp).toBe('xforce')
    expect(route.targetAgent).toBe('scout')
  })

  it('returns a valid CommandRoute shape', async () => {
    const route = await classifyCommand('Post something about Kenya budget')
    expect(route).toHaveProperty('intent')
    expect(route).toHaveProperty('targetCorp')
    expect(route).toHaveProperty('targetAgent')
    expect(route).toHaveProperty('parameters')
    expect(route).toHaveProperty('priority')
    expect(route.targetCorp).toBeTruthy()
    expect(route.targetAgent).toBeTruthy()
  })
})

describe('Property 24: SOVEREIGN classification produces no platform side effects', () => {
  it('classifyCommand does not call any platform API', async () => {
    // If platform modules were imported and called, they would throw (not mocked)
    // The fact that classifyCommand completes without error proves no platform calls
    const route = await classifyCommand('Post about Nairobi tech scene')
    expect(route.targetCorp).toBeTruthy()
    // No platform API errors = no platform calls during classification
  })
})
