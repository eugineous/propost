// POST /api/cron/x-post
// Triggered hourly by Cloudflare Worker.
// Generates X content via BLAZE and publishes via XAdapter (API) or
// queues for browser automation fallback via X Browser Poster worker.

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { logInfo, logWarn } from '@/lib/logger'
import { getBestTopic } from '@/lib/content/ai-news-source'
import { formatContent } from '@/lib/content/formatter'
import { getDb, withRetry } from '@/lib/db/client'
import { hawk } from '@/lib/hawk/engine'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[Cron/x-post] Starting hourly X post')

  try {
    // HAWK rate limit check before doing anything
    const allowed = await hawk.checkRateLimit('x')
    if (!allowed.allowed) {
      logWarn('[Cron/x-post] HAWK rate limit reached for X — skipping this cycle')
      return NextResponse.json({ skipped: true, reason: 'rate_limit' })
    }

    // Get best topic
    const topic = await getBestTopic()
    const formatted = formatContent(`${topic.headline}\n\n${topic.summary}`, 'x', 'ai_news')

    // Queue content
    const db = getDb()
    await withRetry(() =>
      db`
        INSERT INTO content_queue (platform, content_pillar, content, status, created_by)
        VALUES ('x', 'ai_news', ${formatted.content}, 'scheduled', 'cron-x-post')
      `
    )

    // Create task for BLAZE (XForce post executor)
    const task = await taskOrchestrator.createTask({
      type: 'post_content',
      company: 'xforce',
      platform: 'x',
      contentPillar: 'ai_news',
      priority: 1,
      assignedAgent: 'BLAZE',
    })

    logInfo('[Cron/x-post] Task created for BLAZE', { taskId: task.id, headline: topic.headline })

    return NextResponse.json({
      ok: true,
      taskId: task.id,
      headline: topic.headline,
      contentLength: formatted.content.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logWarn('[Cron/x-post] Failed', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
