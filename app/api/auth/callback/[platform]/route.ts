export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { platformConnections } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'
const SUPPORTED = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok']

export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  const platform = params.platform
  if (!SUPPORTED.includes(platform)) {
    return NextResponse.redirect(new URL('/settings/connections?error=unsupported_platform', req.url))
  }

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/settings/connections?error=${error}`, req.url))
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/connections?error=missing_code_or_state', req.url))
  }

  // Validate state cookie
  const cookieName = `oauth_state_${platform}`
  const cookieRaw  = req.cookies.get(cookieName)?.value
  if (!cookieRaw) {
    return NextResponse.redirect(new URL('/settings/connections?error=invalid_state', req.url))
  }
  let cookieData: { state: string; codeVerifier?: string }
  try { cookieData = JSON.parse(cookieRaw) } catch {
    return NextResponse.redirect(new URL('/settings/connections?error=invalid_state', req.url))
  }
  if (cookieData.state !== state) {
    return NextResponse.redirect(new URL('/settings/connections?error=invalid_state', req.url))
  }

  const redirectUri = `${BASE_URL}/api/auth/callback/${platform}`

  try {
    let accessToken: string
    let refreshToken: string | undefined
    let expiresAt: Date | undefined
    let scope: string | undefined
    let platformUserId: string | undefined
    let platformUsername: string | undefined

    // ── Meta (Instagram + Facebook) ──────────────────────────
    if (platform === 'instagram' || platform === 'facebook') {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v25.0/oauth/access_token?` +
        new URLSearchParams({
          client_id:     process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID ?? '',
          client_secret: process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET ?? '',
          redirect_uri:  redirectUri,
          code,
        })
      )
      if (!tokenRes.ok) throw new Error(`Meta token exchange failed: ${await tokenRes.text()}`)
      const tokenJson = await tokenRes.json() as { access_token: string; expires_in?: number }

      // Exchange for long-lived token
      const longRes = await fetch(
        `https://graph.facebook.com/v25.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type:        'fb_exchange_token',
          client_id:         process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID ?? '',
          client_secret:     process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET ?? '',
          fb_exchange_token: tokenJson.access_token,
        })
      )
      const longJson = await longRes.json() as { access_token: string; expires_in?: number }
      accessToken = longJson.access_token
      expiresAt   = longJson.expires_in ? new Date(Date.now() + longJson.expires_in * 1000) : undefined

      // Get user info
      const meRes  = await fetch(`https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${accessToken}`)
      const meJson = await meRes.json() as { id?: string; name?: string }
      platformUserId   = meJson.id
      platformUsername = meJson.name

      // Store for both instagram and facebook
      await upsertConnection('instagram', accessToken, undefined, expiresAt, scope, platformUserId, platformUsername)
      await upsertConnection('facebook',  accessToken, undefined, expiresAt, scope, platformUserId, platformUsername)

      const res = NextResponse.redirect(new URL('/settings/connections?connected=instagram', req.url))
      res.cookies.delete(cookieName)
      return res
    }

    // ── LinkedIn ──────────────────────────────────────────────
    if (platform === 'linkedin') {
      const body = new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     process.env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      })
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!tokenRes.ok) throw new Error(`LinkedIn token exchange failed: ${await tokenRes.text()}`)
      const tokenJson = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
      accessToken  = tokenJson.access_token
      refreshToken = tokenJson.refresh_token
      expiresAt    = tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : undefined
      scope        = tokenJson.scope

      // Get user info via OpenID
      const userRes  = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userJson = await userRes.json() as { sub?: string; name?: string; email?: string }
      platformUserId   = userJson.sub
      platformUsername = userJson.name ?? userJson.email
    }

    // ── X / Twitter (OAuth 2.0 PKCE) ─────────────────────────
    else if (platform === 'x') {
      const clientId     = process.env.X_CLIENT_ID ?? ''
      const clientSecret = process.env.X_CLIENT_SECRET ?? ''
      const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      const body = new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        code_verifier: cookieData.codeVerifier ?? '',
      })
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:  `Basic ${credentials}`,
        },
        body: body.toString(),
      })
      if (!tokenRes.ok) throw new Error(`X token exchange failed: ${await tokenRes.text()}`)
      const tokenJson = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
      accessToken  = tokenJson.access_token
      refreshToken = tokenJson.refresh_token
      expiresAt    = tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : undefined
      scope        = tokenJson.scope

      // Get user info
      const userRes  = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userJson = await userRes.json() as { data?: { id?: string; username?: string } }
      platformUserId   = userJson.data?.id
      platformUsername = userJson.data?.username ? `@${userJson.data.username}` : undefined
    }

    // ── TikTok ────────────────────────────────────────────────
    else if (platform === 'tiktok') {
      const body = new URLSearchParams({
        client_key:    process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code_verifier: cookieData.codeVerifier ?? '',
      })
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!tokenRes.ok) throw new Error(`TikTok token exchange failed: ${await tokenRes.text()}`)
      const tokenJson = await tokenRes.json() as { data?: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; open_id?: string } }
      const data = tokenJson.data
      if (!data?.access_token) throw new Error('TikTok returned no access_token')
      accessToken  = data.access_token
      refreshToken = data.refresh_token
      expiresAt    = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
      scope        = data.scope
      platformUserId = data.open_id

      // Get username
      const userRes  = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,username', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userJson = await userRes.json() as { data?: { user?: { display_name?: string; username?: string } } }
      platformUsername = userJson.data?.user?.username ?? userJson.data?.user?.display_name
    } else {
      throw new Error(`Unhandled platform: ${platform}`)
    }

    await upsertConnection(platform, accessToken!, refreshToken, expiresAt, scope, platformUserId, platformUsername)

    const res = NextResponse.redirect(new URL(`/settings/connections?connected=${platform}`, req.url))
    res.cookies.delete(cookieName)
    return res

  } catch (err) {
    console.error(`[oauth/callback/${platform}]`, err)
    const res = NextResponse.redirect(new URL('/settings/connections?error=token_exchange_failed', req.url))
    res.cookies.delete(cookieName)
    return res
  }
}

async function upsertConnection(
  platform: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date | undefined,
  scope: string | undefined,
  platformUserId: string | undefined,
  platformUsername: string | undefined,
) {
  const existing = await db.select().from(platformConnections).where(eq(platformConnections.platform, platform))
  if (existing.length > 0) {
    await db.update(platformConnections)
      .set({ accessToken, refreshToken, expiresAt, scope, platformUserId, platformUsername, updatedAt: new Date() })
      .where(eq(platformConnections.platform, platform))
  } else {
    await db.insert(platformConnections).values({
      platform, accessToken, refreshToken, expiresAt, scope, platformUserId, platformUsername,
    })
  }
}
