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
  ]

  // Log startup to activity feed
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'empire_startup',
    details: {
      message: '👑 ProPost Empire is ONLINE. All 31 agents activated. Starting autonomous operations.',
      tasks: tasks.map(t => t.name),
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
    message: 'Empire activated. All agents are now working autonomously.',
    agents: 31,
    tasks: tasks.map(t => t.name),
  })
}
