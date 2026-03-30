export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as blazeRun } from '@/agents/xforce/blaze'

// Generates tweet content via BLAZE + HAWK review, returns it for the CF browser poster to publish
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const blazeResult = await blazeRun(
      'Generate a tweet for Eugine Micah (@eugineroylandz). ' +
      'First search for the latest AI news or trending topics in Kenya right now. ' +
      'Apply the 5-step pre-post framework from your knowledge base. ' +
      'Choose the right format: hot take (under 200 chars), thread opener, or trending reaction. ' +
      'The Kenyan angle is MANDATORY for AI news. ' +
      'No forbidden words. Sounds like a real Nairobi entrepreneur, not a bot. ' +
      'Return JSON with tweets array where tweets[0].text is the main tweet under 280 chars.'
    )

    let content = (blazeResult.data?.response as string ?? '').trim()

    // Strip JSON wrapper if BLAZE returned one
    try {
      const parsed = JSON.parse(content) as { tweets?: Array<{ text: string }>; text?: string; tweet?: string }
      content = parsed.tweets?.[0]?.text ?? parsed.text ?? parsed.tweet ?? content
    } catch { /* not JSON, use as-is */ }

    // Clean up
    content = content.replace(/^["']|["']$/g, '').trim()

    if (!content) {
      return NextResponse.json({ ok: false, error: 'BLAZE produced no content' })
    }

    // Truncate to 280 chars
    if (content.length > 280) content = content.slice(0, 277) + '...'

    // HAWK review
    const decision = await hawkReview(content, 'x', 'blaze')
    if (!decision.approved) {
      return NextResponse.json({ ok: false, error: 'HAWK blocked', reasons: decision.blockedReasons })
    }

    return NextResponse.json({ ok: true, content, riskScore: decision.riskScore })
  } catch (err) {
    console.error('[x-generate]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
