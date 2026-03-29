// ============================================================
// ProPost Empire — Webhook API Routes
// ============================================================
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { chatRespond } from '@/lib/chat'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { DMContext } from '@/lib/types'

function validateInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-internal-secret')
  return secret === process.env.INTERNAL_SECRET
}

export async function POST(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = params.platform
  let body: Record<string, unknown>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (platform === 'instagram') {
      // Instagram DM → chatRespond()
      const entry = (body.entry as Array<{
        messaging?: Array<{
          sender: { id: string }
          message: { mid: string; text: string }
          timestamp: number
        }>
      }>)?.[0]

      const messaging = entry?.messaging?.[0]
      if (messaging?.message?.text) {
        const dm: DMContext = {
          senderId: messaging.sender.id,
          senderUsername: messaging.sender.id,
          messageText: messaging.message.text,
          receivedAt: new Date(messaging.timestamp),
          threadHistory: [],
        }
        await chatRespond(dm)
      }
    }

    if (platform === 'x') {
      // X mention → emit SSE event for ECHO agent
      const tweets = body.tweet_create_events as Array<{ id_str: string; text: string; user: { screen_name: string } }> | undefined
      for (const tweet of tweets ?? []) {
        await db.insert(agentActions).values({
          agentName: 'echo',
          company: 'xforce',
          actionType: 'mention_received',
          details: {
            tweetId: tweet.id_str,
            text: tweet.text,
            from: tweet.user?.screen_name,
          },
          outcome: 'pending_human',
        })
      }
    }

    if (platform === 'facebook') {
      // Facebook comment → emit SSE event for COMMUNITY agent
      const entry = (body.entry as Array<{
        changes?: Array<{ value: { comment_id: string; message: string; from: { name: string } } }>
      }>)?.[0]

      const change = entry?.changes?.[0]
      if (change?.value) {
        await db.insert(agentActions).values({
          agentName: 'community',
          company: 'pagepower',
          actionType: 'comment_received',
          details: {
            commentId: change.value.comment_id,
            message: change.value.message,
            from: change.value.from?.name,
          },
          outcome: 'pending_human',
        })
      }
    }

    if (platform === 'linkedin') {
      // LinkedIn events — log for processing
      await db.insert(agentActions).values({
        agentName: 'atlas',
        company: 'linkedelite',
        actionType: 'linkedin_event',
        details: body,
        outcome: 'success',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`[webhook/${platform}] Error:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
