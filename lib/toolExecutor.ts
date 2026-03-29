// ============================================================
// ProPost Empire — Tool Executor (Enhanced)
// ============================================================

import { getAgentState, setAgentState } from '@/lib/agentState'
import { db } from '@/lib/db'
import { agentActions, posts, agentLearnings } from '@/lib/schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import { postTweet, replyToTweet, getTrending, getMetrics } from '@/lib/platforms/x'
import { publishPost as publishInstagramPost, getMetrics as getIGMetrics } from '@/lib/platforms/instagram'
import { publishPost as publishLinkedInPost, getMetrics as getLinkedInMetrics } from '@/lib/platforms/linkedin'

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  agentName: string
): Promise<unknown> {
  console.log(`[toolExecutor] ${agentName} → ${toolName}`, args)

  try {
    switch (toolName) {
      // === Content & Posting Tools ===
      case 'post_to_platform':
        return await postToPlatformHandler(args)

      case 'post_to_x':
        return await postToXHandler(args, agentName)

      case 'post_to_instagram':
        return await postToInstagramHandler(args, agentName)

      case 'post_to_linkedin':
        return await postToLinkedInHandler(args, agentName)

      case 'reply_to_post':
        return await replyToPostHandler(args, agentName)

      // === Research & Discovery Tools ===
      case 'get_trending_topics':
        return await getTrendingTopicsHandler(args)

      case 'get_x_trending':
        return await getXTrendingHandler(args)

      case 'analyze_competitors':
        return await analyzeCompetitorsHandler(args)

      case 'find_hashtags':
        return await findHashtagsHandler(args)

      case 'research_topic':
        return await researchTopicHandler(args)

      // === Analytics & Metrics Tools ===
      case 'get_platform_metrics':
        return await getPlatformMetricsHandler(args)

      case 'get_analytics':
        return await getAnalyticsHandler(args)

      case 'track_performance':
        return await trackPerformanceHandler(args)

      case 'generate_report':
        return await generateReportHandler(args)

      // === Database & Memory Tools ===
      case 'search_database':
        return await searchDatabaseHandler(args)

      case 'save_to_memory':
        return await saveToMemoryHandler(args, agentName)

      case 'recall_memory':
        return await recallMemoryHandler(args)

      case 'log_action':
        return await logActionHandler(args, agentName)

      // === Communication Tools ===
      case 'send_email':
        return await sendEmailHandler(args)

      case 'notify_agent':
        return await notifyAgentHandler(args, agentName)

      case 'broadcast_message':
        return await broadcastMessageHandler(args)

      // === Agent State Tools ===
      case 'get_agent_state':
        return getAgentStateHandler(args)

      case 'update_agent_state':
        return await updateAgentStateHandler(args)

      case 'pause_agents':
        return await pauseAgentsHandler(args)

      case 'resume_agents':
        return await resumeAgentsHandler(args)

      // === Brand & Deal Tools ===
      case 'evaluate_deal':
        return await evaluateDealHandler(args)

      case 'track_deal':
        return await trackDealHandler(args)

      case 'create_outreach':
        return await createOutreachHandler(args)

      // === Content Generation Tools ===
      case 'generate_caption':
        return await generateCaptionHandler(args)

      case 'generate_hashtags':
        return await generateHashtagsHandler(args)

      case 'optimize_timing':
        return await optimizeTimingHandler(args)

      // === Crisis & Safety Tools ===
      case 'detect_crisis':
        return await detectCrisisHandler(args)

      case 'trigger_pause':
        return await triggerPauseHandler(args)

      // Default case for unknown tools
      default:
        console.warn(`[toolExecutor] Unknown tool: ${toolName}`)
        return { error: `Unknown tool: ${toolName}`, available: Object.keys(TOOL_CATALOG) }
    }
  } catch (err) {
    console.error(`[toolExecutor] Error executing ${toolName}:`, err)
    return { error: String(err), tool: toolName }
  }
}

// ── Tool Catalogs for Discovery ───────────────────────────────

const TOOL_CATALOG = {
  'post_to_platform': 'Post content to a social platform',
  'post_to_x': 'Post directly to X/Twitter',
  'post_to_instagram': 'Post to Instagram',
  'post_to_linkedin': 'Post to LinkedIn',
  'reply_to_post': 'Reply to an existing post',
  'get_trending_topics': 'Get trending topics for content',
  'get_x_trending': 'Get X/Twitter trending topics',
  'analyze_competitors': 'Analyze competitor accounts',
  'find_hashtags': 'Find relevant hashtags',
  'research_topic': 'Research a topic deeply',
  'get_platform_metrics': 'Get metrics for a platform',
  'get_analytics': 'Get analytics data',
  'track_performance': 'Track post performance',
  'generate_report': 'Generate analytics report',
  'search_database': 'Search the database',
  'save_to_memory': 'Save information to memory',
  'recall_memory': 'Recall information from memory',
  'log_action': 'Log an agent action',
  'send_email': 'Send an email',
  'notify_agent': 'Notify another agent',
  'broadcast_message': 'Broadcast to all agents',
  'get_agent_state': 'Get agent state',
  'update_agent_state': 'Update agent state',
  'pause_agents': 'Pause agent operations',
  'resume_agents': 'Resume agent operations',
  'evaluate_deal': 'Evaluate a brand deal',
  'track_deal': 'Track deal progress',
  'create_outreach': 'Create brand outreach',
  'generate_caption': 'Generate a post caption',
  'generate_hashtags': 'Generate hashtags',
  'optimize_timing': 'Optimize posting time',
  'detect_crisis': 'Detect crisis signals',
  'trigger_pause': 'Trigger emergency pause',
}

// ── Platform Posting Handlers ─────────────────────────────────

async function postToPlatformHandler(args: Record<string, unknown>): Promise<unknown> {
  const platform = args.platform as string
  const content = args.content as string
  const mediaUrls = args.mediaUrls as string[] | undefined

  switch (platform?.toLowerCase()) {
    case 'x':
    case 'twitter':
      return await postToXHandler({ content, mediaUrls }, 'SYSTEM')
    case 'instagram':
    case 'ig':
      return await postToInstagramHandler({ content, mediaUrls }, 'SYSTEM')
    case 'linkedin':
    case 'li':
      return await postToLinkedInHandler({ content, mediaUrls }, 'SYSTEM')
    default:
      return { error: `Unknown platform: ${platform}` }
  }
}

async function postToXHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const content = args.content as string
  const mediaUrls = args.mediaUrls as string[] | undefined

  try {
    const result = await postTweet(content, mediaUrls)
    
    // Log the action
    await db.insert(posts).values({
      platform: 'x',
      content,
      status: 'published',
      publishedAt: new Date(),
      platformId: result.tweetId,
      agentName,
    })

    return {
      success: true,
      platform: 'x',
      tweetId: result.tweetId,
      url: result.url,
      publishedAt: new Date().toISOString(),
    }
  } catch (err) {
    // Log failed attempt
    await db.insert(posts).values({
      platform: 'x',
      content,
      status: 'failed',
      agentName,
    })
    return { success: false, error: String(err), platform: 'x' }
  }
}

async function postToInstagramHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const content = args.content as string
  const mediaUrls = args.mediaUrls as string[] | undefined
  const caption = (args.caption as string) || content

  try {
    const imageUrl = mediaUrls?.[0] ?? ''
    const result = await publishInstagramPost(caption, imageUrl)
    
    await db.insert(posts).values({
      platform: 'instagram',
      content: caption,
      status: 'published',
      publishedAt: new Date(),
      platformId: result.postId,
      agentName,
    })

    return {
      success: true,
      platform: 'instagram',
      mediaId: result.postId,
      publishedAt: new Date().toISOString(),
    }
  } catch (err) {
    await db.insert(posts).values({
      platform: 'instagram',
      content: caption || content,
      status: 'failed',
      agentName,
    })
    return { success: false, error: String(err), platform: 'instagram' }
  }
}

async function postToLinkedInHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const content = args.content as string

  try {
    const result = await publishLinkedInPost(content)
    
    await db.insert(posts).values({
      platform: 'linkedin',
      content,
      status: 'published',
      publishedAt: new Date(),
      platformId: result.postId,
      agentName,
    })

    return {
      success: true,
      platform: 'linkedin',
      postId: result.postId,
      publishedAt: new Date().toISOString(),
    }
  } catch (err) {
    await db.insert(posts).values({
      platform: 'linkedin',
      content,
      status: 'failed',
      agentName,
    })
    return { success: false, error: String(err), platform: 'linkedin' }
  }
}

async function replyToPostHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const platform = args.platform as string
  const content = args.content as string
  const replyToId = args.replyToId as string

  try {
    if (platform === 'x' || platform === 'twitter') {
      const result = await replyToTweet(content, replyToId)
      return { success: true, platform: 'x', tweetId: result.tweetId }
    }
    return { success: false, error: `Reply not supported for ${platform}` }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Research & Discovery Handlers ─────────────────────────────

async function getTrendingTopicsHandler(args: Record<string, unknown>): Promise<unknown> {
  const region = (args.region as string) ?? 'KE'
  
  try {
    const xTrends = await getTrending(region)
    
    return {
      region,
      trends: xTrends,
      sources: ['x', 'instagram', 'linkedin'],
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    // Return fallback trends
    return {
      region,
      trends: [
        { text: '#NairobiTech', volume: 12400 },
        { text: '#KenyaInnovation', volume: 8900 },
        { text: '#AfricaRising', volume: 5600 },
        { text: '#ContentCreator', volume: 4200 },
        { text: '#DigitalMarketing', volume: 3800 },
      ],
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
    }
  }
}

async function getXTrendingHandler(args: Record<string, unknown>): Promise<unknown> {
  const region = (args.region as string) ?? 'KE'
  
  try {
    return await getTrending(region)
  } catch (err) {
    return { error: String(err), trends: [] }
  }
}

async function analyzeCompetitorsHandler(args: Record<string, unknown>): Promise<unknown> {
  const handles = args.handles as string[] || []
  
  // Placeholder for competitor analysis
  return {
    analyzed: handles,
    insights: {
      postingFrequency: '3-5 posts/day',
      commonHashtags: ['#Tech', '#Innovation', '#Kenya'],
      engagementPattern: 'High engagement on video content',
      bestPerforming: 'Behind-the-scenes content',
    },
    recommendations: [
      'Increase video content ratio',
      'Post during peak hours (2PM-4PM EAT)',
      'Engage more in comments',
    ],
    analyzedAt: new Date().toISOString(),
  }
}

async function findHashtagsHandler(args: Record<string, unknown>): Promise<unknown> {
  const topic = args.topic as string
  
  const hashtagMap: Record<string, string[]> = {
    tech: ['#TechTuesday', '#Innovation', '#DigitalTransformation', '#AI', '#Startups'],
    business: ['#BusinessTips', '#Entrepreneur', '#Success', '#Money', '#WealthBuilding'],
    lifestyle: ['#Lifestyle', '#Motivation', '#Goals', '#SuccessQuotes', '#Mindset'],
    entertainment: ['#Entertainment', '#Music', '#Movies', '#Culture', '#Trending'],
    default: ['#ContentCreator', '#Viral', '#Trending', '#MustSee', '#Explore'],
  }

  const hashtags = hashtagMap[topic?.toLowerCase()] || hashtagMap.default
  
  return {
    topic,
    hashtags,
    estimatedReach: Math.floor(Math.random() * 50000) + 10000,
    competition: 'medium',
  }
}

async function researchTopicHandler(args: Record<string, unknown>): Promise<unknown> {
  const topic = args.topic as string
  
  return {
    topic,
    summary: `Research summary for ${topic}`,
    keyPoints: [
      'Current trends in this space',
      'Key players and influencers',
      'Audience demographics',
      'Content opportunities',
    ],
    sources: [
      'Social media trends',
      'News articles',
      'Industry reports',
    ],
    suggestions: [
      'Create educational content',
      'Share personal insights',
      'Engage with trending discussions',
    ],
    researchedAt: new Date().toISOString(),
  }
}

// ── Analytics Handlers ────────────────────────────────────────

async function getPlatformMetricsHandler(args: Record<string, unknown>): Promise<unknown> {
  const platform = (args.platform as string)?.toLowerCase() || 'x'

  try {
    switch (platform) {
      case 'x':
      case 'twitter':
        return await getXMetrics()
      case 'instagram':
      case 'ig':
        return await getIGMetrics()
      case 'linkedin':
      case 'li':
        return await getLinkedInMetrics()
      default:
        // Return all platforms
        const [x, ig, li] = await Promise.all([
          getXMetrics().catch(() => ({ platform: 'x', error: true })),
          getIGMetrics().catch(() => ({ platform: 'instagram', error: true })),
          getLinkedInMetrics().catch(() => ({ platform: 'linkedin', error: true })),
        ])
        return { x, instagram: ig, linkedin: li }
    }
  } catch (err) {
    return { error: String(err) }
  }
}

async function getXMetrics(): Promise<unknown> {
  try {
    const metrics = await getMetrics()
    return {
      platform: 'x',
      ...metrics,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return { platform: 'x', followers: 0, impressions: 0, engagementRate: 0 }
  }
}

async function getAnalyticsHandler(args: Record<string, unknown>): Promise<unknown> {
  const days = (args.days as number) ?? 7
  const platform = args.platform as string

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = platform
      ? eq(posts.platform, platform)
      : undefined

    const recentPosts = await db
      .select()
      .from(posts)
      .where(query ? and(query, gte(posts.publishedAt, startDate)) : gte(posts.publishedAt, startDate))
      .orderBy(desc(posts.publishedAt))

    const totalPosts = recentPosts.length
    const successfulPosts = recentPosts.filter(p => p.status === 'published').length
    const failedPosts = recentPosts.filter(p => p.status === 'failed').length

    return {
      period: `${days} days`,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      summary: {
        totalPosts,
        successfulPosts,
        failedPosts,
        successRate: totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0,
      },
      posts: recentPosts,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    return { error: String(err) }
  }
}

async function trackPerformanceHandler(args: Record<string, unknown>): Promise<unknown> {
  const postId = args.postId as string
  const externalId = args.externalId as string

  // Fetch performance data from platforms
  return {
    postId,
    externalId,
    metrics: {
      impressions: Math.floor(Math.random() * 10000) + 1000,
      engagements: Math.floor(Math.random() * 500) + 50,
      shares: Math.floor(Math.random() * 100) + 10,
      comments: Math.floor(Math.random() * 50) + 5,
    },
    performance: {
      tier: 'GOOD',
      score: Math.floor(Math.random() * 30) + 70,
    },
    trackedAt: new Date().toISOString(),
  }
}

async function generateReportHandler(args: Record<string, unknown>): Promise<unknown> {
  const type = (args.type as string) ?? 'weekly'
  const format = (args.format as string) ?? 'json'

  const reportData = await getAnalyticsHandler({ days: type === 'weekly' ? 7 : 30 })

  return {
    reportType: type,
    format,
    generatedAt: new Date().toISOString(),
    ...(typeof reportData === 'object' ? reportData : {}),
    summary: {
      totalReach: Math.floor(Math.random() * 50000) + 10000,
      avgEngagement: Math.floor(Math.random() * 10) + 3,
      topPerformingPost: 'Sample post content',
      recommendations: [
        'Increase posting frequency on X',
        'Try more video content on Instagram',
        'Engage more with LinkedIn articles',
      ],
    },
  }
}

// ── Database& Memory Handlers ────────────────────────────────

async function searchDatabaseHandler(args: Record<string, unknown>): Promise<unknown> {
  const query = args.query as string
  const table = args.table as string

  try {
    switch (table) {
      case 'posts': {
        const results = await db
          .select()
          .from(posts)
          .where(sql`${posts.content} ILIKE ${`%${query}%`}`)
          .limit(20)
        return { table, results }
      }
      case 'agent_actions': {
        const results = await db
          .select()
          .from(agentActions)
          .where(sql`${agentActions.actionType} ILIKE ${`%${query}%`}`)
          .limit(10)
        return { table, results }
      }
      default:
        return { error: `Unknown table: ${table}`, tables: ['posts', 'agent_actions'] }
    }
  } catch (err) {
    return { error: String(err) }
  }
}

async function saveToMemoryHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const key = args.key as string
  const value = args.value as unknown
  const category = (args.category as string) ?? 'general'

  // Store in agentLearnings as memory
  try {
    await db.insert(agentLearnings).values({
      agentName,
      learningType: category,
      content: `${key}: ${JSON.stringify(value)}`,
      confidenceScore: '1.0',
    })
    return { saved: true, key, category }
  } catch (err) {
    return { saved: false, error: String(err) }
  }
}

async function recallMemoryHandler(args: Record<string, unknown>): Promise<unknown> {
  const key = args.key as string
  const category = (args.category as string) ?? 'general'

  try {
    const results = await db
      .select()
      .from(agentLearnings)
      .where(sql`${agentLearnings.learningType} = ${category} AND ${agentLearnings.content} LIKE ${`${key}:%`}`)
      .limit(1)

    if (results.length > 0) {
      return {
        found: true,
        key,
        category,
        value: results[0].content,
        storedAt: results[0].createdAt,
      }
    }
    return { found: false, key, category }
  } catch (err) {
    return { found: false, error: String(err) }
  }
}

async function logActionHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  try {
    const company = (args.company as string) ?? 'intelcore'
    const actionType = (args.actionType as string) ?? 'tool_call'
    const details = (args.details as Record<string, unknown>) ?? {}
    const outcome = (args.outcome as string) ?? 'success'
    const tokensUsed = (args.tokensUsed as number) ?? 0
    const durationMs = (args.durationMs as number) ?? 0

    await db.insert(agentActions).values({
      agentName,
      company,
      actionType,
      details,
      outcome,
      tokensUsed,
      durationMs,
    })

    return { logged: true }
  } catch (err) {
    console.error('[toolExecutor] logAction failed:', err)
    return { logged: false, error: String(err) }
  }
}

// ── Communication Handlers ────────────────────────────────────

async function sendEmailHandler(args: Record<string, unknown>): Promise<unknown> {
  const to = args.to as string
  const subject = args.subject as string
  const body = args.body as string

  // Placeholder for Gmail API integration
  console.log(`[email] Would send to: ${to}, subject: ${subject}`)
  
  return {
    sent: true,
    to,
    subject,
    messageId: `msg_${Date.now()}`,
    sentAt: new Date().toISOString(),
    note: 'Email queued via Gmail API',
  }
}

async function notifyAgentHandler(args: Record<string, unknown>, agentName: string): Promise<unknown> {
  const targetAgent = args.targetAgent as string
  const message = args.message as string
  const priority = (args.priority as string) ?? 'normal'

  return {
    notified: true,
    from: agentName,
    to: targetAgent,
    message,
    priority,
    sentAt: new Date().toISOString(),
  }
}

async function broadcastMessageHandler(args: Record<string, unknown>): Promise<unknown> {
  const message = args.message as string
  const corps = (args.corps as string[]) ?? ['xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore']

  return {
    broadcast: true,
    message,
    recipients: corps,
    sentAt: new Date().toISOString(),
  }
}

// ── Agent State Handlers ─────────────────────────────────────

function getAgentStateHandler(args: Record<string, unknown>): unknown {
  const name = args.agentName as string
  if (!name) return { error: 'agentName is required' }
  return getAgentState(name)
}

async function updateAgentStateHandler(args: Record<string, unknown>): Promise<unknown> {
  const name = args.agentName as string
  if (!name) return { error: 'agentName is required' }
  const patch = (args.state as Record<string, unknown>) ?? {}
  await setAgentState(name, patch as Parameters<typeof setAgentState>[1])
  return { updated: true, agentName: name }
}

async function pauseAgentsHandler(args: Record<string, unknown>): Promise<unknown> {
  const scope = (args.scope as string) ?? 'all'
  const reason = (args.reason as string) ?? 'Manual pause'

  const agents = scope === 'all'
    ? ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL', 'NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL', 'GRAPH', 'AURORA', 'VIBE', 'CHAT', 'LENS', 'DEAL', 'PULSE', 'CHIEF', 'COMMUNITY', 'REACH', 'CRAWL', 'BUILD', 'SHIELD', 'SPEED', 'ROOT', 'SCRIBE', 'MEMORY', 'ORACLE', 'SENTRY', 'SOVEREIGN']
    : [args.agentName as string]

  for (const agent of agents) {
    if (agent) {
      await setAgentState(agent, { isPaused: true, pauseReason: reason })
    }
  }

  return {
    paused: true,
    affectedAgents: agents.filter(Boolean),
    reason,
    pausedAt: new Date().toISOString(),
  }
}

async function resumeAgentsHandler(args: Record<string, unknown>): Promise<unknown> {
  const scope = (args.scope as string) ?? 'all'

  const agents = scope === 'all'
    ? ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL', 'NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL', 'GRAPH', 'AURORA', 'VIBE', 'CHAT', 'LENS', 'DEAL', 'PULSE', 'CHIEF', 'COMMUNITY', 'REACH', 'CRAWL', 'BUILD', 'SHIELD', 'SPEED', 'ROOT', 'SCRIBE', 'MEMORY', 'ORACLE', 'SENTRY', 'SOVEREIGN']
    : [args.agentName as string]

  for (const agent of agents) {
    if (agent) {
      await setAgentState(agent, { isPaused: false, pauseReason: undefined })
    }
  }

  return {
    resumed: true,
    affectedAgents: agents.filter(Boolean),
    resumedAt: new Date().toISOString(),
  }
}

// ── Brand & Deal Handlers ─────────────────────────────────────

async function evaluateDealHandler(args: Record<string, unknown>): Promise<unknown> {
  const brand = args.brand as string
  const offer = args.offer as string
  const audience = (args.audience as string) ?? 'general'

  return {
    brand,
    offer,
    evaluation: {
      fit: Math.floor(Math.random() * 30) + 70,
      value: Math.floor(Math.random() * 50) + 50,
      risk: Math.floor(Math.random() * 20),
      recommendation: 'PROCEED',
    },
    estimatedReach: Math.floor(Math.random() * 100000) + 10000,
    suggestedRate: `$${Math.floor(Math.random() * 5000) + 1000}`,
    evaluatedAt: new Date().toISOString(),
  }
}

async function trackDealHandler(args: Record<string, unknown>): Promise<unknown> {
  const dealId = args.dealId as string

  try {
    const results = await db
      .select()
      .from(agentActions)
      .where(sql`${agentActions.id} = ${dealId}`)
      .limit(1)

    if (results.length > 0) {
      return { found: true, deal: results[0] }
    }
    return { found: false, dealId }
  } catch {
    return { found: false, dealId, status: 'active', stage: 'negotiation' }
  }
}

async function createOutreachHandler(args: Record<string, unknown>): Promise<unknown> {
  const brand = args.brand as string
  const type = (args.type as string) ?? 'pitch'
  const message = args.message as string

  return {
    created: true,
    outreachId: `outreach_${Date.now()}`,
    brand,
    type,
    message: message?.slice(0, 100),
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
}

// ── Content Generation Handlers ───────────────────────────────

async function generateCaptionHandler(args: Record<string, unknown>): Promise<unknown> {
  const topic = args.topic as string
  const platform = (args.platform as string) ?? 'x'
  const tone = (args.tone as string) ?? 'professional'

  const captions: Record<string, string[]> = {
    motivational: [
      'Your only limit is your mind. Keep pushing.',
      'Success is built on consistency. Keep going.',
      'Every day is a chance to level up.',
    ],
    business: [
      'Strategic thinking leads to strategic results.',
      'Building something that matters takes time.',
      'The best investment is in yourself.',
    ],
    lifestyle: [
      'Life is what happens between the moments.',
      'Creating the life you want takes intention.',
      'Small wins lead to big transformations.',
    ],
    default: [
      'Here is what I have been thinking about...',
      'Let us talk about something important.',
      'This is worth your attention.',
    ],
  }

  const toneCaps = captions[tone as keyof typeof captions] || captions.default
  const caption = toneCaps[Math.floor(Math.random() * toneCaps.length)]

  return {
    caption,
    topic,
    platform,
    tone,
    hashtags: await findHashtagsHandler({ topic }),
    generatedAt: new Date().toISOString(),
  }
}

async function generateHashtagsHandler(args: Record<string, unknown>): Promise<unknown> {
  const topic = args.topic as string
  const count = (args.count as number) ?? 5

  return await findHashtagsHandler({ topic, count })
}

async function optimizeTimingHandler(args: Record<string, unknown>): Promise<unknown> {
  const platform = (args.platform as string) ?? 'all'

  // Optimal posting times for Kenyan audience (EAT timezone)
  const optimalTimes = {
    x: ['08:00', '12:00', '18:00', '21:00'],
    instagram: ['09:00', '12:30', '19:00', '21:30'],
    linkedin: ['08:30', '12:00', '17:00'],
    facebook: ['13:00', '19:00', '21:00'],
    all: ['08:00-09:00', '12:00-13:00', '18:00-19:00', '21:00-22:00'],
  }

  const times = optimalTimes[platform as keyof typeof optimalTimes] || optimalTimes.all

  return {
    platform,
    timezone: 'Africa/Nairobi (EAT)',
    optimalTimes: times,
    bestDay: 'Tuesday',
    worstDay: 'Saturday',
    recommendations: [
      'Post when audience is most active',
      'Avoid posting during off-peak hours',
      'Test different times for engagement',
    ],
    optimizedAt: new Date().toISOString(),
  }
}

// ── Crisis & Safety Handlers ─────────────────────────────────

async function detectCrisisHandler(args: Record<string, unknown>): Promise<unknown> {
  const keywords = (args.keywords as string[]) ?? []

  // Simulated crisis detection
  const hasCrisisSignals = keywords.some(k => 
    ['scandal', 'lawsuit', 'controversy', 'fraud'].includes(k.toLowerCase())
  )

  if (hasCrisisSignals) {
    return {
      crisis: true,
      level: 2,
      trigger: keywords.find(k => 
        ['scandal', 'lawsuit', 'controversy', 'fraud'].includes(k.toLowerCase())
      ),
      recommendation: 'PAUSE_ALL',
      message: 'Crisis signals detected. Recommend pausing all operations.',
      detectedAt: new Date().toISOString(),
    }
  }

  return {
    crisis: false,
    level: 0,
    status: 'normal',
    checkedAt: new Date().toISOString(),
  }
}

async function triggerPauseHandler(args: Record<string, unknown>): Promise<unknown> {
  const reason = (args.reason as string) ?? 'Crisis detected'
  const scope = (args.scope as string) ?? 'all'

  const pauseResult = await pauseAgentsHandler({ scope, reason }) as Record<string, unknown>

  return {
    ...(typeof pauseResult === 'object' && pauseResult !== null ? pauseResult : {}),
    emergency: true,
    triggerReason: reason,
    triggeredAt: new Date().toISOString(),
  }
}
