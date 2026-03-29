export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { hawkReview } from '@/lib/hawk'
import { run as auroraRun } from '@/agents/gramgod/aurora'
import { publishPost } from '@/lib/platforms/instagram'
import { incrementRateLimit } from '@/lib/agentState'
import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run AURORA to generate content
    const auroraResult = await auroraRun('Generate an Instagram post for Eugine Micah')

    let caption = ''
    let imageUrl = ''
    try {
      const raw = auroraResult.data.response as string
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { caption?: string; mediaDescription?: string }
        caption = parsed.caption ?? ''
        imageUrl = process.env.DEFAULT_IG_IMAGE_URL ?? ''
      }
    } catch {
      caption = auroraResult.data.response as string
    }

    if (!caption) {
      return NextResponse.json({ ok: false, reason: 'AURORA produced no content' })
    }

    // HAWK review
    const decision = await hawkReview(caption, 'instagram', 'aurora')

    if (!decision.approved) {
      return NextResponse.json({ ok: false, reason: 'HAWK blocked', blockedReasons: decision.blockedReasons })
    }

    if (!imageUrl) {
      return NextResponse.json({ ok: false, reason: 'No image URL available for Instagram post' })
    }

    // Publish
    const { postId } = await publishPost(caption, imageUrl)

    // Increment rate limit counter
    await incrementRateLimit('aurora', 'postsToday')

    // Save to posts table
    await db.insert(posts).values({
      platform: 'instagram',
      content: caption,
      status: 'published',
      platformId: postId,
      publishedAt: new Date(),
      agentName: 'aurora',
      hawkApproved: true,
      hawkRiskScore: decision.riskScore,
    })

    await db.insert(agentActions).values({
      agentName: 'aurora',
      company: 'gramgod',
      actionType: 'post_published',
      details: { postId, caption: caption.slice(0, 100) },
      outcome: 'success',
    })

    return NextResponse.json({ ok: true, postId })
  } catch (err) {
    console.error('[cron/ig-post]', err)
    return NextResponse.json({ error: 'Instagram post failed' }, { status: 500 })
  }
}

