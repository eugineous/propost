import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function POST() {
  try {
    const db = getDb()
    const result = await db`
      UPDATE approval_queue
      SET status = 'rejected', rejection_reason = 'Bulk rejected by founder'
      WHERE status = 'pending'
      RETURNING id
    `
    return NextResponse.json({ ok: true, rejected: (result as unknown[]).length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reject all' },
      { status: 500 }
    )
  }
}
