export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { agentActions, messages, posts } from '@/lib/schema'
import { getComments, moderateComment } from '@/lib/platforms/facebook'
import { and, desc, eq, isNotNull } from 'drizzle-orm'

// Keywords that trigger auto-hide (spam / offensive patterns)
const SPAM_PATTERNS = [/buy\s+now/i, /click\s+here/i, /follow\s+back/i, /dm\s+me/i, /free\s+gift/i]

function isSpam(text: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(text))
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fbEnabled = Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID)
  if (!fbEnabled) {
    await db.insert(agentActions).values({
      agentName: 'community',
      company: 'pagepower',
      actionType: 'platform_not_connected',
      details: { summary: 'Facebook not connected (missing FACEBOOK_ACCESS_TOKEN/FACEBOOK_PAGE_ID)' },
      outcome: 'blocked',
    })
    return NextResponse.json({ ok: false, reason: 'facebook_not_connected' })
  }

  // Fetch the 5 most recently published Facebook posts that have a platform ID
  const recentPosts = await db
    .select({ id: posts.id, platformId: posts.platformId, content: posts.content })
    .from(posts)
    .where(and(eq(posts.platform, 'facebook'), isNotNull(posts.platformId)))
    .orderBy(desc(posts.publishedAt))
    .limit(5)

  if (recentPosts.length === 0) {
    await db.insert(agentActions).values({
      agentName: 'community',
      company: 'pagepower',
      actionType: 'fb_engage_tick',
      details: { summary: 'No published Facebook posts found in DB yet; skipping comment sweep.' },
      outcome: 'success',
    })
    return NextResponse.json({ ok: true, message: 'no fb posts yet', commentsSeen: 0 })
  }

  let totalComments = 0
  let hiddenCount = 0
  let loggedCount = 0
  const errors: string[] = []

  for (const post of recentPosts) {
    let comments: Awaited<ReturnType<typeof getComments>>
    try {
      comments = await getComments(post.platformId!)
    } catch (err) {
      errors.push(`post ${post.platformId}: ${String(err)}`)
      continue
    }

    totalComments += comments.length

    for (const comment of comments) {
      // De-duplicate: skip comments already logged
      const existing = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.platformMsgId, comment.id))
        .limit(1)

      if (existing.length > 0) continue

      // Auto-hide spam
      if (isSpam(comment.message)) {
        try {
          await moderateComment(comment.id, 'hide')
          hiddenCount++
          await db.insert(agentActions).values({
            agentName: 'community',
            company: 'pagepower',
            actionType: 'comment_moderated',
            details: {
              commentId: comment.id,
              postId: post.platformId,
              from: comment.from,
              action: 'hide',
              reason: 'spam_pattern',
              preview: comment.message.slice(0, 120),
            },
            outcome: 'success',
          })
        } catch (err) {
          errors.push(`moderate ${comment.id}: ${String(err)}`)
        }
        continue
      }

      // Log legitimate comment as a message record
      await db.insert(messages).values({
        platform: 'facebook',
        platformMsgId: comment.id,
        senderId: comment.from,
        senderUsername: comment.from,
        content: comment.message,
        status: 'pending',
        receivedAt: new Date(comment.createdTime),
        agentName: 'community',
      })
      loggedCount++

      await db.insert(agentActions).values({
        agentName: 'community',
        company: 'pagepower',
        actionType: 'comment_replied',
        details: {
          commentId: comment.id,
          postId: post.platformId,
          from: comment.from,
          preview: comment.message.slice(0, 120),
        },
        outcome: 'success',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    postsScanned: recentPosts.length,
    totalComments,
    newLogged: loggedCount,
    autoHidden: hiddenCount,
    errors: errors.length ? errors : undefined,
  })
}
