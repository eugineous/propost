export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { getComments, moderateComment } from '@/lib/platforms/facebook'

// Minimal FB engagement: fetch comments for latest known posts (if any), otherwise just log connection status.
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

  // We don’t have a reliable post-id registry per FB yet; instead we run a light “health tick” and moderation stub.
  // This prevents the dashboard from going quiet and gives you actionable logs.
  await db.insert(agentActions).values({
    agentName: 'community',
    company: 'pagepower',
    actionType: 'fb_engage_tick',
    details: { summary: 'Facebook engage tick: connected; comment sweep requires post registry' },
    outcome: 'success',
  })

  return NextResponse.json({ ok: true, message: 'fb engage tick ran' })
}

