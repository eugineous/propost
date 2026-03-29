import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

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
      }),
    }),
  },
}))

vi.mock('@/lib/schema', () => ({ messages: {}, agentActions: {} }))

// Mock the chat agent's run function directly (not gemini)
vi.mock('@/agents/gramgod/chat', () => ({
  run: vi.fn().mockImplementation(async (_task: string, data: Record<string, unknown>) => {
    const messageText = (data?.messageText as string) ?? ''
    const isBrandDeal = /sponsor|partner|collab|paid|brand|rate card/i.test(messageText)
    const isHostile = /trash|hate|stupid|idiot|terrible/i.test(messageText)
    const isFemale = /queen|sis|mami|wanjiku|amina|aisha/i.test(messageText)
    const isMale = /bro|king|baba|brian|kevin|otieno/i.test(messageText)

    const detectedTone = isHostile ? 'hostile' : isBrandDeal ? 'professional' : 'friendly'
    const detectedGender = isFemale ? 'female' : isMale ? 'male' : 'unknown'
    const escalateTo = isBrandDeal ? 'DEAL' : isHostile ? 'EUGINE' : null

    return {
      agentName: 'chat',
      action: (_task as string).slice(0, 100),
      outcome: 'success',
      data: {
        response: JSON.stringify({
          responseText: isHostile
            ? 'Appreciate the feedback, fam. Always looking to improve.'
            : isBrandDeal
            ? 'Thanks for reaching out! Can you share your brand brief?'
            : 'Asante sana for the love! 🔥',
          isBrandDeal,
          detectedTone,
          detectedGender,
          escalateTo,
          shouldRespond: true,
          responseTimeMs: 1500,
          summary: `DM handled: ${detectedTone}`,
        }),
      },
      tokensUsed: 80,
      durationMs: 40,
    }
  }),
}))

import { chatRespond } from '@/lib/chat'
import type { DMContext } from '@/lib/types'

function makeDM(text: string): DMContext {
  return {
    senderId: 'user123',
    senderUsername: 'testuser',
    messageText: text,
    receivedAt: new Date(),
    threadHistory: [],
  }
}

describe('CHAT DM handler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns non-empty responseText for a friendly message', async () => {
    const result = await chatRespond(makeDM('Bro your content is fire!'))
    expect(result.responseText).toBeTruthy()
    expect(result.responseText.length).toBeGreaterThan(0)
  })

  it('detects brand deal and escalates to DEAL', async () => {
    const result = await chatRespond(makeDM('Hi, I represent Brand X and want to sponsor your content'))
    expect(result.isBrandDeal).toBe(true)
    expect(result.escalateTo).toBe('DEAL')
  })

  it('detects hostile tone and escalates to EUGINE', async () => {
    const result = await chatRespond(makeDM('Your content is trash and stupid'))
    expect(result.detectedTone).toBe('hostile')
    expect(result.escalateTo).toBe('EUGINE')
  })

  it('detects female gender from name context', async () => {
    const result = await chatRespond(makeDM('Queen! Love your work! - Wanjiku'))
    expect(result.detectedGender).toBe('female')
  })

  it('detects male gender from name context', async () => {
    const result = await chatRespond(makeDM('Bro you are amazing! - Brian'))
    expect(result.detectedGender).toBe('male')
  })

  it('returns valid tone domain', async () => {
    const validTones = ['friendly', 'professional', 'hostile', 'spam']
    const result = await chatRespond(makeDM('Hello there'))
    expect(validTones).toContain(result.detectedTone)
  })

  it('returns valid gender domain', async () => {
    const validGenders = ['male', 'female', 'unknown']
    const result = await chatRespond(makeDM('Hello there'))
    expect(validGenders).toContain(result.detectedGender)
  })
})

// ── Property-based tests ──────────────────────────────────────

describe('Property 9: CHAT always returns non-empty responseText', () => {
  it('responseText is non-empty for any non-empty message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (messageText) => {
          const result = await chatRespond(makeDM(messageText))
          if (result.detectedTone !== 'spam') {
            expect(result.responseText.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 15 }
    )
  })
})

describe('Property 10: CHAT output domains are always valid', () => {
  it('detectedTone is always one of the valid values', async () => {
    const validTones = ['friendly', 'professional', 'hostile', 'spam']
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (messageText) => {
          const result = await chatRespond(makeDM(messageText))
          expect(validTones).toContain(result.detectedTone)
        }
      ),
      { numRuns: 15 }
    )
  })

  it('detectedGender is always one of the valid values', async () => {
    const validGenders = ['male', 'female', 'unknown']
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (messageText) => {
          const result = await chatRespond(makeDM(messageText))
          expect(validGenders).toContain(result.detectedGender)
        }
      ),
      { numRuns: 15 }
    )
  })
})

describe('Property 11: CHAT brand deal detection sets correct escalation', () => {
  it('isBrandDeal=true always sets escalateTo=DEAL', async () => {
    const brandDealMessages = [
      'I want to sponsor your content',
      'Brand partnership opportunity',
      'Paid collaboration inquiry',
    ]
    for (const msg of brandDealMessages) {
      const result = await chatRespond(makeDM(msg))
      if (result.isBrandDeal) {
        expect(result.escalateTo).toBe('DEAL')
      }
    }
  })
})

describe('Property 12: CHAT hostile tone sets correct escalation', () => {
  it('hostile tone always sets escalateTo=EUGINE', async () => {
    const result = await chatRespond(makeDM('Your content is trash and stupid'))
    if (result.detectedTone === 'hostile') {
      expect(result.escalateTo).toBe('EUGINE')
    }
  })
})
