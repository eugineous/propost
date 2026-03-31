// POST /api/cron/content-schedule
// Queries content_queue for items due in next 15 min and creates tasks for them

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { getDb } from '@/lib/db/client'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { logInfo } from '@/lib/logger'
import type { ContentQueueRow } from '@/lib/db/schema'
import type { Platform, Company, ContentPillar } from '@/lib/types'

const PLATFORM_COMPANY: Record<string, { company: Company; ceo: string }> = {
  x: { company: 'xforce', ceo: 'ZARA' },
  instagram: { company: 'gramgod', ceo: 'AURORA' },
  facebook: { company: 'pagepower', ceo: 'CHIEF' },
  linkedin: { company: 'linkedelite', ceo: 'NOVA' },
  website: { company: 'webboss', ceo: 'ROOT' },
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[Cron/content-schedule] Checking content queue for due items')

  try {
    const db = getDb()
    const dueItems = await db`
      SELECT * FROM content_queue
      WHERE status = 'scheduled'
        AND scheduled_at <= NOW() + INTERVAL '15 minutes'
        AND scheduled_at > NOW()
      ORDER BY scheduled_at ASC
    `

    const taskIds: string[] = []

    for (const item of dueItems as ContentQueueRow[]) {
      const mapping = PLATFORM_COMPANY[item.platform]
      if (!mapping) continue

      const task = await taskOrchestrator.createTask({
        type: 'post_content',
        company: mapping.company,
        platform: item.platform as Platform,
        contentPillar: item.content_pillar as ContentPillar,
        scheduledAt: item.scheduled_at ?? undefined,
        priority: 1,
        assignedAgent: mapping.ceo,
      })

      taskIds.push(task.id)
      logInfo(`[Cron/content-schedule] Created task for content item ${item.id}`, {
        taskId: task.id,
        platform: item.platform,
        scheduledAt: item.scheduled_at,
      })
    }

    return NextResponse.json({ processed: taskIds.length, taskIds })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
