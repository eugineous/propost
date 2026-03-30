export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { platformConnections } from '@/lib/schema'
import { lte, isNotNull } from 'drizzle-orm'
import { refreshToken } from '@/lib/platforms/token'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find connections expiring within 48 hours
  const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const expiring = await db.select({
    platform: platformConnections.platform,
    expiresAt: platformConnections.expiresAt,
  })
    .from(platformConnections)
    .where(lte(platformConnections.expiresAt, cutoff))

  const results: Array<{ platform: string; ok: boolean; error?: string }> = []

  for (const row of expiring) {
    try {
      await refreshToken(row.platform)
      results.push({ platform: row.platform, ok: true })
    } catch (err) {
      console.error(`[refresh-tokens] failed for ${row.platform}:`, err)
      results.push({ platform: row.platform, ok: false, error: String(err).slice(0, 100) })
    }
  }

  return NextResponse.json({ ok: true, checked: expiring.length, results })
}
