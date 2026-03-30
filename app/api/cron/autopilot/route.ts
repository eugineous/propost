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

  // Current UTC time for scheduling time-based jobs
  const now = new Date()
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()
  const currentDay = now.getUTCDay() // 0 = Sunday

  // Helper: returns true when we are within the first 5 minutes of the target hour
  function isWithinWindow(targetHour: number): boolean {
    return currentHour === targetHour && currentMinute < 5
  }

  // Always-on duties (safe + deterministic, run every tick)
  const core = [
    '/api/cron/scout',
    '/api/cron/sentry',
    '/api/cron/metrics-sync',
    '/api/cron/ig-backlog',
  ]

  // Platform work only if env looks connected (so we don't silently "do nothing")
  const igEnabled = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
  const xEnabled = Boolean(
    (process.env.X_API_KEY || process.env.TWITTER_API_KEY) &&
    (process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN)
  )
  const liEnabled = Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN)
  const fbEnabled = Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID)

  const optional: string[] = []

  // LinkedIn and Facebook: run every tick when connected
  if (liEnabled) optional.push('/api/cron/li-post')
  if (fbEnabled) optional.push('/api/cron/fb-engage')

  // Instagram: once per day at 10:00 UTC (13:00 EAT)
  if (igEnabled && isWithinWindow(10)) optional.push('/api/cron/ig-post')

  // X/Twitter: four times per day at 09, 13, 17, 21 UTC
  if (xEnabled) {
    for (const hour of [9, 13, 17, 21]) {
      if (isWithinWindow(hour)) {
        optional.push('/api/cron/x-post')
        break // only add once even if two hours somehow align
      }
    }
  }

  // Daily briefing at 03:00 UTC (06:00 EAT)
  if (isWithinWindow(3)) optional.push('/api/cron/briefing')

  // SITREP at 04:00 UTC
  if (isWithinWindow(4)) optional.push('/api/cron/sitrep')

  // Content governance at 05:00 UTC
  if (isWithinWindow(5)) optional.push('/api/cron/content-govern')

  // Content recycling at 12:00 UTC
  if (isWithinWindow(12)) optional.push('/api/cron/recycle')

  // Weekly jobs: Sunday at 23:00 UTC
  if (currentDay === 0 && isWithinWindow(23)) {
    optional.push('/api/cron/memory')
    optional.push('/api/cron/analytics-learn')
  }

  const targets = [...core, ...optional]

  const results = await Promise.allSettled(targets.map((p) => hit(p, cronSecret, baseUrl)))
  const flattened = results.map((r, i) => ({
    target: targets[i],
    ...(r.status === 'fulfilled' ? r.value : { ok: false, status: 0, text: String(r.reason) }),
  }))

  // Always log a commander-level summary so the HQ looks "alive" even when you're away
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'autopilot_tick',
    details: {
      summary: `Autopilot tick ran ${targets.length} jobs (${flattened.filter((x) => x.ok).length} ok)`,
      targets,
      instagram: igEnabled ? 'enabled' : 'missing INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_BUSINESS_ACCOUNT_ID',
      x: xEnabled ? 'enabled' : 'missing TWITTER_API_KEY/TWITTER_ACCESS_TOKEN',
      linkedin: liEnabled ? 'enabled' : 'missing LINKEDIN_ACCESS_TOKEN/LINKEDIN_AUTHOR_URN',
      facebook: fbEnabled ? 'enabled' : 'missing FACEBOOK_ACCESS_TOKEN/FACEBOOK_PAGE_ID',
      results: flattened.slice(0, 20),
    },
    outcome: flattened.every((x) => x.ok) ? 'success' : 'error',
  })

  // Emit explicit "blocked" actions for disconnected platforms (no silence)
  if (!igEnabled) {
    await db.insert(agentActions).values({
      agentName: 'aria',
      company: 'igcommand',
      actionType: 'platform_not_connected',
      details: { summary: 'Instagram not connected (missing INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_BUSINESS_ACCOUNT_ID)' },
      outcome: 'blocked',
    })
  }
  if (!xEnabled) {
    await db.insert(agentActions).values({
      agentName: 'blaze',
      company: 'xforce',
      actionType: 'platform_not_connected',
      details: { summary: 'X not connected (missing TWITTER_API_KEY/TWITTER_ACCESS_TOKEN)' },
      outcome: 'blocked',
    })
  }
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
