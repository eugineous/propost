// ============================================================
// ProPost Empire — SENTRY sentryCheck
// ============================================================

import { run } from '@/agents/intelcore/sentry'
import { pauseAgent, pauseCorpAgents, pauseAllAgents } from '@/lib/agentState'
import { CrisisTrigger, Corp } from '@/lib/types'
import { db } from '@/lib/db'
import { crisisEvents, agentActions } from '@/lib/schema'

async function sendGmailNotification(subject: string, body: string): Promise<void> {
  try {
    // Get OAuth2 access token via refresh token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token: string }

    const email = [
      `To: ${process.env.EUGINE_EMAIL ?? 'euginemicah@gmail.com'}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\n')

    const encoded = Buffer.from(email).toString('base64url')

    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    })
  } catch (err) {
    console.error('[sentry] Gmail notification failed:', err)
  }
}

export async function sentryCheck(): Promise<CrisisTrigger | null> {
  const result = await run('Scan all platform notification streams for crisis signals')

  let parsed: {
    crisisDetected: boolean
    level?: number
    description?: string
    platform?: string
    pauseScope?: string
    notifyEugine?: boolean
    trigger?: Record<string, unknown>
  }

  try {
    const raw = result.data.response as string
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in SENTRY response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return null
  }

  if (!parsed.crisisDetected) return null

  const level = (parsed.level ?? 1) as 1 | 2 | 3
  const description = parsed.description ?? 'Crisis detected'
  const pauseScope = (parsed.pauseScope ?? 'none') as CrisisTrigger['pauseScope']

  // Create crisis_events DB record
  await db.insert(crisisEvents).values({
    level,
    platform: parsed.platform ?? null,
    description,
    trigger: parsed.trigger ?? {},
    status: 'active',
    pausedCorps: pauseScope === 'all' ? ['xforce', 'gramgod', 'linkedelite', 'pagepower', 'webboss', 'intelcore']
      : pauseScope === 'none' ? []
      : [pauseScope],
  })

  const crisis: CrisisTrigger = {
    level,
    description,
    pauseScope,
    notifyEugine: parsed.notifyEugine ?? level >= 2,
  }

  // Level 1: log + orange SSE
  if (level === 1) {
    await db.insert(agentActions).values({
      agentName: 'sentry',
      company: 'intelcore',
      actionType: 'crisis_alert',
      details: { level: 1, description, alertColor: 'orange' },
      outcome: 'success',
    })
  }

  // Level 2: pause XForce + GramGod, RED_ALERT SSE, Gmail notify
  if (level === 2) {
    await pauseCorpAgents('xforce' as Corp, `Crisis Level 2: ${description}`)
    await pauseCorpAgents('gramgod' as Corp, `Crisis Level 2: ${description}`)

    await db.insert(agentActions).values({
      agentName: 'sentry',
      company: 'intelcore',
      actionType: 'crisis_alert',
      details: { level: 2, description, alertColor: 'red', pausedCorps: ['xforce', 'gramgod'] },
      outcome: 'blocked',
    })

    await sendGmailNotification(
      `🚨 RED ALERT: Crisis Level 2 — ${description}`,
      `ProPost Empire has detected a Level 2 crisis.\n\nDescription: ${description}\n\nXForce and GramGod agents have been paused. Please review immediately.`
    )
  }

  // Level 3: pause ALL agents, full-screen RED_ALERT, Gmail notify
  if (level === 3) {
    await pauseAllAgents(`Crisis Level 3: ${description}`)

    await db.insert(agentActions).values({
      agentName: 'sentry',
      company: 'intelcore',
      actionType: 'crisis_alert',
      details: { level: 3, description, alertColor: 'red', fullScreen: true, pausedCorps: 'all' },
      outcome: 'blocked',
    })

    await sendGmailNotification(
      `🚨🚨 CRITICAL: Crisis Level 3 — ${description}`,
      `ProPost Empire has detected a Level 3 crisis (legal/ban risk).\n\nDescription: ${description}\n\nALL 31 agents have been paused. Immediate action required.`
    )
  }

  return crisis
}
