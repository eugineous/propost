import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  try {
    const db = getDb()
    const rows = await db`
      SELECT * FROM approval_queue
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT 100
    `
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch approval queue' },
      { status: 500 }
    )
  }
}
