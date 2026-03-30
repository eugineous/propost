export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'
import { incrementRateLimit } from '@/lib/agentState'

// Logs a successfully posted tweet (via browser automation) to the DB
export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { content, method = 'browser_automation' } = await req.json() as { content: string; method?: string }

    if (!content) return NextResponse.json({ ok: false, error: 'content required' }, { status: 400 })

    await db.insert(posts).values({
      platform: 'x',
      content,
      status: 'published',
      publishedAt: new Date(),
      agentName: 'blaze',
      hawkApproved: true,
    })

    await db.insert(agentActions).values({
      agentName: 'blaze',
      company: 'xforce',
      actionType: 'post_published',
      details: {
        platform: 'x',
        method,
        contentPreview: content.slice(0, 160),
        note: 'Posted via browser automation (no API credits used)',
      },
      outcome: 'success',
    })

    await incrementRateLimit('blaze', 'postsToday')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[x-log]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
