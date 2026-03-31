import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get('company')
  const agent = searchParams.get('agent')
  const status = searchParams.get('status')
  const platform = searchParams.get('platform')

  try {
    const db = getDb()
    const rows = await db`
      SELECT * FROM tasks
      WHERE TRUE
        ${company ? db`AND company = ${company}` : db``}
        ${agent ? db`AND assigned_agent = ${agent}` : db``}
        ${status ? db`AND status = ${status}` : db``}
        ${platform ? db`AND platform = ${platform}` : db``}
      ORDER BY priority ASC, created_at DESC
      LIMIT 200
    `
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
