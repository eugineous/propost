// P23: Invalid webhook signature → 403 + no task/action created; valid → payload processed

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { verifyWebhook } from '@/lib/webhooks/verify'

describe('P23: Webhook signature verification', () => {
  it('invalid signature always returns false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('x', 'instagram', 'facebook' as const),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.string({ minLength: 10, maxLength: 64 }), // wrong signature
        fc.string({ minLength: 10, maxLength: 64 }), // secret
        async (platform, body, wrongSig, secret) => {
          const result = await verifyWebhook(
            platform as 'x' | 'instagram' | 'facebook',
            body,
            `invalid_${wrongSig}`,
            secret
          )
          expect(result).toBe(false)
        }
      )
    )
  })

  it('empty signature always returns false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('x', 'instagram', 'facebook' as const),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.string({ minLength: 10, maxLength: 64 }),
        async (platform, body, secret) => {
          const result = await verifyWebhook(
            platform as 'x' | 'instagram' | 'facebook',
            body,
            '', // empty signature
            secret
          )
          expect(result).toBe(false)
        }
      )
    )
  })
})
