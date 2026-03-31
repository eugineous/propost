import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function GET() {
  try {
    const db = getDb()
    // Never expose raw credential values — only status metadata
    const rows = await db`
      SELECT id, platform, status, last_verified, expires_at, scopes, error_message, updated_at
      FROM platform_connections
      ORDER BY platform
    `
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}
