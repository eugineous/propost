import { NextResponse } from 'next/server'

// Returns platform connection statuses.
// Falls back to 'not configured' for all platforms if DB is unavailable.
export async function GET() {
  try {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const rows = await db`
      SELECT id, platform, status, last_verified, expires_at, scopes, error_message, updated_at
      FROM platform_connections
      ORDER BY platform
    `
    return NextResponse.json(Array.isArray(rows) ? rows : [])
  } catch {
    // DB not available — return safe empty array (not an error object)
    return NextResponse.json([])
  }
}
