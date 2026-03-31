// POST /api/webhooks/facebook — receive events
// GET  /api/webhooks/facebook — hub verification challenge

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@/lib/webhooks/verify'
import { community } from '@/lib/agents/pagepower/community-agent'
import { logWarn, logInfo } from '@/lib/logger'

// GET — Facebook hub.challenge verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''

  if (mode === 'subscribe' && token === verifyToken) {
    logInfo('[Webhook/Facebook] Hub verification successful')
    return new Response(challenge ?? '', { status: 200 })
  }

  logWarn('[Webhook/Facebook] Hub verification failed', { mode, token: token?.slice(0, 10) })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const secret = process.env.FACEBOOK_APP_SECRET ?? ''
  const sourceIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  const valid = await verifyWebhook('facebook', rawBody, signature, secret)

  if (!valid) {
    logWarn('[Webhook/Facebook] Invalid signature', { sourceIp, signature: signature.slice(0, 20) })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  logInfo('[Webhook/Facebook] Valid webhook received', { sourceIp })

  // Route comment events to COMMUNITY agent
  const payloadObj = payload as Record<string, unknown>
  if (payloadObj.object === 'page') {
    community.receiveMessage({
      content: `Facebook webhook event: ${JSON.stringify(payload).slice(0, 200)}`,
    }).catch((err) => {
      logWarn('[Webhook/Facebook] COMMUNITY agent dispatch error', { error: String(err) })
    })
  }

  return NextResponse.json({ received: true })
}
