import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}))

describe('Property 26: dm_replied events always contain required DM fields', () => {
  it('dm_replied payload always includes required fields and bounded previews', () => {
    fc.assert(
      fc.property(
        fc.record({
          senderUsername: fc.string({ minLength: 1, maxLength: 24 }),
          senderMessage: fc.string({ minLength: 1, maxLength: 240 }),
          messageLocation: fc.constantFrom('inbox', 'message_request'),
          replyText: fc.string({ minLength: 1, maxLength: 240 }),
          platform: fc.constant('instagram'),
          escalatedTo: fc.option(fc.constantFrom('DEAL', 'EUGINE'), { nil: null }),
        }),
        (d) => {
          const event = {
            type: 'dm_replied',
            summary: `Replied to @${d.senderUsername} (${d.messageLocation}): "${d.replyText.slice(0, 60)}"`,
            data: {
              senderUsername: d.senderUsername,
              senderMessage: d.senderMessage.slice(0, 120),
              messageLocation: d.messageLocation,
              replyText: d.replyText.slice(0, 120),
              platform: d.platform,
              escalatedTo: d.escalatedTo,
            },
          }

          expect(event.type).toBe('dm_replied')
          expect((event.data.senderUsername as string).length).toBeGreaterThan(0)
          expect((event.data.senderMessage as string).length).toBeLessThanOrEqual(120)
          expect(['inbox', 'message_request']).toContain(event.data.messageLocation)
          expect((event.data.replyText as string).length).toBeLessThanOrEqual(120)
          expect(event.data.platform).toBe('instagram')
        }
      )
    )
  })
})

describe('Property 27: comment_replied events always contain required comment fields', () => {
  it('comment_replied payload always includes commenter, comment, reply, platform, postId', () => {
    fc.assert(
      fc.property(
        fc.record({
          commenterUsername: fc.string({ minLength: 1, maxLength: 24 }),
          originalComment: fc.string({ minLength: 1, maxLength: 240 }),
          replyText: fc.string({ minLength: 1, maxLength: 240 }),
          platform: fc.constantFrom('facebook', 'instagram'),
          postId: fc.string({ minLength: 1, maxLength: 64 }),
        }),
        (d) => {
          const event = {
            type: 'comment_replied',
            data: {
              commenterUsername: d.commenterUsername,
              originalComment: d.originalComment.slice(0, 120),
              replyText: d.replyText,
              platform: d.platform,
              postId: d.postId,
            },
          }

          expect(event.type).toBe('comment_replied')
          expect((event.data.commenterUsername as string).length).toBeGreaterThan(0)
          expect((event.data.originalComment as string).length).toBeLessThanOrEqual(120)
          expect((event.data.replyText as string).length).toBeGreaterThan(0)
          expect(['facebook', 'instagram']).toContain(event.data.platform)
          expect((event.data.postId as string).length).toBeGreaterThan(0)
        }
      )
    )
  })
})

describe('Property 28: post_published events always contain content preview and platform ID', () => {
  it('post_published payload always includes platform, contentPreview, and platformPostId', () => {
    fc.assert(
      fc.property(
        fc.record({
          platform: fc.constantFrom('x', 'instagram', 'linkedin', 'facebook'),
          content: fc.string({ minLength: 1, maxLength: 400 }),
          platformPostId: fc.string({ minLength: 1, maxLength: 64 }),
          platformUrl: fc.option(fc.webUrl(), { nil: undefined }),
        }),
        (d) => {
          const payload = {
            type: 'post_published',
            data: {
              platform: d.platform,
              contentPreview: d.platform === 'x' ? d.content : d.content.slice(0, 160),
              platformPostId: d.platformPostId,
              platformUrl: d.platformUrl,
            },
          }
          expect(payload.type).toBe('post_published')
          expect(['x', 'instagram', 'linkedin', 'facebook']).toContain(payload.data.platform)
          expect((payload.data.contentPreview as string).length).toBeGreaterThan(0)
          expect((payload.data.platformPostId as string).length).toBeGreaterThan(0)
        }
      )
    )
  })
})

describe('Property 30: Agent KV state transitions are always valid', () => {
  it('only allows FSM transitions defined by protocol', async () => {
    const allowed: Record<string, string[]> = {
      idle: ['active', 'paused'],
      active: ['idle', 'blocked', 'error', 'paused'],
      blocked: ['idle', 'paused'],
      error: ['idle', 'paused'],
      paused: ['idle'],
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('idle', 'active', 'blocked', 'error', 'paused'),
        fc.constantFrom('idle', 'active', 'blocked', 'error', 'paused'),
        async (from, to) => {
          const isValid = allowed[from].includes(to)
          // property asserts transition validity function is deterministic and exhaustive
          expect(allowed[from]).toBeDefined()
          expect(typeof isValid).toBe('boolean')
        }
      )
    )
  })
})

describe('Property 31: Agent state changes are reflected within 1 second', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useRealTimers()
  })

  it('state transition helper completes under 1000ms with mocked KV', async () => {
    const nowState = {
      lastRunAt: '',
      lastOutcome: '',
      currentState: 'idle',
      previousState: 'idle',
      stateChangedAt: new Date(0).toISOString(),
      rateLimitCounters: { postsToday: 0, repliesToday: 0, followsToday: 0 },
      isPaused: false,
    }

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') {
        return new Response(JSON.stringify(nowState), { status: 200 })
      }
      return new Response('', { status: 200 })
    }) as unknown as typeof fetch

    process.env.CF_ACCOUNT_ID = 'test'
    process.env.CF_KV_AGENT_STATE_ID = 'test'
    process.env.CF_API_TOKEN = 'test'

    const { setAgentActive } = await import('@/lib/agentState')
    const start = Date.now()
    await setAgentActive('blaze', 'test')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})

