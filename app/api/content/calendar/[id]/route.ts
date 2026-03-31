import { NextRequest, NextResponse } from 'next/server'
import { getDb, withRetry } from '@/lib/db/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const db = getDb()
    await withRetry(() =>
      db`
        UPDATE content_queue
        SET content = COALESCE(${body.content ?? null}, content),
            scheduled_at = COALESCE(${body.scheduledAt ?? null}, scheduled_at),
            platform = COALESCE(${body.platform ?? null}, platform)
        WHERE id = ${params.id}
      `
    )
    return NextResponse.json({ updated: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    await withRetry(() =>
      db`UPDATE content_queue SET status = 'cancelled' WHERE id = ${params.id}`
    )
    return NextResponse.json({ cancelled: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cancel failed' },
      { status: 500 }
    )
  }
}
