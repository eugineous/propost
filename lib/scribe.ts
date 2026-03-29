// ============================================================
// ProPost Empire — SCRIBE scribeReport
// ============================================================

import { run } from '@/agents/intelcore/scribe'
import { db } from '@/lib/db'
import { dailyMetrics, agentActions } from '@/lib/schema'
import { gte } from 'drizzle-orm'

async function sendGmail(subject: string, body: string): Promise<void> {
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
}

export async function scribeReport(): Promise<void> {
  // Aggregate metrics from daily_metrics table (last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const metrics = await db
    .select()
    .from(dailyMetrics)
    .where(gte(dailyMetrics.date, yesterday.toISOString().split('T')[0]))

  // Run SCRIBE agent to generate report
  const result = await run(
    'Generate the daily situation report for Eugine Micah',
    { metrics, generatedAt: new Date().toISOString() }
  )

  const reportText = result.data.response as string

  // Send via Gmail API
  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Nairobi',
  })

  await sendGmail(
    `📊 ProPost Empire Daily SitRep — ${today}`,
    reportText
  )

  // Log to agent_actions
  await db.insert(agentActions).values({
    agentName: 'scribe',
    company: 'intelcore',
    actionType: 'daily_sitrep',
    details: {
      metricsCount: metrics.length,
      reportLength: reportText.length,
      sentAt: new Date().toISOString(),
    },
    outcome: 'success',
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  })
}
