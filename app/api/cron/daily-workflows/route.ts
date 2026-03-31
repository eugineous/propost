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
import { aiRouter } from '@/lib/ai/router'
import { PLATFORM_PROMPTS, AI_NEWS_FORMULAS } from '@/lib/brand/context'
import { formatContent } from '@/lib/content/formatter'

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

async function postToX(pillar: string): Promise<void> {
  const topic = await getBestTopic()
  const formula = AI_NEWS_FORMULAS.x

  // Vary the format — sometimes hot take, sometimes thread hook, sometimes question
  const formats = [
    `Write a sharp X hot take about: ${topic.headline}. Under 200 chars. Polarizing but not toxic. Kenyan angle.`,
    `Write an X thread hook about: ${topic.headline}. First tweet only, under 240 chars. Make them want to read more.`,
    `Write an X post about: ${topic.headline}. Under 280 chars. End with a question that demands a response.`,
    `Write a reactive X post about AI news: ${topic.headline}. Under 200 chars. "Nobody is talking about this in Nairobi..."`,
  ]
  const formatPrompt = formats[new Date().getUTCMinutes() % formats.length]

  const generated = await aiRouter.route(
    'generate',
    `${formatPrompt}
    
    Summary: ${topic.summary}
    
    Voice: Eugine Micah — sharp, culturally grounded, authority-driven.
    MANDATORY: Add Kenyan/African angle. No AI filler. Em dashes (—) not hyphens.`,
    { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar }
  )

  const formatted = formatContent(generated.content, 'x', 'ai_news')
  await taskOrchestrator.createTask({
    type: 'post_content',
    company: 'xforce',
    platform: 'x',
    contentPillar: 'ai_news',
    priority: 1,
    assignedAgent: 'BLAZE',
    content: formatted.content,
  })

  logInfo(`[x-post] Queued: ${formatted.content.slice(0, 60)}...`)
}

// ─── LinkedIn post generator ──────────────────────────────────────────────────

async function postToLinkedIn(pillar: string): Promise<void> {
  const topic = await getBestTopic()

  // Vary LinkedIn formats — sometimes analysis, sometimes list, sometimes story
  const formats = [
    `Write a LinkedIn post about: ${topic.headline}. Hook + 3-4 paragraph breakdown + Kenyan angle + CTA. 800-1200 chars.`,
    `Write a LinkedIn numbered list post about AI: ${topic.headline}. "X things about [topic] that Kenyan professionals need to know". 5-7 points.`,
    `Write a LinkedIn thought leadership post about: ${topic.headline}. Start with a bold claim. Build the argument. End with a question.`,
  ]
  const formatPrompt = formats[new Date().getUTCMinutes() % formats.length]

  const generated = await aiRouter.route(
    'generate',
    `${formatPrompt}
    
    Summary: ${topic.summary}
    
    Voice: Eugine Micah — professional authority, thought leader, media entrepreneur.
    Audience: Kenyan media professionals, entrepreneurs, brand managers (26-45).
    No AI filler. Em dashes (—) not hyphens. 3-5 hashtags at end.`,
    { platform: 'linkedin', systemPrompt: PLATFORM_PROMPTS.linkedin, pillar }
  )

  const formatted = formatContent(generated.content, 'linkedin', 'ai_news')
  await taskOrchestrator.createTask({
    type: 'post_content',
    company: 'linkedelite',
    platform: 'linkedin',
    contentPillar: 'ai_news',
    priority: 1,
    assignedAgent: 'NOVA',
    content: formatted.content,
  })

  logInfo(`[linkedin-post] Queued: ${formatted.content.slice(0, 60)}...`)
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
    // ── X: 2 posts per hour at randomized minutes ─────────────────────────
    if (shouldPostNow(utcHour, utcMinute, utcDay)) {
      await postToX(todayPillar).catch((e) => logInfo(`[x-post] failed: ${e}`))
      ran.push('X_POST')
    }

    // ── LinkedIn: 2 posts per hour at randomized minutes (offset by 2 windows) ──
    // Use a different seed offset so LinkedIn doesn't post at same time as X
    const linkedinWindows = getPostingWindows((utcHour + 3) % 24, utcDay + 1)
    const currentWindow = Math.floor(utcMinute / 5)
    if (linkedinWindows.includes(currentWindow)) {
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
