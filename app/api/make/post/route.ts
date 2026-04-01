// POST /api/make/post
// Send content to Make.com webhook for posting to any platform.
// Make handles the actual platform posting via its app connections.

import { NextRequest, NextResponse } from 'next/server'
import { postViaMake, type MakePostPayload } from '@/lib/make/client'
import { logAction } from '@/lib/logger'
import { propostEvents } from '@/lib/events'

export async function POST(req: NextRequest) {
  let body: MakePostPayload & { platforms?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const platforms = body.platforms ?? (body.platform ? [body.platform] : [])
  if (platforms.length === 0) {
    return NextResponse.json({ ok: false, error: 'platform or platforms required' }, { status: 400 })
  }

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const result = await postViaMake({ ...body, platform })

      // Log the action
      await logAction({
        agentName: body.agentName ?? 'MAKE_BRIDGE',
        company: 'system',
        platform: platform as never,
        actionType: 'make_webhook_post',
        content: body.content,
        status: result.ok ? 'success' : 'failed',
        platformResponse: result,
      }).catch(() => {})

      // Emit live activity
      if (result.ok) {
        propostEvents.emit('activity', {
          id: crypto.randomUUID(),
          type: 'post',
          agentName: body.agentName ?? 'MAKE',
          company: 'system',
          platform,
          contentPreview: body.content.slice(0, 80),
          timestamp: new Date().toISOString(),
        })
      }

      return result
    })
  )

  const allOk = results.every(r => r.ok)
  const anyOk = results.some(r => r.ok)

  return NextResponse.json(
    { ok: anyOk, results },
    { status: allOk ? 200 : anyOk ? 207 : 500 }
  )
}
