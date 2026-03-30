export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { agentActions, workflowExecutions } from '@/lib/schema'
import { scheduleAllDueAgents } from '@/lib/workflowEngine'
import { seedDefaultWorkflows } from '@/lib/defaultWorkflows'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  // Allow cron secret OR internal secret (for browser-triggered runs)
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = internalSecret && internalSecret === process.env.INTERNAL_SECRET
  if (!isInternal && !validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auto-seed workflows on first run if table is empty
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(workflowExecutions)
  if (Number(countRow?.count ?? 0) === 0) {
    const { seeded } = await seedDefaultWorkflows()
    await db.insert(agentActions).values({
      agentName: 'sovereign',
      company: 'intelcore',
      actionType: 'empire_bootstrap',
      details: { summary: `Auto-seeded ${seeded} agent workflows — empire is live` },
      outcome: 'success',
    })
  }

  const igEnabled = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
  const xEnabled = Boolean(
    (process.env.X_API_KEY || process.env.TWITTER_API_KEY) &&
    (process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN)
  )
  const liEnabled = Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN)
  const fbEnabled = Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID)

  // Run the workflow engine — this drives all 47 agents
  const { agentsRun, stepsExecuted } = await scheduleAllDueAgents()

  // Log blocked platforms so the activity feed shows them
  const blockedInserts = []
  if (!igEnabled) blockedInserts.push({ agentName: 'aurora', company: 'gramgod', actionType: 'platform_not_connected', details: { summary: 'Instagram not connected' }, outcome: 'blocked' })
  if (!xEnabled) blockedInserts.push({ agentName: 'blaze', company: 'xforce', actionType: 'platform_not_connected', details: { summary: 'X not connected' }, outcome: 'blocked' })
  if (!liEnabled) blockedInserts.push({ agentName: 'nova', company: 'linkedelite', actionType: 'platform_not_connected', details: { summary: 'LinkedIn not connected' }, outcome: 'blocked' })
  if (!fbEnabled) blockedInserts.push({ agentName: 'chief', company: 'pagepower', actionType: 'platform_not_connected', details: { summary: 'Facebook not connected' }, outcome: 'blocked' })

  if (blockedInserts.length > 0) {
    await db.insert(agentActions).values(blockedInserts)
  }

  // Sovereign summary log
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'autopilot_tick',
    details: {
      summary: `Workflow engine ran ${agentsRun} agents, executed ${stepsExecuted} steps`,
      agentsRun,
      stepsExecuted,
      platforms: { instagram: igEnabled, x: xEnabled, linkedin: liEnabled, facebook: fbEnabled },
    },
    outcome: 'success',
  })

  return NextResponse.json({
    ok: true,
    agentsRun,
    stepsExecuted,
    platforms: { instagram: igEnabled, x: xEnabled, linkedin: liEnabled, facebook: fbEnabled },
  })
}
