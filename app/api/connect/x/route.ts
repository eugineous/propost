// GET  /api/connect/x  — check X browser session status
// POST /api/connect/x  — trigger browser login (action: 'login')

import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'

const BROWSER_POSTER_URL = process.env.X_BROWSER_POSTER_URL ?? 'https://propost-x-poster.euginemicah.workers.dev'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

async function callBrowserPoster(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BROWSER_POSTER_URL}${path}`, {
    method,
    headers: {
      'x-internal-secret': INTERNAL_SECRET,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res.json()
}

export async function GET() {
  try {
    const data = await callBrowserPoster('/status') as {
      ok: boolean
      hasSession: boolean
      browserEnabled: boolean
      message: string
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ ok: false, hasSession: false, browserEnabled: false, error: String(err) })
  }
}

export async function POST(req: NextRequest) {
  let body: { action?: string; username?: string; password?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  if (body.action === 'login') {
    try {
      // Trigger the browser poster to log in using its stored X_USERNAME/X_PASSWORD secrets
      const data = await callBrowserPoster('/login', 'POST', {
        username: body.username,  // optional override
        password: body.password,  // optional override
      }) as { ok: boolean; message?: string; error?: string; url?: string }

      if (data.ok) {
        // Update platform_connections table to reflect connected status
        try {
          const db = getDb()
          await withRetry(() =>
            db`
              INSERT INTO platform_connections (platform, status, last_verified, updated_at)
              VALUES ('x', 'connected', NOW(), NOW())
              ON CONFLICT (platform) DO UPDATE
                SET status = 'connected',
                    last_verified = NOW(),
                    updated_at = NOW(),
                    error_message = NULL
            `
          )
        } catch { /* non-fatal — DB might not be ready */ }
      }

      return NextResponse.json(data)
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
