// GET  /api/connect/sessions — returns session status for all platforms
// POST /api/connect/sessions — triggers browser login for a specific platform
//
// All browser sessions are stored in Cloudflare KV under keys like:
//   platform:browser:session:{platform}
// The browser poster worker handles the actual login automation.

import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'

const BROWSER_POSTER_URL = process.env.X_BROWSER_POSTER_URL ?? 'https://propost-x-poster.euginemicah.workers.dev'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

// Platforms that use browser automation
const BROWSER_PLATFORMS = ['x', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'reddit', 'mastodon', 'truthsocial']

async function callBrowserPoster(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BROWSER_POSTER_URL}${path}`, {
    method,
    headers: {
      'x-internal-secret': INTERNAL_SECRET,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Browser poster ${path} returned ${res.status}: ${text}`)
  }
  return res.json()
}

// GET — return session status for all platforms
export async function GET() {
  const sessions: Record<string, { hasSession: boolean; lastVerified?: string }> = {}

  // Check each platform's session status via the browser poster
  await Promise.all(
    BROWSER_PLATFORMS.map(async (platform) => {
      try {
        const data = await callBrowserPoster(`/status/${platform}`) as { hasSession: boolean; lastVerified?: string }
        sessions[platform] = { hasSession: data.hasSession ?? false, lastVerified: data.lastVerified }
      } catch {
        sessions[platform] = { hasSession: false }
      }
    })
  )

  return NextResponse.json(sessions)
}

// POST — trigger browser login for a platform
export async function POST(req: NextRequest) {
  let body: { platform?: string; action?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  const { platform, action } = body

  if (!platform || !BROWSER_PLATFORMS.includes(platform)) {
    return NextResponse.json({ ok: false, error: `Unknown platform: ${platform}` }, { status: 400 })
  }

  if (action === 'login') {
    try {
      const data = await callBrowserPoster(`/login/${platform}`, 'POST', {}) as {
        ok: boolean
        message?: string
        error?: string
      }

      if (data.ok) {
        // Update platform_connections table
        try {
          const db = getDb()
          await withRetry(() =>
            db`
              INSERT INTO platform_connections (platform, status, last_verified, updated_at)
              VALUES (${platform}, 'connected', NOW(), NOW())
              ON CONFLICT (platform) DO UPDATE
                SET status = 'connected',
                    last_verified = NOW(),
                    updated_at = NOW(),
                    error_message = NULL
            `
          )
        } catch { /* non-fatal */ }
      }

      return NextResponse.json(data)
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }

  if (action === 'disconnect') {
    try {
      await callBrowserPoster(`/logout/${platform}`, 'POST', {})
      try {
        const db = getDb()
        await withRetry(() =>
          db`
            UPDATE platform_connections
            SET status = 'disconnected', updated_at = NOW()
            WHERE platform = ${platform}
          `
        )
      } catch { /* non-fatal */ }
      return NextResponse.json({ ok: true, message: `${platform} disconnected` })
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
