export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as blazeRun } from '@/agents/xforce/blaze'
import { postTweet } from '@/lib/platforms/x'
import { incrementRateLimit } from '@/lib/agentState'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'
import { and, asc, eq, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1) Publish any scheduled post that's due
    const now = new Date()
    const [due] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.platform, 'x'), eq(posts.status, 'scheduled'), lte(posts.scheduledAt, now)))
      .orderBy(asc(posts.scheduledAt))
      .limit(1)

    if (due) {
      // Safety: if not hawk approved, run review now.
      if (!due.hawkApproved) {
        const decision = await hawkReview(due.content, 'x', due.agentName)
        if (!decision.approved) {
          await db.update(posts).set({ status: 'blocked', hawkApproved: false, hawkRiskScore: decision.riskScore }).where(eq(posts.id, due.id))
          return NextResponse.json({ ok: false, reason: 'HAWK blocked scheduled post', blockedReasons: decision.blockedReasons })
        }
        await db.update(posts).set({ hawkApproved: true, hawkRiskScore: decision.riskScore }).where(eq(posts.id, due.id))
      }

      const { tweetId, url } = await postTweet(due.content)
      await incrementRateLimit(due.agentName, 'postsToday')

      await db.update(posts).set({
        status: 'published',
        platformId: tweetId,
        publishedAt: now,
      }).where(eq(posts.id, due.id))

      await db.insert(agentActions).values({
        agentName: due.agentName,
        company: 'xforce',
        actionType: 'post_published',
        details: { tweetId, url, postId: due.id, content: due.content.slice(0, 100) },
        outcome: 'success',
      })

      return NextResponse.json({ ok: true, mode: 'scheduled', tweetId, url, postId: due.id })
    }

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

