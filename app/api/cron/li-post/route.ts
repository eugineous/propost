export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as oratorRun } from '@/agents/linkedelite/orator'
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
        details: {
          platform: 'linkedin',
          platformPostId: postId,
          scheduledPostId: due.id,
          contentPreview: due.content.slice(0, 160),
        },
        outcome: 'success',
      })

      return NextResponse.json({ ok: true, mode: 'scheduled', postId, scheduledPostId: due.id })
    }

    // Run ORATOR to generate content with full knowledge base
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const oratorResult = await oratorRun(
      `Generate a LinkedIn post for Eugine Micah. Today is ${day}. ` +
      `Use the weekly pillar rotation: Monday=Youth Empowerment, Tuesday=Media/Urban News, ` +
      `Wednesday=Elite Conversations, Thursday=Entrepreneurship, Friday=Trending Topics, ` +
      `Saturday=Personal Story, Sunday=AI Weekly Roundup. ` +
      `Search for the latest AI news first, then write a post that sounds authentically like Eugine. ` +
      `Apply the 5-step pre-post framework. Return JSON with a "content" field.`
    )

    let content = ''
    try {
      const raw = oratorResult.data.response as string
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { content?: string; hookLine?: string }
        content = parsed.content ?? ''
      }
      if (!content) content = raw.trim()
    } catch {
      content = oratorResult.data.response as string
    }

    if (!content) {
      return NextResponse.json({ ok: false, reason: 'ORATOR produced no content' })
    }

    // HAWK review
    const decision = await hawkReview(content, 'linkedin', 'orator')

    if (!decision.approved) {
      return NextResponse.json({ ok: false, reason: 'HAWK blocked', blockedReasons: decision.blockedReasons })
    }

    // Publish
    const { postId } = await publishPost(content)

    await incrementRateLimit('orator', 'postsToday')

    await db.insert(posts).values({
      platform: 'linkedin',
      content,
      status: 'published',
      platformId: postId,
      publishedAt: new Date(),
      agentName: 'orator',
      hawkApproved: true,
      hawkRiskScore: decision.riskScore,
    })

    await db.insert(agentActions).values({
      agentName: 'orator',
      company: 'linkedelite',
      actionType: 'post_published',
      details: {
        platform: 'linkedin',
        platformPostId: postId,
        contentPreview: content.slice(0, 160),
      },
      outcome: 'success',
    })

    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    console.error('[cron/li-post]', err)
    return NextResponse.json({ error: 'LinkedIn post failed' }, { status: 500 })
  }
}

