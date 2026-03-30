export const dynamic = 'force-dynamic'
// Seed endpoint — store tokens directly into platform_connections
// Protected by INTERNAL_SECRET. Use this to bypass OAuth for platforms
// where you already have valid tokens.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { platformConnections } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    platform: string
    accessToken: string
    refreshToken?: string
    expiresAt?: string
    scope?: string
    platformUserId?: string
    platformUsername?: string
  }

  if (!body.platform || !body.accessToken) {
    return NextResponse.json({ error: 'platform and accessToken required' }, { status: 400 })
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined

  const existing = await db.select().from(platformConnections)
    .where(eq(platformConnections.platform, body.platform))

  if (existing.length > 0) {
    await db.update(platformConnections)
      .set({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        expiresAt,
        scope: body.scope,
        platformUserId: body.platformUserId,
        platformUsername: body.platformUsername,
        updatedAt: new Date(),
      })
      .where(eq(platformConnections.platform, body.platform))
  } else {
    await db.insert(platformConnections).values({
      platform: body.platform,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt,
      scope: body.scope,
      platformUserId: body.platformUserId,
      platformUsername: body.platformUsername,
    })
  }

  return NextResponse.json({ ok: true, platform: body.platform })
}
