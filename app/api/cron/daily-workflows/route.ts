// POST /api/cron/daily-workflows
// Triggered by Cloudflare Worker every 5 minutes.
// Runs the appropriate workflows based on current EAT time and day of week.

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logInfo } from '@/lib/logger'
import {
  runAINewsPost,
  runAINewsScrape,
  runYouthContent,
  runEliteThread,
  runFashionPost,
  runWeeklyRoundup,
  runContentCalendar,
} from '@/lib/workflows/engine'
import { isAINewsSlot, getEATHour, getTodaysPillar } from '@/lib/brand/context'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eatHour = getEATHour()
  const eatMinute = new Date().getUTCMinutes()
  const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const todayPillar = getTodaysPillar()
  const ran: string[] = []

  logInfo(`[daily-workflows] EAT ${eatHour}:${String(eatMinute).padStart(2, '0')} | Day: ${dayOfWeek} | Pillar: ${todayPillar}`)

  try {
    // ── AI News slots: 6AM, 9AM, 12PM, 3PM EAT ──────────────────────────────
    if (isAINewsSlot()) {
      await runAINewsPost()
      ran.push('AINEWS_POST')
    }

    // ── Scrape AI news every 90 minutes ──────────────────────────────────────
    if (eatMinute < 5 && eatHour % 2 === 0) {
      await runAINewsScrape()
      ran.push('AINEWS_SCRAPE')
    }

    // ── Monday 8AM EAT: Youth empowerment content ─────────────────────────────
    if (dayOfWeek === 1 && eatHour === 8 && eatMinute < 10) {
      await runYouthContent()
      ran.push('YOUTH_CONTENT')
    }

    // ── Wednesday 10AM EAT: Elite conversations ───────────────────────────────
    if (dayOfWeek === 3 && eatHour === 10 && eatMinute < 10) {
      await runEliteThread()
      ran.push('ELITE_THREAD')
    }

    // ── Thursday 12PM EAT: Fashion post ──────────────────────────────────────
    if (dayOfWeek === 4 && eatHour === 12 && eatMinute < 10) {
      await runFashionPost()
      ran.push('FASHION_POST')
    }

    // ── Sunday 9AM EAT: Weekly roundup + AI weekly ────────────────────────────
    if (dayOfWeek === 0 && eatHour === 9 && eatMinute < 10) {
      await runWeeklyRoundup()
      ran.push('WEEKLY_ROUNDUP')
    }

    // ── Every day 7AM EAT: Fill content calendar gaps ─────────────────────────
    if (eatHour === 7 && eatMinute < 10) {
      await runContentCalendar()
      ran.push('CONTENT_CALENDAR')
    }

    return NextResponse.json({
      ok: true,
      eatTime: `${eatHour}:${String(eatMinute).padStart(2, '0')}`,
      todayPillar,
      workflowsRan: ran,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
