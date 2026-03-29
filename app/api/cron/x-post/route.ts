export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as blazeRun } from '@/agents/xforce/blaze'
import { postTweet } from '@/lib/platforms/x'
import { incrementRateLimit } from '@/lib/agentState'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run BLAZE to generate content
    const blazeResult = await blazeRun('Generate a tweet for Eugine Micah based on current trends and content pillars')

    let content = ''
    try {
      const raw = blazeResult.data.response as string
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { tweets?: Array<{ text: string }> }
        content = parsed.tweets?.[0]?.text ?? ''
      }
    } catch {
      content = blazeResult.data.response as string
    }

    if (!content) {
      return NextResponse.json({ ok: false, reason: 'BLAZE produced no content' })
    }

    // HAWK review
    const decision = await hawkReview(content, 'x', 'blaze')

    if (!decision.approved) {
      return NextResponse.json({ ok: false, reason: 'HAWK blocked', blockedReasons: decision.blockedReasons })
    }

    // Publish
    const { tweetId, url } = await postTweet(content)

    // Increment rate limit counter
    await incrementRateLimit('blaze', 'postsToday')

    // Save to posts table
    await db.insert(posts).values({
      platform: 'x',
      content,
      status: 'published',
      platformId: tweetId,
      publishedAt: new Date(),
      agentName: 'blaze',
      hawkApproved: true,
      hawkRiskScore: decision.riskScore,
    })

    await db.insert(agentActions).values({
      agentName: 'blaze',
      company: 'xforce',
      actionType: 'post_published',
      details: { tweetId, url, content: content.slice(0, 100) },
      outcome: 'success',
    })

    return NextResponse.json({ ok: true, tweetId, url })
  } catch (err) {
    console.error('[cron/x-post]', err)
    return NextResponse.json({ error: 'X post failed' }, { status: 500 })
  }
}

