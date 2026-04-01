// POST /api/make/save-webhook
// Saves a Make.com webhook URL to the platform_connections table
// so it persists across deployments without needing Vercel env var changes

import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'

export async function POST(req: NextRequest) {
  try {
    const { platform, webhookUrl, envVar } = await req.json() as {
      platform: string
      webhookUrl: string
      envVar: string
    }

    if (!platform || !webhookUrl) {
      return NextResponse.json({ ok: false, error: 'Missing platform or webhookUrl' }, { status: 400 })
    }

    if (!webhookUrl.startsWith('https://hook.')) {
      return NextResponse.json({ ok: false, error: 'Invalid Make webhook URL — must start with https://hook.' }, { status: 400 })
    }

    const db = getDb()

    // Store in platform_connections with the webhook URL as access_token
    await withRetry(() =>
      db`
        INSERT INTO platform_connections (platform, status, last_verified, updated_at, error_message)
        VALUES (${`make_${platform}`}, 'connected', NOW(), NOW(), ${webhookUrl})
        ON CONFLICT (platform) DO UPDATE
          SET status = 'connected',
              last_verified = NOW(),
              updated_at = NOW(),
              error_message = ${webhookUrl}
      `
    )

    return NextResponse.json({
      ok: true,
      message: `Webhook saved for ${platform}. Add ${envVar}=${webhookUrl} to Vercel env vars and redeploy to make it permanent.`,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
