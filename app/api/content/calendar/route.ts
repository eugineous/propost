import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date().toISOString()
  const to = searchParams.get('to') ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const db = getDb()
    const rows = await db`
      SELECT * FROM content_queue
      WHERE scheduled_at >= ${from}
        AND scheduled_at <= ${to}
      ORDER BY scheduled_at ASC
    `
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getDb()
    const rows = await withRetry(() =>
      db`
        INSERT INTO content_queue (platform, content_pillar, content, scheduled_at, status, created_by)
        VALUES (${body.platform}, ${body.contentPillar}, ${body.content}, ${body.scheduledAt}, 'scheduled', 'founder')
        RETURNING *
      `
    )
    return NextResponse.json((rows as unknown[])[0])
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create content' },
      { status: 500 }
    )
  }
}
