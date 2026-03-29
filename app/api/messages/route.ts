export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages } from '@/lib/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.receivedAt))
      .limit(200)

    return NextResponse.json({ messages: rows })
  } catch (err) {
    console.error('[messages] fetch error:', err)
    return NextResponse.json({ messages: [] })
  }
}

