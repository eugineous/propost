export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

async function hit(path: string, cronSecret: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { 'x-cron-secret': cronSecret } })
  return { path, ok: res.ok, status: res.status, text: res.ok ? undefined : await res.text().catch(() => undefined) }
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cronSecret = process.env.CRON_SECRET ?? ''
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'

  // Always-on duties (safe + deterministic)
  const core = [
    '/api/cron/scout',
    '/api/cron/sentry',
    '/api/cron/metrics-sync',
    '/api/cron/ig-backlog',
  ]

  // Platform work only if env looks connected (so we don’t silently “do nothing”)
  const liEnabled = Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN)
  const fbEnabled = Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID)

  const optional: string[] = []
  if (liEnabled) optional.push('/api/cron/li-post')
  if (fbEnabled) optional.push('/api/cron/fb-engage')

  const targets = [...core, ...optional]

  const results = await Promise.allSettled(targets.map((p) => hit(p, cronSecret, baseUrl)))
  const flattened = results.map((r, i) => ({
    target: targets[i],
    ...(r.status === 'fulfilled' ? r.value : { ok: false, status: 0, text: String(r.reason) }),
  }))

  // Always log a commander-level summary so the HQ looks “alive” even when you’re away
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'autopilot_tick',
    details: {
      summary: `Autopilot tick ran ${targets.length} jobs (${flattened.filter((x) => x.ok).length} ok)`,
      targets,
      linkedin: liEnabled ? 'enabled' : 'missing LINKEDIN_ACCESS_TOKEN/LINKEDIN_AUTHOR_URN',
      facebook: fbEnabled ? 'enabled' : 'missing FACEBOOK_ACCESS_TOKEN/FACEBOOK_PAGE_ID',
      results: flattened.slice(0, 12),
    },
    outcome: flattened.every((x) => x.ok) ? 'success' : 'error',
  })

  // If LI/FB not connected, emit explicit “blocked” actions (no silence)
  if (!liEnabled) {
    await db.insert(agentActions).values({
      agentName: 'nova',
      company: 'linkedelite',
      actionType: 'platform_not_connected',
      details: { summary: 'LinkedIn not connected (missing LINKEDIN_ACCESS_TOKEN/LINKEDIN_AUTHOR_URN)' },
      outcome: 'blocked',
    })
  }
  if (!fbEnabled) {
    await db.insert(agentActions).values({
      agentName: 'chief',
      company: 'pagepower',
      actionType: 'platform_not_connected',
      details: { summary: 'Facebook not connected (missing FACEBOOK_ACCESS_TOKEN/FACEBOOK_PAGE_ID)' },
      outcome: 'blocked',
    })
  }

  return NextResponse.json({ ok: true, targets, results: flattened })
}

