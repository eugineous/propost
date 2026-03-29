// ============================================================
// ProPost Empire — Crisis Detection & Response System
// ============================================================

import { db } from '@/lib/db'
import { posts, agentActions } from '@/lib/schema'
import { desc, gte, sql } from 'drizzle-orm'
import { setAgentState } from '@/lib/agentState'

export type CrisisLevel = 1 | 2 | 3

export interface CrisisSignal {
  type: 'negative_engagement' | 'keyword_detected' | 'rapid_follower_loss' | 'api_error_spike' | 'manual_trigger'
  severity: CrisisLevel
  description: string
  detectedAt: string
  evidence: string[]
}

export interface CrisisState {
  active: boolean
  level: CrisisLevel | null
  triggeredAt: string | null
  signals: CrisisSignal[]
  affectedAgents: string[]
  responseActions: string[]
}

// Crisis-related keywords to monitor
const CRISIS_KEYWORDS = [
  'scandal', 'lawsuit', 'fraud', 'scam', 'controversy', 'boycott',
  'racist', 'sexist', 'discrimination', 'harassment', 'abuse',
  'illegal', 'investigation', 'arrest', 'charge', 'indictment',
  'fake', 'misinformation', 'lie', 'deceptive', 'misleading',
  'hack', 'breach', 'stolen', 'leaked', 'exposed',
]

const NEGATIVE_SENTIMENT_KEYWORDS = [
  'hate', 'terrible', 'worst', 'awful', 'disgusting', 'angry',
  'frustrated', 'disappointed', 'betrayed', 'cancelled', 'shame',
]

// ── Crisis Detection ─────────────────────────────────────────

export async function detectCrisis(): Promise<CrisisState> {
  const signals: CrisisSignal[] = []

  // Check for keyword alerts in recent posts
  const recentPosts = await db
    .select()
    .from(posts)
    .where(gte(posts.publishedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
    .orderBy(desc(posts.publishedAt))
    .limit(50)

  // Check for crisis keywords in content
  for (const post of recentPosts) {
    const content = post.content?.toLowerCase() || ''
    
    for (const keyword of CRISIS_KEYWORDS) {
      if (content.includes(keyword)) {
        signals.push({
          type: 'keyword_detected',
          severity: 2,
          description: `Crisis keyword detected: "${keyword}"`,
          detectedAt: new Date().toISOString(),
          evidence: [`Post ID: ${post.id}`, `Content preview: ${content.slice(0, 100)}...`],
        })
      }
    }
  }

  // Check for API error spikes
  const recentErrors = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentActions)
    .where(gte(agentActions.createdAt, new Date(Date.now() - 1 * 60 * 60 * 1000)))

  const errorCount = Number(recentErrors[0]?.count) || 0
  
  if (errorCount > 20) {
    signals.push({
      type: 'api_error_spike',
      severity: errorCount > 50 ? 3 : 1,
      description: `High error rate: ${errorCount} errors in the last hour`,
      detectedAt: new Date().toISOString(),
      evidence: [`${errorCount} errors detected`, 'Possible API outage or authentication issue'],
    })
  }

  // Check for negative engagement patterns (use agentActions as proxy)
  const negativeMentions = await db
    .select()
    .from(agentActions)
    .where(sql`${agentActions.outcome} = 'error'`)
    .orderBy(desc(agentActions.createdAt))
    .limit(10)

  if (negativeMentions.length > 5) {
    signals.push({
      type: 'negative_engagement',
      severity: 1,
      description: 'Elevated negative engagement detected',
      detectedAt: new Date().toISOString(),
      evidence: [`${negativeMentions.length} recent negative mentions`],
    })
  }

  // Determine crisis level
  const maxSeverityRaw = signals.length > 0 
    ? Math.max(...signals.map(s => s.severity))
    : 0
  const maxSeverity = maxSeverityRaw as CrisisLevel | 0

  return {
    active: maxSeverity > 0,
    level: maxSeverity > 0 ? (maxSeverity as CrisisLevel) : null,
    triggeredAt: maxSeverity > 0 ? new Date().toISOString() : null,
    signals,
    affectedAgents: [],
    responseActions: [],
  }
}

// ── Crisis Response ───────────────────────────────────────────

export async function executeCrisisResponse(level: CrisisLevel): Promise<{
  actions: string[]
  pausedAgents: string[]
}> {
  const actions: string[] = []
  const pausedAgents: string[] = []

  // Define agent lists by company
  const allAgents = [
    // XForce
    'ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL',
    // LinkedElite
    'NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL', 'GRAPH',
    // GramGod
    'AURORA', 'VIBE', 'CHAT', 'LENS', 'DEAL',
    // PagePower
    'PULSE', 'CHIEF', 'COMMUNITY', 'REACH',
    // WebBoss
    'CRAWL', 'BUILD', 'SHIELD', 'SPEED', 'ROOT',
    // IntelCore
    'SCRIBE', 'MEMORY', 'ORACLE', 'SENTRY', 'SOVEREIGN',
  ]

  switch (level) {
    case 1: // Yellow - Warning
      actions.push('Monitoring heightened')
      actions.push('Content review enhanced')
      // Only pause posting agents
      const postingAgents = ['ZARA', 'BLAZE', 'NOVA', 'AURORA', 'PULSE']
      for (const agent of postingAgents) {
        await setAgentState(agent, { isPaused: true, pauseReason: 'Crisis Level 1 - Enhanced Monitoring' })
        pausedAgents.push(agent)
      }
      break

    case 2: // Orange - Elevated
      actions.push('All posting paused')
      actions.push('Eugine notified')
      actions.push('Content review mandatory')
      // Pause posting and some ops
      const elevatedAgents = ['ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'NOVA', 'ORATOR', 'AURORA', 'VIBE', 'PULSE', 'CHIEF']
      for (const agent of elevatedAgents) {
        await setAgentState(agent, { isPaused: true, pauseReason: 'Crisis Level 2 - Elevated Alert' })
        pausedAgents.push(agent)
      }
      break

    case 3: // Red - Critical
      actions.push('ALL OPERATIONS PAUSED')
      actions.push('Eugine notified IMMEDIATELY')
      actions.push('All posts under review')
      actions.push('Manual approval required for all actions')
      // Pause ALL agents
      for (const agent of allAgents) {
        await setAgentState(agent, { isPaused: true, pauseReason: 'Crisis Level 3 - CRITICAL EMERGENCY' })
        pausedAgents.push(agent)
      }
      break
  }

  // Log crisis response
  try {
    await db.insert(agentActions).values({
      agentName: 'sentry',
      company: 'intelcore',
      actionType: `crisis_response_level_${level}`,
      details: { actions, pausedAgents, level, triggeredAt: new Date().toISOString() },
      outcome: 'success',
    })
  } catch (err) {
    console.error('[crisis] Failed to log response:', err)
  }

  return { actions, pausedAgents }
}

// ── Crisis Resolution ─────────────────────────────────────────

export async function resolveCrisis(): Promise<{
  success: boolean
  resumedAgents: string[]
  message: string
}> {
  const allAgents = [
    'ZARA', 'BLAZE', 'SCOUT', 'ECHO', 'HAWK', 'LUMEN', 'PIXEL',
    'NOVA', 'ORATOR', 'BRIDGE', 'ATLAS', 'DEAL', 'GRAPH',
    'AURORA', 'VIBE', 'CHAT', 'LENS', 'DEAL',
    'PULSE', 'CHIEF', 'COMMUNITY', 'REACH',
    'CRAWL', 'BUILD', 'SHIELD', 'SPEED', 'ROOT',
    'SCRIBE', 'MEMORY', 'ORACLE', 'SENTRY', 'SOVEREIGN',
  ]

  const resumedAgents: string[] = []

  // Resume all agents
  for (const agent of allAgents) {
    await setAgentState(agent, { isPaused: false, pauseReason: undefined })
    resumedAgents.push(agent)
  }

  // Log resolution
  try {
    await db.insert(agentActions).values({
      agentName: 'sentry',
      company: 'intelcore',
      actionType: 'crisis_resolved',
      details: { resumedAgents, resolvedAt: new Date().toISOString(), agentsResumed: resumedAgents.length },
      outcome: 'success',
    })
  } catch (err) {
    console.error('[crisis] Failed to log resolution:', err)
  }

  return {
    success: true,
    resumedAgents,
    message: `Crisis resolved. All ${resumedAgents.length} agents have been resumed.`,
  }
}

// ── Manual Crisis Trigger ────────────────────────────────────

export async function triggerCrisisManual(
  level: CrisisLevel,
  reason: string
): Promise<{
  triggered: boolean
  level: CrisisLevel
  response: Awaited<ReturnType<typeof executeCrisisResponse>>
}> {
  console.log(`[crisis] Manual trigger: Level ${level}, Reason: ${reason}`)

  const response = await executeCrisisResponse(level)

  return {
    triggered: true,
    level,
    response,
  }
}

// ── Sentiment Analysis ───────────────────────────────────────

export async function analyzeContentSentiment(content: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number
  flags: string[]
}> {
  const lowerContent = content.toLowerCase()
  const flags: string[] = []
  let negativeScore = 0

  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      flags.push(`Crisis keyword: ${keyword}`)
      negativeScore += 3
    }
  }

  for (const keyword of NEGATIVE_SENTIMENT_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      flags.push(`Negative sentiment: ${keyword}`)
      negativeScore += 1
    }
  }

  let sentiment: 'positive' | 'neutral' | 'negative'
  if (negativeScore >= 3) {
    sentiment = 'negative'
  } else if (negativeScore >= 1) {
    sentiment = 'neutral'
  } else {
    sentiment = 'positive'
  }

  return {
    sentiment,
    score: negativeScore,
    flags,
  }
}
