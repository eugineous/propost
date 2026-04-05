// ProPost Workflow Engine
// Executes named workflows based on Eugine's content strategy
// Each workflow maps to a specific content pillar and platform combination

import { aiRouter } from '../ai/router'
import { taskOrchestrator } from '../tasks/orchestrator'
import { getDb, withRetry } from '../db/client'
import { logInfo } from '../logger'
import { PLATFORM_PROMPTS, AI_NEWS_FORMULAS, BRAND_CONTEXT, getTodaysPillar } from '../brand/context'
import { getBestTopic, fetchAINewsTopics } from '../content/ai-news-source'
import { formatContent } from '../content/formatter'
import type { Platform, Company, ContentPillar } from '../types'

export interface WorkflowResult {
  workflow: string
  success: boolean
  outputs: WorkflowOutput[]
  error?: string
}

export interface WorkflowOutput {
  platform: Platform
  content: string
  pillar: ContentPillar
  taskId?: string
  queued: boolean
}

// ─── AINEWS_SCRAPE ────────────────────────────────────────────────────────────
// Fetches top AI stories and queues them for the next posting slot

export async function runAINewsScrape(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  try {
    const topics = await fetchAINewsTopics()
    const db = getDb()

    for (const topic of topics.slice(0, 3)) {
      // Store in content queue for each platform
      const platforms: Platform[] = ['x', 'instagram', 'linkedin', 'facebook']
      for (const platform of platforms) {
        const formatted = formatContent(`${topic.headline}\n\n${topic.summary}`, platform, 'ai_news')
        await withRetry(() =>
          db`
            INSERT INTO content_queue (platform, content_pillar, content, status, created_by)
            VALUES (${platform}, 'ai_news', ${formatted.content}, 'scheduled', 'ainews_scrape')
            ON CONFLICT DO NOTHING
          `
        )
        outputs.push({ platform, content: formatted.content, pillar: 'ai_news', queued: true })
      }
    }

    logInfo(`[AINEWS_SCRAPE] Queued ${outputs.length} AI news items`)
    return { workflow: 'AINEWS_SCRAPE', success: true, outputs }
  } catch (err) {
    return { workflow: 'AINEWS_SCRAPE', success: false, outputs, error: String(err) }
  }
}

// ─── AINEWS_FORMAT ────────────────────────────────────────────────────────────
// Takes a raw AI story and formats it for all 6 platforms using Eugine's voice

export async function runAINewsFormat(rawStory: string, sourceUrl?: string): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const platforms: Platform[] = ['x', 'linkedin', 'instagram', 'facebook', 'website']

  try {
    for (const platform of platforms) {
      const formula = AI_NEWS_FORMULAS[platform] ?? AI_NEWS_FORMULAS.x
      const systemPrompt = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS.x

      const generated = await aiRouter.route(
        'generate',
        `Format this AI news story for ${platform.toUpperCase()}.
        
        Story: ${rawStory}
        ${sourceUrl ? `Source: ${sourceUrl}` : ''}
        
        Format: ${formula}
        
        MANDATORY: Add the Kenyan/African angle. What does this mean for Nairobi/Kenya/Africa?
        Write in Eugine Micah's voice. No AI filler phrases.`,
        { platform, systemPrompt, pillar: 'ai_news' }
      )

      const formatted = formatContent(generated.content, platform, 'ai_news')
      const db = getDb()
      await withRetry(() =>
        db`
          INSERT INTO content_queue (platform, content_pillar, content, status, created_by)
          VALUES (${platform}, 'ai_news', ${formatted.content}, 'scheduled', 'ainews_format')
        `
      )

      outputs.push({ platform, content: formatted.content, pillar: 'ai_news', queued: true })
    }

    return { workflow: 'AINEWS_FORMAT', success: true, outputs }
  } catch (err) {
    return { workflow: 'AINEWS_FORMAT', success: false, outputs, error: String(err) }
  }
}

// ─── AINEWS_POST ─────────────────────────────────────────────────────────────
// Posts queued AI content at the 4 daily EAT slots (6AM, 9AM, 12PM, 3PM)

export async function runAINewsPost(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const platforms: Platform[] = ['x', 'instagram', 'linkedin', 'facebook']
  const PLATFORM_COMPANY: Record<Platform, { company: Company; ceo: string }> = {
    x: { company: 'xforce', ceo: 'ZARA' },
    instagram: { company: 'gramgod', ceo: 'AURORA' },
    facebook: { company: 'pagepower', ceo: 'CHIEF' },
    linkedin: { company: 'linkedelite', ceo: 'NOVA' },
    website: { company: 'webboss', ceo: 'ROOT' },
    substack: { company: 'substackpro', ceo: 'QUILL' },
  }

  try {
    const topic = await getBestTopic()

    for (const platform of platforms) {
      const { company, ceo } = PLATFORM_COMPANY[platform]
      const formula = AI_NEWS_FORMULAS[platform] ?? AI_NEWS_FORMULAS.x
      const systemPrompt = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS.x

      const generated = await aiRouter.route(
        'generate',
        `Write an AI news post for ${platform.toUpperCase()} about: ${topic.headline}
        
        Summary: ${topic.summary}
        
        Format: ${formula}
        
        MANDATORY Kenyan angle: What does this mean for Kenya/Africa/Nairobi?
        Voice: Eugine Micah — authoritative, culturally grounded, sharp.
        No AI filler. Em dashes (—) not hyphens.`,
        { platform, systemPrompt, pillar: 'ai_news' }
      )

      const formatted = formatContent(generated.content, platform, 'ai_news')
      const task = await taskOrchestrator.createTask({
        type: 'post_content',
        company,
        platform,
        contentPillar: 'ai_news',
        priority: 1,
        assignedAgent: ceo,
      })

      outputs.push({ platform, content: formatted.content, pillar: 'ai_news', taskId: task.id, queued: true })
    }

    return { workflow: 'AINEWS_POST', success: true, outputs }
  } catch (err) {
    return { workflow: 'AINEWS_POST', success: false, outputs, error: String(err) }
  }
}

// ─── AINEWS_AFRICA ────────────────────────────────────────────────────────────
// Filters for AI stories with Kenya/Africa angle — gets priority slot

export async function runAINewsAfrica(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  try {
    const topics = await fetchAINewsTopics()
    const africanTopics = topics.filter((t) =>
      t.tags.some((tag) => ['kenya', 'africa', 'nairobi', 'east africa'].includes(tag.toLowerCase())) ||
      t.headline.toLowerCase().includes('africa') ||
      t.headline.toLowerCase().includes('kenya')
    )

    const topic = africanTopics[0] ?? topics[0]
    if (!topic) return { workflow: 'AINEWS_AFRICA', success: true, outputs }

    // Generate with explicit African framing
    const generated = await aiRouter.route(
      'generate',
      `Write an X post about this AI story with a strong African/Kenyan angle.
      Story: ${topic.headline}
      Summary: ${topic.summary}
      
      This is the African AI story nobody in Nairobi is talking about yet.
      Lead with the African impact. Under 280 characters. Sharp. Provocative.`,
      { platform: 'x', pillar: 'ai_news', systemPrompt: PLATFORM_PROMPTS.x }
    )

    const task = await taskOrchestrator.createTask({
      type: 'post_content',
      company: 'xforce',
      platform: 'x',
      contentPillar: 'ai_news',
      priority: 1,
      assignedAgent: 'BLAZE',
    })

    outputs.push({ platform: 'x', content: generated.content, pillar: 'ai_news', taskId: task.id, queued: true })
    return { workflow: 'AINEWS_AFRICA', success: true, outputs }
  } catch (err) {
    return { workflow: 'AINEWS_AFRICA', success: false, outputs, error: String(err) }
  }
}

// ─── AINEWS_WEEKLY ────────────────────────────────────────────────────────────
// Sunday AI Week in Review: mega-thread + LinkedIn post + blog article

export async function runAINewsWeekly(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  try {
    const topics = await fetchAINewsTopics()
    const topStories = topics.slice(0, 5).map((t) => `- ${t.headline}`).join('\n')

    // LinkedIn long-form
    const linkedinPost = await aiRouter.route(
      'generate',
      `Write the weekly AI roundup for LinkedIn. Title: "AI This Week: What Happened, What It Means for Kenya [${new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric' })}]"
      
      Top stories this week:
      ${topStories}
      
      Structure:
      🔹 BIG STORY OF THE WEEK — what happened + Kenyan/African angle
      🔹 TOOL OF THE WEEK — one AI tool, how a Kenyan creator/business can use it
      🔹 WHAT'S COMING NEXT WEEK — 1-2 things to watch
      🔹 EUGINE'S TAKE — his position on the biggest story. Sharp. Quotable.
      🔹 QUESTION OF THE WEEK — one question for audience engagement
      
      800-1200 words. Eugine Micah's voice. No AI filler.`,
      { platform: 'linkedin', systemPrompt: PLATFORM_PROMPTS.linkedin, pillar: 'ai_news' }
    )

    // X thread
    const xThread = await aiRouter.route(
      'generate',
      `Write the weekly AI roundup as an X thread (8-10 tweets).
      
      Top stories: ${topStories}
      
      Tweet 1: Hook — most shocking AI story of the week
      Tweets 2-7: Key stories with Kenyan angle
      Tweet 8: Eugine's take — sharp, quotable
      Tweet 9: "RT the first tweet if this was useful. AI threads every Sunday."
      
      Number each tweet (1/, 2/, etc.). Each tweet standalone.`,
      { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar: 'ai_news' }
    )

    const db = getDb()
    for (const [platform, content] of [['linkedin', linkedinPost.content], ['x', xThread.content]] as [Platform, string][]) {
      await withRetry(() =>
        db`INSERT INTO content_queue (platform, content_pillar, content, status, created_by)
           VALUES (${platform}, 'ai_news', ${content}, 'scheduled', 'ainews_weekly')`
      )
      outputs.push({ platform, content, pillar: 'ai_news', queued: true })
    }

    return { workflow: 'AINEWS_WEEKLY', success: true, outputs }
  } catch (err) {
    return { workflow: 'AINEWS_WEEKLY', success: false, outputs, error: String(err) }
  }
}

// ─── YOUTH_CONTENT ────────────────────────────────────────────────────────────
// Monday youth empowerment content: money, confidence, leadership

export async function runYouthContent(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const topics = [
    'compound interest and why nobody teaches it in Kenyan schools',
    'how to walk into rooms you don\'t belong in yet',
    'the difference between income and wealth — what schools miss',
    'reading 20 books a year puts you in the top 1% of thinkers',
    'confidence is a skill, not a personality trait',
    'your network determines your net worth — how to build it from zero',
  ]
  const topic = topics[new Date().getDate() % topics.length]

  try {
    const platforms: Array<{ platform: Platform; company: Company; agent: string }> = [
      { platform: 'linkedin', company: 'linkedelite', agent: 'NOVA' },
      { platform: 'instagram', company: 'gramgod', agent: 'AURORA' },
      { platform: 'x', company: 'xforce', agent: 'ZARA' },
    ]

    for (const { platform, company, agent } of platforms) {
      const generated = await aiRouter.route(
        'generate',
        `Write a youth empowerment post about: ${topic}
        
        Platform: ${platform.toUpperCase()}
        Audience: Young Kenyans (18-30), Nairobi, ambitious, mobile-first
        
        Voice: Like a smart older brother who made it and wants to help you make it too.
        NOT preachy. SPECIFIC. Real talk.
        
        ${platform === 'linkedin' ? 'Format: Hook + breakdown + lesson + CTA. 800-1200 chars.' : ''}
        ${platform === 'x' ? 'Format: Under 280 chars. Punchy. Quotable. Save-worthy.' : ''}
        ${platform === 'instagram' ? 'Format: Caption with hook. Sheng punchline okay. 10-15 hashtags.' : ''}
        
        No AI filler. Em dashes (—) not hyphens.`,
        { platform, systemPrompt: PLATFORM_PROMPTS[platform], pillar: 'youth_empowerment' }
      )

      const task = await taskOrchestrator.createTask({
        type: 'post_content',
        company,
        platform,
        contentPillar: 'youth_empowerment',
        priority: 2,
        assignedAgent: agent,
      })

      outputs.push({ platform, content: generated.content, pillar: 'youth_empowerment', taskId: task.id, queued: true })
    }

    return { workflow: 'YOUTH_CONTENT', success: true, outputs }
  } catch (err) {
    return { workflow: 'YOUTH_CONTENT', success: false, outputs, error: String(err) }
  }
}

// ─── ELITE_THREAD ─────────────────────────────────────────────────────────────
// Wednesday + Sunday elite conversation threads for LinkedIn and X

export async function runEliteThread(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const eliteTopics = [
    'how power actually circulates in Nairobi — the rooms nobody announces',
    'the books that changed how I think about money, power, and legacy',
    'what 10 years in front of a camera actually teaches you about influence',
    'why most ambitious Kenyans are optimizing for the wrong thing',
    'the Hannah Arendt principle that changed how I build relationships',
    'what board rooms actually look like — and how to get into them',
  ]
  const topic = eliteTopics[new Date().getDate() % eliteTopics.length]

  try {
    // LinkedIn long-form
    const linkedinPost = await aiRouter.route(
      'generate',
      `Write an elite conversation post for LinkedIn about: ${topic}
      
      Audience: Media professionals, entrepreneurs, brand managers (26-45)
      Format: Hook + 4-6 paragraphs + philosophical close + CTA. 800-1500 chars.
      
      This is content the top 1% talks about openly.
      Reference Hannah Arendt's power philosophy where relevant.
      Professional authority. No slang. Em dashes (—) not hyphens.`,
      { platform: 'linkedin', systemPrompt: PLATFORM_PROMPTS.linkedin, pillar: 'elite_conversations' }
    )

    // X thread
    const xThread = await aiRouter.route(
      'generate',
      `Write an elite conversation X thread about: ${topic}
      
      Format: 6-8 tweets. Numbered (1/, 2/, etc.).
      Tweet 1: Hook — most provocative claim
      Tweets 2-6: Build the argument
      Tweet 7: Hannah Arendt quote or philosophical close
      Tweet 8: "RT the first tweet. More threads on power and access weekly."
      
      Night owl thread energy. Philosophical. Quotable.`,
      { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar: 'elite_conversations' }
    )

    for (const [platform, content, company, agent] of [
      ['linkedin', linkedinPost.content, 'linkedelite', 'NOVA'],
      ['x', xThread.content, 'xforce', 'ZARA'],
    ] as [Platform, string, Company, string][]) {
      const task = await taskOrchestrator.createTask({
        type: platform === 'x' ? 'thread_publish' : 'post_content',
        company,
        platform,
        contentPillar: 'elite_conversations',
        priority: 2,
        assignedAgent: agent,
      })
      outputs.push({ platform, content, pillar: 'elite_conversations', taskId: task.id, queued: true })
    }

    return { workflow: 'ELITE_THREAD', success: true, outputs }
  } catch (err) {
    return { workflow: 'ELITE_THREAD', success: false, outputs, error: String(err) }
  }
}

// ─── TREND_REACT ──────────────────────────────────────────────────────────────
// Monitors trending topics and drafts reactive content for approval

export async function runTrendReact(trendingTopic?: string): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const topic = trendingTopic ?? 'the latest trending conversation in Kenya'

  try {
    const generated = await aiRouter.route(
      'generate',
      `Write a reactive X post about this trending topic: ${topic}
      
      Format: Under 200 characters. Hot take. Polarizing but not toxic.
      Formula: "[Trending topic]. Here's the take nobody is giving: [Eugine's angle]."
      
      Post within 20 minutes of trend appearing. Speed > perfection.
      No hedging. Take a clear position.`,
      { platform: 'x', systemPrompt: PLATFORM_PROMPTS.x, pillar: 'trending_topics' }
    )

    // Goes to approval queue — trending content needs human review
    const db = getDb()
    await withRetry(() =>
      db`
        INSERT INTO approval_queue (action_type, platform, agent_name, content, content_preview, risk_level, risk_score, status)
        VALUES ('post_content', 'x', 'SCOUT', ${generated.content}, ${generated.content.slice(0, 100)}, 'medium', 40, 'pending')
      `
    )

    outputs.push({ platform: 'x', content: generated.content, pillar: 'trending_topics', queued: true })
    return { workflow: 'TREND_REACT', success: true, outputs }
  } catch (err) {
    return { workflow: 'TREND_REACT', success: false, outputs, error: String(err) }
  }
}

// ─── FASHION_POST ─────────────────────────────────────────────────────────────
// 3x/week fashion content pipeline for Instagram

export async function runFashionPost(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  const fashionAngles = [
    'dressing well is communication — what your outfit says before you speak',
    'Nairobi street style and why African fashion is having its moment',
    'the fit is intentional — style as a power move',
    'why confidence starts in the mirror — dressing like you belong',
    'African designers you should know — supporting local fashion',
  ]
  const angle = fashionAngles[new Date().getDate() % fashionAngles.length]

  try {
    const generated = await aiRouter.route(
      'generate',
      `Write an Instagram caption about: ${angle}
      
      Format: Hook line + 2-3 short paragraphs + philosophical close + CTA + 10-15 hashtags
      Tone: Aspirational, warm, culturally rich. Sheng punchline optional.
      
      Include hashtags: #NairobiFashion #StyleIsACommunication #EugineMicah #MenOfNairobi + 10 more
      
      No AI filler. Em dashes (—) not hyphens.`,
      { platform: 'instagram', systemPrompt: PLATFORM_PROMPTS.instagram, pillar: 'fashion' }
    )

    const task = await taskOrchestrator.createTask({
      type: 'post_content',
      company: 'gramgod',
      platform: 'instagram',
      contentPillar: 'fashion',
      priority: 3,
      assignedAgent: 'AURORA',
    })

    outputs.push({ platform: 'instagram', content: generated.content, pillar: 'fashion', taskId: task.id, queued: true })
    return { workflow: 'FASHION_POST', success: true, outputs }
  } catch (err) {
    return { workflow: 'FASHION_POST', success: false, outputs, error: String(err) }
  }
}

// ─── WEEKLY_ROUNDUP ───────────────────────────────────────────────────────────
// Sunday report: what performed, what flopped, next week plan

export async function runWeeklyRoundup(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  try {
    const db = getDb()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [topActions, taskStats] = await Promise.all([
      db`SELECT platform, action_type, COUNT(*) as count FROM actions WHERE timestamp > ${weekAgo} AND status = 'success' GROUP BY platform, action_type ORDER BY count DESC LIMIT 10`,
      db`SELECT status, COUNT(*) as count FROM tasks WHERE created_at > ${weekAgo} GROUP BY status`,
    ])

    const summary = await aiRouter.route(
      'summarize',
      `Generate a weekly performance report for Eugine Micah's ProPost system.
      
      Top actions this week: ${JSON.stringify(topActions)}
      Task completion stats: ${JSON.stringify(taskStats)}
      
      Report format:
      📊 WHAT WORKED — top performing content/actions
      ❌ WHAT DIDN'T — low performance areas
      🎯 NEXT WEEK PRIORITIES — 3 specific recommendations
      
      Be specific. Data-driven. Actionable. Eugine's voice.`,
      { role: 'ORACLE', context: 'weekly_roundup' }
    )

    // Store as memory entry
    await withRetry(() =>
      db`
        INSERT INTO memory_entries (agent_name, context_summary, tags)
        VALUES ('ORACLE', ${summary.content}, ARRAY['weekly_report', 'performance'])
      `
    )

    outputs.push({ platform: 'website', content: summary.content, pillar: 'ai_news', queued: false })
    return { workflow: 'WEEKLY_ROUNDUP', success: true, outputs }
  } catch (err) {
    return { workflow: 'WEEKLY_ROUNDUP', success: false, outputs, error: String(err) }
  }
}

// ─── CONTENT_CALENDAR ─────────────────────────────────────────────────────────
// Fills every slot in the content calendar — no platform goes silent

export async function runContentCalendar(): Promise<WorkflowResult> {
  const outputs: WorkflowOutput[] = []
  try {
    const todayPillar = getTodaysPillar()
    const db = getDb()

    // Check what's already scheduled for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await db`
      SELECT platform, content_pillar FROM content_queue
      WHERE scheduled_at >= ${today.toISOString()}
        AND scheduled_at < ${tomorrow.toISOString()}
        AND status = 'scheduled'
    `

    const scheduledPlatforms = new Set((existing as Array<{ platform: string }>).map((r) => r.platform))
    const allPlatforms: Platform[] = ['x', 'instagram', 'linkedin', 'facebook']
    const missingPlatforms = allPlatforms.filter((p) => !scheduledPlatforms.has(p))

    // Fill missing slots with today's pillar content
    for (const platform of missingPlatforms) {
      const generated = await aiRouter.route(
        'generate',
        `Write a ${todayPillar.replace(/_/g, ' ')} post for ${platform.toUpperCase()}.
        Today's focus: ${todayPillar}
        Platform tone: ${PLATFORM_PROMPTS[platform]?.slice(0, 200) ?? 'authentic, Kenyan, authoritative'}
        
        Write in Eugine Micah's voice. No AI filler.`,
        { platform, systemPrompt: PLATFORM_PROMPTS[platform], pillar: todayPillar }
      )

      const formatted = formatContent(generated.content, platform, todayPillar as ContentPillar)
      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + 1)

      await withRetry(() =>
        db`
          INSERT INTO content_queue (platform, content_pillar, content, scheduled_at, status, created_by)
          VALUES (${platform}, ${todayPillar}, ${formatted.content}, ${scheduledAt.toISOString()}, 'scheduled', 'content_calendar')
        `
      )

      outputs.push({ platform, content: formatted.content, pillar: todayPillar as ContentPillar, queued: true })
    }

    return { workflow: 'CONTENT_CALENDAR', success: true, outputs }
  } catch (err) {
    return { workflow: 'CONTENT_CALENDAR', success: false, outputs, error: String(err) }
  }
}

// ─── Workflow registry ────────────────────────────────────────────────────────

export const WORKFLOWS: Record<string, (params?: Record<string, string>) => Promise<WorkflowResult>> = {
  AINEWS_SCRAPE: () => runAINewsScrape(),
  AINEWS_FORMAT: (p) => runAINewsFormat(p?.story ?? '', p?.sourceUrl),
  AINEWS_POST: () => runAINewsPost(),
  AINEWS_AFRICA: () => runAINewsAfrica(),
  AINEWS_WEEKLY: () => runAINewsWeekly(),
  YOUTH_CONTENT: () => runYouthContent(),
  ELITE_THREAD: () => runEliteThread(),
  TREND_REACT: (p) => runTrendReact(p?.topic),
  FASHION_POST: () => runFashionPost(),
  WEEKLY_ROUNDUP: () => runWeeklyRoundup(),
  CONTENT_CALENDAR: () => runContentCalendar(),
}
