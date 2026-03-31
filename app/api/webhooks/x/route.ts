import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@/lib/webhooks/verify'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { logWarn } from '@/lib/logger'
import { checkWebhookReplay } from '@/lib/security/red-team'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-twitter-webhooks-signature') ?? ''
  const secret = process.env.X_WEBHOOK_SECRET ?? process.env.X_API_SECRET ?? ''
  const sourceIp = req.headers.get('x-forwarded-for') ?? 'unknown'

  const valid = await verifyWebhook('x', rawBody, signature, secret)
  if (!valid) {
    logWarn('[webhook/x] Invalid signature', { sourceIp, signature: signature.slice(0, 20) })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Replay protection
  const { isReplay } = checkWebhookReplay('x', rawBody, req.headers.get('x-twitter-webhooks-timestamp') ?? undefined)
  if (isReplay) {
    logWarn('[webhook/x] Replay detected — discarding', { sourceIp })
    return NextResponse.json({ ok: true }) // Return 200 to prevent retry storms
  }

  try {
    const payload = JSON.parse(rawBody)

    // Route DM events to XForce
    if (payload.direct_message_events) {
      await taskOrchestrator.createTask({
        type: 'dm_response',
        company: 'xforce',
        platform: 'x',
        priority: 1,
        assignedAgent: 'ECHO',
      })
    }

    // Route mention events to reply specialist
    if (payload.tweet_create_events) {
      await taskOrchestrator.createTask({
        type: 'reply',
        company: 'xforce',
        platform: 'x',
        priority: 2,
        assignedAgent: 'ECHO',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// CRC challenge for X webhook verification
export async function GET(req: NextRequest) {
  const crcToken = new URL(req.url).searchParams.get('crc_token')
  if (!crcToken) return NextResponse.json({ error: 'Missing crc_token' }, { status: 400 })

  const secret = process.env.X_API_SECRET ?? ''
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(crcToken))
  const responseToken = `sha256=${btoa(Array.from(new Uint8Array(sig)).map((b) => String.fromCharCode(b)).join(''))}`

  return NextResponse.json({ response_token: responseToken })
}
