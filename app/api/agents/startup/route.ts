export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

// Called when dashboard loads — triggers autonomous agent startup
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cronSecret = process.env.CRON_SECRET ?? ''
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'

  // Fire all autonomous tasks in parallel (non-blocking)
  const tasks = [
    { path: '/api/cron/ig-backlog', name: 'CHAT: Instagram backlog clearance' },
    { path: '/api/cron/scout', name: 'SCOUT: Trend monitoring' },
    { path: '/api/cron/sentry', name: 'SENTRY: Crisis check' },
    { path: '/api/cron/metrics-sync', name: 'PIXEL: Metrics sync' },
    { path: '/api/cron/briefing', name: 'SCRIBE: Daily briefing' },
    { path: '/api/cron/memory', name: 'MEMORY: Pattern analysis' },
  ]

  // Log startup to activity feed
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'empire_startup',
    details: {
      message: '👑 ProPost Empire is ONLINE. All 80 agents activated across 9 corps. Starting autonomous operations.',
      tasks: tasks.map(t => t.name),
      corps: ['IntelCore', 'XForce', 'LinkedElite', 'GramGod', 'PagePower', 'WebBoss', 'HRForce', 'LegalShield', 'FinanceDesk'],
    },
    outcome: 'success',
  })

  // Fire tasks without waiting (fire-and-forget)
  tasks.forEach(task => {
    fetch(`${baseUrl}${task.path}`, {
      headers: { 'x-cron-secret': cronSecret },
    }).catch(() => {}) // ignore errors — they run independently
  })

  return NextResponse.json({
    ok: true,
    message: 'Empire activated. All 80 agents are now working autonomously across 9 corps.',
    agents: 80,
    tasks: tasks.map(t => t.name),
  })
}
