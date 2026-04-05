// POST /api/cron/ai-news
// Creates post_content tasks for all active platforms and assigns to CEO agents

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { logInfo } from '@/lib/logger'
import { getBestTopic } from '@/lib/content/ai-news-source'
import { formatContent } from '@/lib/content/formatter'
import { getDb, withRetry } from '@/lib/db/client'
import type { Platform, Company } from '@/lib/types'

const PLATFORM_COMPANY: Record<Platform, { company: Company; ceo: string }> = {
  x: { company: 'xforce', ceo: 'ZARA' },
  instagram: { company: 'gramgod', ceo: 'AURORA' },
  facebook: { company: 'pagepower', ceo: 'CHIEF' },
  linkedin: { company: 'linkedelite', ceo: 'NOVA' },
  website: { company: 'webboss', ceo: 'ROOT' },
  substack: { company: 'substackpro', ceo: 'QUILL' },
}

const ACTIVE_PLATFORMS: Platform[] = ['x', 'instagram', 'facebook', 'linkedin']

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[Cron/ai-news] Starting AI news content task creation')

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Cron timeout')), 10000)
  )

  try {
    // Fetch best AI news topic
    const topic = await getBestTopic()
    logInfo('[Cron/ai-news] Topic selected', { headline: topic.headline })

    const taskIds = await Promise.race([
      Promise.all(
        ACTIVE_PLATFORMS.map(async (platform) => {
          const { company, ceo } = PLATFORM_COMPANY[platform]

          // Format content for this platform
          const formatted = formatContent(
            `${topic.headline}\n\n${topic.summary}`,
            platform,
            'ai_news'
          )

          // Queue formatted content
          const db = getDb()
          await withRetry(() =>
            db`
              INSERT INTO content_queue (platform, content_pillar, content, status, created_by)
              VALUES (${platform}, 'ai_news', ${formatted.content}, 'scheduled', 'cron')
            `
          )

          const task = await taskOrchestrator.createTask({
            type: 'post_content',
            company,
            platform,
            contentPillar: 'ai_news',
            priority: 1,
            assignedAgent: ceo,
          })
          logInfo(`[Cron/ai-news] Created task for ${platform}`, { taskId: task.id, ceo })
          return task.id
        })
      ),
      timeout,
    ])

    return NextResponse.json({ created: taskIds.length, taskIds, topic: topic.headline })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
