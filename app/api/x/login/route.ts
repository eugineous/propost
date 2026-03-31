// POST /api/x/login
// Triggers the X browser poster to log in and save the session.
// Run this ONCE to set up the browser session (lasts 30 days).
// After this, /api/post/now will use browser automation as fallback.
//
// Body: { username?: string, password?: string }
// (If not provided, uses X_USERNAME and X_PASSWORD env vars on the CF worker)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = internalSecret === process.env.INTERNAL_SECRET

  // Also allow from dashboard (no auth required for founder-only deployment)
  const browserPosterUrl = process.env.X_BROWSER_POSTER_URL
  if (!browserPosterUrl) {
    return NextResponse.json({
      ok: false,
      error: 'X_BROWSER_POSTER_URL not set. Deploy the x-browser-poster Cloudflare Worker first.',
      setup: 'cd cloudflare-worker/x-browser-poster && wrangler deploy',
    }, { status: 503 })
  }

  let body: { username?: string; password?: string } = {}
  try { body = await req.json() } catch { /* use env vars */ }

  try {
    const res = await fetch(`${browserPosterUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

export async function GET() {
  const browserPosterUrl = process.env.X_BROWSER_POSTER_URL
  if (!browserPosterUrl) {
    return NextResponse.json({ ok: false, hasSession: false, error: 'X_BROWSER_POSTER_URL not configured' })
  }

  try {
    const res = await fetch(`${browserPosterUrl}/status`, {
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ ok: false, hasSession: false, error: String(err) })
  }
}
