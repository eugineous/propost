// POST /api/webhooks/instagram — receive events
// GET  /api/webhooks/instagram — hub verification challenge

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@/lib/webhooks/verify'
import { chat } from '@/lib/agents/gramgod/dm-handler'
import { logWarn, logInfo } from '@/lib/logger'

// GET — Facebook/Instagram hub.challenge verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? ''

  if (mode === 'subscribe' && token === verifyToken) {
    logInfo('[Webhook/Instagram] Hub verification successful')
    return new Response(challenge ?? '', { status: 200 })
  }

  logWarn('[Webhook/Instagram] Hub verification failed', { mode, token: token?.slice(0, 10) })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const secret = process.env.INSTAGRAM_APP_SECRET ?? ''
  const sourceIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  const valid = await verifyWebhook('instagram', rawBody, signature, secret)

  if (!valid) {
    logWarn('[Webhook/Instagram] Invalid signature', { sourceIp, signature: signature.slice(0, 20) })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  logInfo('[Webhook/Instagram] Valid webhook received', { sourceIp })

  // Route DM events to CHAT agent
  const payloadObj = payload as Record<string, unknown>
  if (payloadObj.object === 'instagram') {
    chat.receiveMessage({
      content: `Instagram webhook event: ${JSON.stringify(payload).slice(0, 200)}`,
    }).catch((err) => {
      logWarn('[Webhook/Instagram] CHAT agent dispatch error', { error: String(err) })
    })
  }

  return NextResponse.json({ received: true })
}
