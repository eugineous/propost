// GET /api/auth/callback/instagram
// OAuth callback — exchanges code for long-lived user token + page token
// Triggered after user authorizes at:
// https://www.facebook.com/v21.0/dialog/oauth?client_id=APP_ID&redirect_uri=...&scope=...&response_type=code

import { NextRequest, NextResponse } from 'next/server'

const REDIRECT_URI = 'https://propost.vercel.app/api/auth/callback/instagram'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json({ error, description: req.nextUrl.searchParams.get('error_description') }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const APP_ID = process.env.FACEBOOK_APP_ID
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json({ error: 'FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not configured' }, { status: 500 })
  }

  // Step 1: Exchange code for short-lived user token
  const shortRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`
  )
  const shortData = await shortRes.json()

  if (shortData.error) {
    return NextResponse.json({ step: 'code_exchange', error: shortData.error }, { status: 400 })
  }

  // Step 2: Exchange for long-lived user token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortData.access_token}`
  )
  const longData = await longRes.json()

  if (longData.error) {
    return NextResponse.json({ step: 'long_lived_exchange', error: longData.error }, { status: 400 })
  }

  const userToken = longData.access_token

  // Step 3: Get Facebook Pages + their permanent Page tokens
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  )
  const pagesData = await pagesRes.json()

  // Find "Eugine Micah Official" page
  const page = pagesData.data?.find((p: { id: string }) => p.id === '732739453247112') ?? pagesData.data?.[0]
  const pageToken = page?.access_token ?? null
  const igAccountId = page?.instagram_business_account?.id ?? null

  return NextResponse.json({
    instructions: 'Copy these values to your .env.local and Vercel env vars, then redeploy.',
    FACEBOOK_ACCESS_TOKEN: userToken,
    INSTAGRAM_ACCESS_TOKEN: userToken,
    FACEBOOK_PAGE_ACCESS_TOKEN: pageToken,
    INSTAGRAM_BUSINESS_ACCOUNT_ID: igAccountId ?? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    expires_in_days: Math.round((longData.expires_in ?? 5183944) / 86400),
    pages: pagesData.data?.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
  })
}
