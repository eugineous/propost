export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — OAuth Initiation Handler
// GET /api/auth/connect/:platform
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok'] as const
type Platform = typeof SUPPORTED_PLATFORMS[number]

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'

function buildAuthUrl(platform: Platform, state: string, codeChallenge?: string): string {
  const redirectUri = `${BASE_URL}/api/auth/callback/${platform}`

  if (platform === 'instagram' || platform === 'facebook') {
    const params = new URLSearchParams({
      client_id:     process.env.META_APP_ID ?? '',
      redirect_uri:  redirectUri,
      scope:         'instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts,pages_show_list',
      response_type: 'code',
      state,
    })
    return `https://www.facebook.com/v25.0/dialog/oauth?${params}`
  }

  if (platform === 'linkedin') {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     process.env.LINKEDIN_CLIENT_ID ?? '',
      redirect_uri:  redirectUri,
      scope:         'openid profile w_member_social',
      state,
    })
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`
  }

  if (platform === 'x') {
    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             process.env.X_CLIENT_ID ?? '',
      redirect_uri:          redirectUri,
      scope:                 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge:        codeChallenge!,
      code_challenge_method: 'S256',
    })
    return `https://twitter.com/i/oauth2/authorize?${params}`
  }

  // tiktok
  const params = new URLSearchParams({
    client_key:            process.env.TIKTOK_CLIENT_KEY ?? '',
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 'user.info.basic,video.publish',
    state,
    code_challenge:        codeChallenge!,
    code_challenge_method: 'S256',
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(64).toString('base64url').slice(0, 128)
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const platform = params.platform as Platform
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 })
  }

  const state = crypto.randomBytes(32).toString('hex')
  let codeVerifier: string | undefined
  let codeChallenge: string | undefined

  if (platform === 'x' || platform === 'tiktok') {
    const pkce = generatePKCE()
    codeVerifier = pkce.verifier
    codeChallenge = pkce.challenge
  }

  const cookieValue = JSON.stringify({ state, codeVerifier })
  const authUrl = buildAuthUrl(platform, state, codeChallenge)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set(`oauth_state_${platform}`, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
