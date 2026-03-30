// ============================================================
// ProPost Empire — Shared OAuth Token Helper
// ============================================================

import { db } from '@/lib/db'
import { platformConnections } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export class PlatformNotConnectedError extends Error {
  constructor(platform: string) {
    super(`Platform "${platform}" is not connected. Visit /settings/connections to connect it.`)
    this.name = 'PlatformNotConnectedError'
  }
}

const REFRESH_URLS: Record<string, string> = {
  instagram: 'https://graph.facebook.com/v25.0/oauth/access_token',
  facebook:  'https://graph.facebook.com/v25.0/oauth/access_token',
  linkedin:  'https://www.linkedin.com/oauth/v2/accessToken',
  x:         'https://api.twitter.com/2/oauth2/token',
  tiktok:    'https://open.tiktokapis.com/v2/oauth/token/',
}

/** Refresh the stored token for a platform and return the new access token. */
export async function refreshToken(platform: string): Promise<string> {
  const rows = await db.select().from(platformConnections).where(eq(platformConnections.platform, platform))
  const row = rows[0]
  if (!row?.refreshToken) throw new PlatformNotConnectedError(platform)

  const refreshUrl = REFRESH_URLS[platform]
  if (!refreshUrl) throw new Error(`No refresh URL configured for platform: ${platform}`)

  let body: URLSearchParams

  if (platform === 'x') {
    // X OAuth 2.0 — Basic auth with client credentials
    const clientId     = process.env.X_CLIENT_ID ?? ''
    const clientSecret = process.env.X_CLIENT_SECRET ?? ''
    body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: row.refreshToken,
      client_id:     clientId,
    })
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`X token refresh failed: ${res.status} ${await res.text()}`)
    const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number }
    const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null
    await db.update(platformConnections)
      .set({ accessToken: json.access_token, refreshToken: json.refresh_token ?? row.refreshToken, expiresAt, updatedAt: new Date() })
      .where(eq(platformConnections.platform, platform))
    return json.access_token
  }

  if (platform === 'tiktok') {
    body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: row.refreshToken,
      client_key:    process.env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
    })
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status} ${await res.text()}`)
    const json = await res.json() as { data?: { access_token: string; refresh_token?: string; expires_in?: number } }
    const data = json.data
    if (!data?.access_token) throw new Error('TikTok refresh returned no access_token')
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null
    await db.update(platformConnections)
      .set({ accessToken: data.access_token, refreshToken: data.refresh_token ?? row.refreshToken, expiresAt, updatedAt: new Date() })
      .where(eq(platformConnections.platform, platform))
    return data.access_token
  }

  if (platform === 'linkedin') {
    body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: row.refreshToken,
      client_id:     process.env.LINKEDIN_CLIENT_ID ?? '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
    })
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${res.status} ${await res.text()}`)
    const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number }
    const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null
    await db.update(platformConnections)
      .set({ accessToken: json.access_token, refreshToken: json.refresh_token ?? row.refreshToken, expiresAt, updatedAt: new Date() })
      .where(eq(platformConnections.platform, platform))
    return json.access_token
  }

  // Meta (instagram / facebook) — fb_exchange_token
  body = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         process.env.META_APP_ID ?? '',
    client_secret:     process.env.META_APP_SECRET ?? '',
    fb_exchange_token: row.accessToken,
  })
  const res = await fetch(refreshUrl, {
    method: 'GET',
    // Meta long-lived token exchange uses GET with query params
  })
  // Use GET with query string for Meta
  const metaUrl = `${refreshUrl}?${body.toString()}`
  const metaRes = await fetch(metaUrl)
  if (!metaRes.ok) throw new Error(`Meta token refresh failed: ${metaRes.status} ${await metaRes.text()}`)
  const json = await metaRes.json() as { access_token: string; expires_in?: number }
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null
  await db.update(platformConnections)
    .set({ accessToken: json.access_token, expiresAt, updatedAt: new Date() })
    .where(eq(platformConnections.platform, platform))
  // Mirror to the sibling Meta platform (instagram <-> facebook share the same token)
  const sibling = platform === 'instagram' ? 'facebook' : 'instagram'
  await db.update(platformConnections)
    .set({ accessToken: json.access_token, expiresAt, updatedAt: new Date() })
    .where(eq(platformConnections.platform, sibling))
  return json.access_token
}

/** Get the access token for a platform, refreshing on-demand if expiring within 5 minutes. */
export async function getToken(platform: string): Promise<string> {
  const rows = await db.select().from(platformConnections).where(eq(platformConnections.platform, platform))
  const row = rows[0]
  if (!row) throw new PlatformNotConnectedError(platform)

  // Refresh if expiring within 5 minutes and a refresh token is available
  if (row.expiresAt && row.refreshToken) {
    const msUntilExpiry = row.expiresAt.getTime() - Date.now()
    if (msUntilExpiry < 5 * 60 * 1000) {
      return refreshToken(platform)
    }
  }

  return row.accessToken
}
