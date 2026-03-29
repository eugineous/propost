export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as novaRun } from '@/agents/linkedelite/nova'
import { publishPost } from '@/lib/platforms/linkedin'
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
      .where(and(eq(posts.platform, 'linkedin'), eq(posts.status, 'scheduled'), lte(posts.scheduledAt, now)))
      .orderBy(asc(posts.scheduledAt))
      .limit(1)

    if (due) {
      if (!due.hawkApproved) {
        const decision = await hawkReview(due.content, 'linkedin', due.agentName)
        if (!decision.approved) {
          await db.update(posts).set({ status: 'blocked', hawkApproved: false, hawkRiskScore: decision.riskScore }).where(eq(posts.id, due.id))
          return NextResponse.json({ ok: false, reason: 'HAWK blocked scheduled post', blockedReasons: decision.blockedReasons })
        }
        await db.update(posts).set({ hawkApproved: true, hawkRiskScore: decision.riskScore }).where(eq(posts.id, due.id))
      }

      const { postId } = await publishPost(due.content)
      await incrementRateLimit(due.agentName, 'postsToday')

      await db.update(posts).set({
        status: 'published',
        platformId: postId,
        publishedAt: now,
      }).where(eq(posts.id, due.id))

      await db.insert(agentActions).values({
        agentName: due.agentName,
        company: 'linkedelite',
        actionType: 'post_published',
        details: { postId, scheduledPostId: due.id, content: due.content.slice(0, 100) },
        outcome: 'success',
      })

      return NextResponse.json({ ok: true, mode: 'scheduled', postId, scheduledPostId: due.id })
    }

    // Run NOVA to generate content
    const novaResult = await novaRun('Generate a LinkedIn post for Eugine Micah')

    let content = ''
    try {
      const raw = novaResult.data.response as string
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { content?: string }
        content = parsed.content ?? ''
      }
    } catch {
      content = novaResult.data.response as string
    }

    if (!content) {
      return NextResponse.json({ ok: false, reason: 'NOVA produced no content' })
    }

    // HAWK review
    const decision = await hawkReview(content, 'linkedin', 'nova')

    if (!decision.approved) {
      return NextResponse.json({ ok: false, reason: 'HAWK blocked', blockedReasons: decision.blockedReasons })
    }

    // Publish
    const { postId } = await publishPost(content)

    // Increment rate limit counter
    await incrementRateLimit('nova', 'postsToday')

    // Save to posts table
    await db.insert(posts).values({
      platform: 'linkedin',
      content,
      status: 'published',
      platformId: postId,
      publishedAt: new Date(),
      agentName: 'nova',
      hawkApproved: true,
      hawkRiskScore: decision.riskScore,
    })

    await db.insert(agentActions).values({
      agentName: 'nova',
      company: 'linkedelite',
      actionType: 'post_published',
      details: { postId, content: content.slice(0, 100) },
      outcome: 'success',
    })

    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    console.error('[cron/li-post]', err)
    return NextResponse.json({ error: 'LinkedIn post failed' }, { status: 500 })
  }
}

