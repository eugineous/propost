// POST /api/make/test
// Sends a test payload to a Make.com webhook to verify it's working

import { NextRequest, NextResponse } from 'next/server'
import { postViaMake, getMakeWebhookUrl } from '@/lib/make/client'
import { getDb } from '@/lib/db/client'

export async function POST(req: NextRequest) {
  try {
    const { platform } = await req.json() as { platform: string }
    if (!platform) return NextResponse.json({ ok: false, error: 'Missing platform' }, { status: 400 })

    // Check env var first, then DB fallback
    let webhookUrl = getMakeWebhookUrl(platform)

    if (!webhookUrl) {
      // Try DB (saved via save-webhook)
      try {
        const db = getDb()
        const rows = await db`
          SELECT error_message FROM platform_connections
          WHERE platform = ${`make_${platform}`} AND status = 'connected'
          LIMIT 1
        `
        const row = (rows as Array<{ error_message: string | null }>)[0]
        if (row?.error_message?.startsWith('https://hook.')) {
          webhookUrl = row.error_message
        }
      } catch { /* ignore */ }
    }

    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: 'Webhook not configured — paste the URL and save first' }, { status: 400 })
    }

    // Send test payload
    const testPayload = {
      platform,
      content: `🧪 ProPost test post — ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT. If you see this in Make.com, the connection is working!`,
      media_url: null,
      title: null,
      pillar: 'test',
      agent: 'PROPOST_TEST',
      timestamp: new Date().toISOString(),
      source: 'propost_empire',
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ ok: false, error: `Make returned ${res.status}: ${text}` })
    }

    return NextResponse.json({ ok: true, message: 'Test payload sent — check Make.com scenario history' })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
