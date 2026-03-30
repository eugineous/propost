export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { platformConnections } from '@/lib/schema'

const ALL_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select({
    platform:         platformConnections.platform,
    expiresAt:        platformConnections.expiresAt,
    scope:            platformConnections.scope,
    platformUserId:   platformConnections.platformUserId,
    platformUsername: platformConnections.platformUsername,
    updatedAt:        platformConnections.updatedAt,
  }).from(platformConnections)

  const connectedMap = new Map(rows.map(r => [r.platform, r]))

  const result = ALL_PLATFORMS.map(platform => {
    const row = connectedMap.get(platform)
    if (!row) return { platform, connected: false }

    const now = Date.now()
    const expiresAt = row.expiresAt
    const daysUntilExpiry = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 86400000))
      : null

    return {
      platform,
      connected: true,
      platformUsername: row.platformUsername ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      daysUntilExpiry,
      scope: row.scope ?? null,
      lastUpdated: row.updatedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json(result)
}
