export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { agentLearnings } from '@/lib/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const learnings = await db
      .select()
      .from(agentLearnings)
      .orderBy(desc(agentLearnings.createdAt))
      .limit(100)

    return NextResponse.json({ learnings })
  } catch (err) {
    console.error('[learnings] fetch error:', err)
    return NextResponse.json({ learnings: [] })
  }
}

