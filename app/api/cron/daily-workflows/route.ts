// POST /api/cron/daily-workflows
// Triggered by Cloudflare Worker every 5 minutes.
//
// X + LinkedIn posting strategy:
//   - 2 posts per hour, every hour (24/7)
//   - Randomized within each hour — never at the same minute twice
//   - Looks like a human who posts at irregular times
//   - HAWK enforces the 2/hour ceiling and 20-min minimum gap
//
// How randomization works:
//   Each hour is divided into 12 × 5-minute windows (0,5,10,...55)
//   We pick 2 windows per hour using a deterministic seed (hour + day)
//   The seed changes every hour so the pattern is never the same day-to-day

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
import { getEATHour, getTodaysPillar } from '@/lib/brand/context'
import { taskOrchestrator } from '@/lib/tasks/orchestrator'
import { getBestTopic } from '@/lib/content/ai-news-source'
import type { ContentPillar } from '@/lib/types'

// ─── Randomized posting schedule ─────────────────────────────────────────────
// Returns the two 5-minute windows (0-11) within an hour that should post
// Uses a simple seeded shuffle so it's different every hour but deterministic

function getPostingWindows(utcHour: number, utcDay: number): number[] {
  // Seed = hour * 31 + day * 7 (changes every hour, different each day)
  const seed = utcHour * 31 + utcDay * 7
  // Generate 12 windows [0..11] and pick 2 using the seed
  const windows = Array.from({ length: 12 }, (_, i) => i)
  // Fisher-Yates with seeded LCG
  let s = seed
  for (let i = 11; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [windows[i], windows[j]] = [windows[j], windows[i]]
  }
  // Return first 2 windows, sorted so earlier one posts first
  return [windows[0], windows[1]].sort((a, b) => a - b)
}

function shouldPostNow(utcHour: number, utcMinute: number, utcDay: number): boolean {
  const currentWindow = Math.floor(utcMinute / 5) // 0-11
  const postingWindows = getPostingWindows(utcHour, utcDay)
  return postingWindows.includes(currentWindow)
}

// ─── X post generator ─────────────────────────────────────────────────────────
// No content pre-generation here — BLAZE uses the knowledge base to generate

async function postToX(pillar: string): Promise<void> {
  await taskOrchestrator.createTask({
    type: 'post_content',
    company: 'xforce',
    platform: 'x',
    contentPillar: pillar as ContentPillar,
    priority: 1,
    assignedAgent: 'BLAZE',
  })
  logInfo(`[x-post] Task queued for BLAZE — pillar: ${pillar}`)
}

// ─── LinkedIn post generator ──────────────────────────────────────────────────
// No content pre-generation here — ORATOR uses the knowledge base to generate

async function postToLinkedIn(pillar: string): Promise<void> {
  await taskOrchestrator.createTask({
    type: 'post_content',
    company: 'linkedelite',
    platform: 'linkedin',
    contentPillar: pillar as ContentPillar,
    priority: 1,
    assignedAgent: 'ORATOR',
  })
  logInfo(`[linkedin-post] Task queued for ORATOR — pillar: ${pillar}`)
}

// ─── Substack newsletter scheduler ───────────────────────────────────────────

async function publishToSubstack(pillar: string): Promise<void> {
  if (!process.env.SUBSTACK_PASSWORD || !process.env.SUBSTACK_PUBLICATION_URL) {
    logInfo(`[substack] Skipping — SUBSTACK_PASSWORD or SUBSTACK_PUBLICATION_URL not set`)
    return
  }

  const topic = await getBestTopic()

  await taskOrchestrator.createTask({
    type: 'newsletter_publish',
    company: 'substackpro',
    platform: 'substack',
    contentPillar: pillar as ContentPillar,
    priority: 1,
    assignedAgent: 'QUILL',
    content: topic.headline,  // QUILL generates full article from this seed
  })

  logInfo(`[substack] Queued newsletter about: ${topic.headline.slice(0, 60)}...`)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utcDay = now.getUTCDay()
  const eatHour = getEATHour()
  const todayPillar = getTodaysPillar()
  const ran: string[] = []

  logInfo(`[daily-workflows] UTC ${utcHour}:${String(utcMinute).padStart(2, '0')} | EAT ${eatHour}:${String(utcMinute).padStart(2, '0')} | Pillar: ${todayPillar}`)

  try {
    // ── X: 3 posts per day at randomized times (NOT every hour)
    // Post at 3 specific EAT hours only: 8AM, 1PM, 7PM
    // This gives human-like spacing and avoids spam detection
    const X_POST_HOURS_EAT = [8, 13, 19]
    const isXPostHour = X_POST_HOURS_EAT.includes(eatHour)
    if (isXPostHour && shouldPostNow(utcHour, utcMinute, utcDay)) {
      await postToX(todayPillar).catch((e) => logInfo(`[x-post] failed: ${e}`))
      ran.push('X_POST')
    }

    // ── LinkedIn: 1 post per day ONLY — quality over quantity
    // Best posting time: 8AM-9AM EAT (highest engagement for Kenyan audience)
    // One window only — 8AM EAT = 5AM UTC
    const isLinkedInHour = eatHour === 8 && utcMinute < 10
    if (isLinkedInHour && !ran.includes('LINKEDIN_POST')) {
      await postToLinkedIn(todayPillar).catch((e) => logInfo(`[linkedin-post] failed: ${e}`))
      ran.push('LINKEDIN_POST')
    }

    // ── AI News scrape every 90 minutes ──────────────────────────────────
    if (utcMinute < 5 && utcHour % 2 === 0) {
      await runAINewsScrape().catch(() => {})
      ran.push('AINEWS_SCRAPE')
    }

    // ── Monday 8AM EAT: Youth empowerment ────────────────────────────────
    if (utcDay === 1 && eatHour === 8 && utcMinute < 5) {
      await runYouthContent().catch(() => {})
      ran.push('YOUTH_CONTENT')
    }

    // ── Wednesday 10AM EAT: Elite conversations ───────────────────────────
    if (utcDay === 3 && eatHour === 10 && utcMinute < 5) {
      await runEliteThread().catch(() => {})
      ran.push('ELITE_THREAD')
    }

    // ── Thursday 12PM EAT: Fashion post ──────────────────────────────────
    if (utcDay === 4 && eatHour === 12 && utcMinute < 5) {
      await runFashionPost().catch(() => {})
      ran.push('FASHION_POST')
    }

    // ── Sunday 9AM EAT: Weekly roundup ───────────────────────────────────
    if (utcDay === 0 && eatHour === 9 && utcMinute < 5) {
      await runWeeklyRoundup().catch(() => {})
      ran.push('WEEKLY_ROUNDUP')
    }

    // ── Daily 7AM EAT: Fill content calendar gaps ─────────────────────────
    if (eatHour === 7 && utcMinute < 5) {
      await runContentCalendar().catch(() => {})
      ran.push('CONTENT_CALENDAR')
    }

    // ── Daily 8AM EAT: Substack newsletter ────────────────────────────────
    if (eatHour === 8 && utcMinute < 5) {
      await publishToSubstack(todayPillar).catch((e) => logInfo(`[substack] failed: ${e}`))
      ran.push('SUBSTACK_NEWSLETTER')
    }

    // Log the posting windows for this hour (for debugging)
    const xWindows = getPostingWindows(utcHour, utcDay).map((w) => `${w * 5}min`)
    const liWindows = getPostingWindows((utcHour + 3) % 24, utcDay + 1).map((w) => `${w * 5}min`)

    return NextResponse.json({
      ok: true,
      utcTime: `${utcHour}:${String(utcMinute).padStart(2, '0')}`,
      eatTime: `${eatHour}:${String(utcMinute).padStart(2, '0')}`,
      todayPillar,
      workflowsRan: ran,
      thisHourXSlots: xWindows,
      thisHourLinkedInSlots: liWindows,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
