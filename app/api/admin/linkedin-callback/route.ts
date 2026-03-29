export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = '77djdqybvp37qq'
const REDIRECT_URI = 'https://propost-roylandz-media.vercel.app/api/admin/linkedin-callback'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json({ error, description: req.nextUrl.searchParams.get('error_description') }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No code returned' }, { status: 400 })
  }

  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientSecret) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_SECRET not set in Vercel env' }, { status: 500 })
  }

  // Exchange code for access token
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: clientSecret,
  })

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    return NextResponse.json({ error: 'Token exchange failed', details: err }, { status: 500 })
  }

  const tokenData = await tokenRes.json() as {
    access_token: string
    expires_in: number
    scope: string
    token_type: string
  }

  // Return the token so the user can store it in Vercel
  return NextResponse.json({
    ok: true,
    access_token: tokenData.access_token,
    expires_in_days: Math.floor(tokenData.expires_in / 86400),
    scope: tokenData.scope,
    instructions: [
      '✅ Token received! Run this command to store it in Vercel:',
      `vercel env rm LINKEDIN_ACCESS_TOKEN production --yes`,
      `printf "${tokenData.access_token}" | vercel env add LINKEDIN_ACCESS_TOKEN production --force`,
      `vercel --prod`,
    ],
  })
}
