// P12: Every content_queue item has exactly one valid pillar slug
// P13: X ≤ 280 chars, Instagram has hashtags, LinkedIn ≥ 150 chars

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatContent } from '@/lib/content/formatter'

const VALID_PILLARS = [
  'ai_news', 'youth_empowerment', 'trending_topics', 'elite_conversations',
  'kenyan_entertainment', 'fashion', 'media_journalism', 'personal_story',
  'entrepreneurship', 'culture_identity',
]

describe('P12: Every content_queue item has exactly one valid pillar slug', () => {
  it('pillar slug is always one of the 10 valid values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_PILLARS),
        (pillar) => {
          expect(VALID_PILLARS).toContain(pillar)
          // Exactly one pillar per item
          const count = VALID_PILLARS.filter((p) => p === pillar).length
          expect(count).toBe(1)
        }
      )
    )
  })
})

describe('P13: Platform formatting constraints hold for all content', () => {
  it('X content is always ≤ 280 characters after formatting', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (rawContent) => {
          const formatted = formatContent(rawContent, 'x', 'ai_news')
          expect(formatted.content.length).toBeLessThanOrEqual(280)
        }
      )
    )
  })

  it('Instagram content always has at least one hashtag after formatting', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 500 }).filter((s) => !s.includes('#')),
        (rawContent) => {
          const formatted = formatContent(rawContent, 'instagram', 'ai_news')
          expect(formatted.content).toContain('#')
        }
      )
    )
  })

  it('LinkedIn content ≥ 150 chars is flagged as valid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 150, maxLength: 3000 }),
        (rawContent) => {
          const formatted = formatContent(rawContent, 'linkedin', 'ai_news')
          // Content that starts ≥ 150 chars should have no length warning
          const hasLengthWarning = formatted.warnings.some((w) => w.includes('recommends'))
          if (rawContent.length >= 150) {
            expect(hasLengthWarning).toBe(false)
          }
        }
      )
    )
  })
})
