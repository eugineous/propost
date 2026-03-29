export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cleanEnvValue } from '@/lib/env'

// Internal secret guard — same pattern as cron routes
function authorized(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-internal-secret')
  return secret === process.env.INTERNAL_SECRET
}

/**
 * GET /api/admin/linkedin-setup
 *   ?secret=<INTERNAL_SECRET>
 *
 * Diagnoses LinkedIn connectivity:
 *  1. Tries /v2/me with the stored access token
 *  2. Returns the person URN if successful
 *  3. If insufficient scope, returns clear instructions
 *
 * POST /api/admin/linkedin-setup
 *   ?secret=<INTERNAL_SECRET>
 *   body: { urn: "urn:li:person:AbCdEfGhI" }
 *
 * Validates the URN format and echoes it back so you can
 * copy-paste it into `vercel env add LINKEDIN_AUTHOR_URN`.
 */

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = cleanEnvValue(process.env.LINKEDIN_ACCESS_TOKEN)
  const existingUrn = cleanEnvValue(process.env.LINKEDIN_AUTHOR_URN)

  if (!token) {
    return NextResponse.json({
      ok: false,
      stage: 'no_token',
      message: 'LINKEDIN_ACCESS_TOKEN is not set in Vercel env.',
    })
  }

  // Try /v2/me — requires r_liteprofile scope
  const meRes = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  })

  if (meRes.ok) {
    const me = await meRes.json() as { id: string; localizedFirstName?: string; localizedLastName?: string }
    const urn = `urn:li:person:${me.id}`
    return NextResponse.json({
      ok: true,
      stage: 'resolved',
      urn,
      name: `${me.localizedFirstName ?? ''} ${me.localizedLastName ?? ''}`.trim(),
      existingUrn: existingUrn || null,
      action: existingUrn === urn
        ? 'already_set_correctly'
        : `Run: vercel env add LINKEDIN_AUTHOR_URN production  (value: ${urn})`,
    })
  }

  // Insufficient scope — return instructions
  const errBody = await meRes.json().catch(() => ({}))
  return NextResponse.json({
    ok: false,
    stage: 'insufficient_scope',
    httpStatus: meRes.status,
    linkedinError: errBody,
    existingUrn: existingUrn || null,
    instructions: [
      '1. Go to https://www.linkedin.com/in/<your-vanity-name>/',
      '2. Right-click → View Page Source  (or open DevTools → Network tab)',
      '3. Search for "publicIdentifier" — the numeric or alphanumeric ID next to it is your member ID',
      '4. Your URN is: urn:li:person:<that_id>',
      '5. Run these commands in your terminal:',
      '   vercel env add LINKEDIN_AUTHOR_URN production',
      '   vercel env add LINKEDIN_AUTHOR_URN preview',
      '   vercel env add LINKEDIN_AUTHOR_URN development',
      '   (paste the URN when prompted)',
      '6. Then redeploy: vercel --prod',
      '',
      'Alternatively, re-issue your LinkedIn token with r_liteprofile scope',
      'and call this endpoint again — it will auto-detect and display the URN.',
    ],
  })
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { urn?: string }
  const urn = (body.urn ?? '').trim()

  if (!/^urn:li:person:[A-Za-z0-9_-]+$/.test(urn)) {
    return NextResponse.json({
      ok: false,
      error: 'Invalid URN format. Expected: urn:li:person:<alphanumeric_id>',
      received: urn,
    }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    urn,
    commands: [
      `vercel env add LINKEDIN_AUTHOR_URN production`,
      `vercel env add LINKEDIN_AUTHOR_URN preview`,
      `vercel env add LINKEDIN_AUTHOR_URN development`,
      `# value for each: ${urn}`,
      `vercel --prod  # redeploy`,
    ],
    curlExample: `curl -s https://propost.vercel.app/api/admin/linkedin-setup?secret=$INTERNAL_SECRET`,
  })
}
