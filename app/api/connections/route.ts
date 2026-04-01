// GET /api/connections — returns platform connection statuses
// POST /api/connections/verify — verifies all configured platforms live

import { NextResponse } from 'next/server'

const PLATFORMS = ['x', 'instagram', 'facebook', 'linkedin', 'website', 'tiktok', 'youtube', 'reddit', 'mastodon', 'truthsocial'] as const

function getPlatformStatus(platform: string): 'connected' | 'not_configured' | 'disconnected' {
  switch (platform) {
    case 'x':
      return process.env.X_API_KEY && process.env.X_ACCESS_TOKEN ? 'connected' : 'not_configured'
    case 'instagram':
      return process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'connected' : 'not_configured'
    case 'facebook':
      return process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID ? 'connected' : 'not_configured'
    case 'linkedin':
      return process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN ? 'connected' : 'not_configured'
    case 'website':
      return 'connected'
    // Browser-session platforms — status comes from DB only
    case 'tiktok':
    case 'youtube':
    case 'reddit':
    case 'mastodon':
    case 'truthsocial':
      return 'disconnected'
    default:
      return 'not_configured'
  }
}

export async function GET() {
  try {
    // Try DB first
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const rows = await db`
      SELECT id, platform, status, last_verified, expires_at, scopes, error_message, updated_at
      FROM platform_connections
      ORDER BY platform
    `

    const dbPlatforms = new Set((rows as Array<{ platform: string }>).map((r) => r.platform))

    // Merge DB rows with env-var detection for platforms not yet in DB
    const result = [...(rows as unknown[])]
    for (const platform of PLATFORMS) {
      if (!dbPlatforms.has(platform)) {
        const status = getPlatformStatus(platform)
        result.push({
          id: null,
          platform,
          status,
          last_verified: null,
          expires_at: null,
          scopes: null,
          error_message: status === 'not_configured' ? 'API credentials not set' : null,
          updated_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json(Array.isArray(result) ? result : [])
  } catch {
    // DB not available — return env-var based statuses
    const result = PLATFORMS.map((platform) => ({
      id: null,
      platform,
      status: getPlatformStatus(platform),
      last_verified: null,
      expires_at: null,
      scopes: null,
      error_message: getPlatformStatus(platform) === 'not_configured' ? 'API credentials not set' : null,
      updated_at: new Date().toISOString(),
    }))
    return NextResponse.json(result)
  }
}
