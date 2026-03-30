export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as blazeRun } from '@/agents/xforce/blaze'
import { getMentions, postTweet, replyToTweet } from '@/lib/platforms/x'
import { incrementRateLimit } from '@/lib/agentState'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'
import { and, asc, eq, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1) Publish any scheduled post that is due
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
        details: {
          platform: 'x',
          platformPostId: tweetId,
          platformUrl: url,
          postId: due.id,
          contentPreview: due.content.slice(0, 160),
        },
        outcome: 'success',
      })

      // Also handle any pending mentions after publishing
      await handleMentions()

      return NextResponse.json({ ok: true, mode: 'scheduled', tweetId, url, postId: due.id })
    }

    // 2) Run BLAZE to generate content
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
      // No content generated — still handle mentions before returning
      await handleMentions()
      return NextResponse.json({ ok: false, reason: 'BLAZE produced no content' })
    }

    // HAWK review
    const decision = await hawkReview(content, 'x', 'blaze')

    if (!decision.approved) {
      await handleMentions()
      return NextResponse.json({ ok: false, reason: 'HAWK blocked', blockedReasons: decision.blockedReasons })
    }

    // 3) Publish
    let tweetId: string, url: string
    try {
      const result = await postTweet(content)
      tweetId = result.tweetId
      url = result.url
    } catch (postErr) {
      const msg = String(postErr)
      if (msg.includes('X_CREDITS_DEPLETED')) {
        // Save as draft — will be published when credits reset
        await db.insert(posts).values({
          platform: 'x', content, status: 'draft', agentName: 'blaze',
          hawkApproved: true, hawkRiskScore: decision.riskScore,
        })
        await db.insert(agentActions).values({
          agentName: 'blaze', company: 'xforce', actionType: 'post_queued_credits',
          details: { platform: 'x', reason: 'X free tier credits depleted — post saved as draft', contentPreview: content.slice(0, 160) },
          outcome: 'success',
        })
        return NextResponse.json({ ok: true, mode: 'draft_queued', reason: 'X credits depleted — post saved as draft, will publish when credits reset' })
      }
      throw postErr
    }

    // Increment rate limit counter
    await incrementRateLimit('blaze', 'postsToday')

    // 4) Save to posts table
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

    // 5) Log to agentActions
    await db.insert(agentActions).values({
      agentName: 'blaze',
      company: 'xforce',
      actionType: 'post_published',
      details: {
        platform: 'x',
        platformPostId: tweetId,
        platformUrl: url,
        contentPreview: content.slice(0, 160),
      },
      outcome: 'success',
    })

    // 6) Handle any pending mentions
    const mentionsSummary = await handleMentions()

    return NextResponse.json({ ok: true, tweetId, url, mentions: mentionsSummary })
  } catch (err) {
    console.error('[cron/x-post]', err)
    // Log failure to agent_actions so it's visible in the dashboard
    try {
      await db.insert(agentActions).values({
        agentName: 'blaze',
        company: 'xforce',
        actionType: 'post_failed',
        details: {
          platform: 'x',
          failureReason: String(err).slice(0, 300),
          summary: `X post failed: ${String(err).slice(0, 100)}`,
        },
        outcome: 'error',
      })
    } catch { /* ignore secondary DB error */ }
    return NextResponse.json({ error: 'X post failed', detail: String(err).slice(0, 200) }, { status: 500 })
  }
}

/**
 * Fetch recent mentions and reply to each one using BLAZE-generated text.
 * Non-critical: failures are caught and logged rather than propagated.
 */
async function handleMentions(): Promise<{ replied: number; errors: number }> {
  let replied = 0
  let errors = 0

  try {
    const mentions = await getMentions()

    for (const mention of mentions) {
      try {
        // Ask BLAZE to craft a reply
        const blazeResult = await blazeRun(
          `Write a short, friendly reply to this mention on X: "${mention.text}". Keep it under 200 characters.`
        )

        let replyText = ''
        try {
          const raw = blazeResult.data.response as string
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { reply?: string; text?: string }
            replyText = parsed.reply ?? parsed.text ?? ''
          }
          if (!replyText) replyText = raw.trim()
        } catch {
          replyText = blazeResult.data.response as string
        }

        if (!replyText) continue

        // HAWK review before replying
        const decision = await hawkReview(replyText, 'x', 'blaze')
        if (!decision.approved) {
          errors++
          continue
        }

        const { tweetId } = await replyToTweet(replyText, mention.id)

        await db.insert(agentActions).values({
          agentName: 'blaze',
          company: 'xforce',
          actionType: 'mention_replied',
          details: {
            platform: 'x',
            originalTweetId: mention.id,
            replyTweetId: tweetId,
            contentPreview: replyText.slice(0, 160),
          },
          outcome: 'success',
        })

        replied++
      } catch (mentionErr) {
        console.error('[cron/x-post] mention reply error', mentionErr)
        errors++
      }
    }
  } catch (err) {
    console.error('[cron/x-post] getMentions error', err)
    errors++
  }

  return { replied, errors }
}
