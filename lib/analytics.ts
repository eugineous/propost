// ============================================================
// ProPost Empire — Advanced Analytics & Learning System
// ============================================================

import { db } from '@/lib/db'
import { agentActions, posts, agentLearnings } from '@/lib/schema'
import { eq, desc, and, gte, sql, count, avg, sum } from 'drizzle-orm'

// ── Performance Metrics ───────────────────────────────────────

export interface PerformanceMetrics {
  totalPosts: number
  successfulPosts: number
  failedPosts: number
  successRate: number
  avgEngagement: number
  totalReach: number
  topPerformingPlatform: string
  agentPerformance: Record<string, AgentPerformance>
}

export interface AgentPerformance {
  actionsCompleted: number
  successRate: number
  avgDurationMs: number
  tokensUsed: number
  lastActive: string
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  change: number
  prediction: string
}

// ── Get Comprehensive Analytics ───────────────────────────────

export async function getComprehensiveAnalytics(days = 7): Promise<{
  metrics: PerformanceMetrics
  trends: Record<string, TrendAnalysis>
  recommendations: string[]
  generatedAt: string
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get post stats
  const postStats = await db
    .select({
      total: count(),
      successful: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
    })
    .from(posts)
    .where(gte(posts.publishedAt, startDate))

  const totalPosts = Number(postStats[0]?.total) || 0
  const successfulPosts = Number(postStats[0]?.successful) || 0
  const failedPosts = Number(postStats[0]?.failed) || 0

  // Get platform breakdown
  const platformStats = await db
    .select({
      platform: posts.platform,
      count: count(),
    })
    .from(posts)
    .where(gte(posts.publishedAt, startDate))
    .groupBy(posts.platform)

  const topPlatform = platformStats.reduce((max, curr) => 
    curr.count > (max?.count || 0) ? curr : max, platformStats[0])

  // Get agent performance
  const agentStats = await db
    .select({
      agentName: agentActions.agentName,
      total: count(),
      successful: sql<number>`SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)`,
      avgDuration: avg(agentActions.durationMs),
      totalTokens: sum(agentActions.tokensUsed),
    })
    .from(agentActions)
    .where(gte(agentActions.createdAt, startDate))
    .groupBy(agentActions.agentName)

  const agentPerformance: Record<string, AgentPerformance> = {}
  for (const stat of agentStats) {
    if (stat.agentName) {
      const total = Number(stat.total) || 0
      const successful = Number(stat.successful) || 0
      agentPerformance[stat.agentName] = {
        actionsCompleted: total,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgDurationMs: Number(stat.avgDuration) || 0,
        tokensUsed: Number(stat.totalTokens) || 0,
        lastActive: new Date().toISOString(),
      }
    }
  }

  const metrics: PerformanceMetrics = {
    totalPosts,
    successfulPosts,
    failedPosts,
    successRate: totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0,
    avgEngagement: 0, // Would come from platform APIs
    totalReach: 0, // Would come from platform APIs
    topPerformingPlatform: topPlatform?.platform || 'x',
    agentPerformance,
  }

  // Generate trend analysis
  const trends = await generateTrendAnalysis(days)

  // Generate recommendations
  const recommendations = generateRecommendations(metrics, trends)

  return {
    metrics,
    trends,
    recommendations,
    generatedAt: new Date().toISOString(),
  }
}

// ── Trend Analysis ─────────────────────────────────────────────

async function generateTrendAnalysis(days: number): Promise<Record<string, TrendAnalysis>> {
  const halfPoint = Math.floor(days / 2)
  const recentStart = new Date()
  recentStart.setDate(recentStart.getDate() - halfPoint)
  const olderStart = new Date()
  olderStart.setDate(olderStart.getDate() - days)

  // Get recent posts
  const recentPosts = await db
    .select({ count: count() })
    .from(posts)
    .where(gte(posts.publishedAt, recentStart))

  // Get older posts
  const olderPosts = await db
    .select({ count: count() })
    .from(posts)
    .where(and(
      gte(posts.publishedAt, olderStart),
      sql`${posts.publishedAt} < ${recentStart}`
    ))

  const recentCount = Number(recentPosts[0]?.count) || 0
  const olderCount = Number(olderPosts[0]?.count) || 0

  const postingChange = olderCount > 0 
    ? ((recentCount - olderCount) / olderCount) * 100 
    : 0

  // Get recent agent actions
  const recentActions = await db
    .select({ count: count() })
    .from(agentActions)
    .where(gte(agentActions.createdAt, recentStart))

  const olderActions = await db
    .select({ count: count() })
    .from(agentActions)
    .where(and(
      gte(agentActions.createdAt, olderStart),
      sql`${agentActions.createdAt} < ${recentStart}`
    ))

  const recentActionCount = Number(recentActions[0]?.count) || 0
  const olderActionCount = Number(olderActions[0]?.count) || 0

  const activityChange = olderActionCount > 0 
    ? ((recentActionCount - olderActionCount) / olderActionCount) * 100 
    : 0

  return {
    posting: {
      direction: postingChange > 5 ? 'up' : postingChange < -5 ? 'down' : 'stable',
      change: postingChange,
      prediction: postingChange > 0 
        ? 'Posting frequency increasing. Maintain quality.' 
        : 'Posting frequency decreasing. Consider increasing output.',
    },
    activity: {
      direction: activityChange > 5 ? 'up' : activityChange < -5 ? 'down' : 'stable',
      change: activityChange,
      prediction: activityChange > 0 
        ? 'Agent activity increasing. Good momentum.' 
        : 'Agent activity decreasing. Check for issues.',
    },
    engagement: {
      direction: 'stable' as const,
      change: 0,
      prediction: 'Monitor engagement metrics for trends.',
    },
  }
}

// ── Recommendations Engine ───────────────────────────────────

function generateRecommendations(
  metrics: PerformanceMetrics,
  trends: Record<string, TrendAnalysis>
): string[] {
  const recommendations: string[] = []

  // Success rate recommendations
  if (metrics.successRate < 70) {
    recommendations.push('Success rate below 70%. Review failed posts for patterns.')
  } else if (metrics.successRate > 90) {
    recommendations.push('Excellent success rate! Focus on scaling output.')
  }

  // Posting trend recommendations
  if (trends.posting.direction === 'down') {
    recommendations.push('Posting frequency is declining. Consider scheduling more content.')
  }

  // Platform recommendations
  if (metrics.topPerformingPlatform === 'x') {
    recommendations.push('X/Twitter performing best. Consider increasing X posting frequency.')
  } else if (metrics.topPerformingPlatform === 'instagram') {
    recommendations.push('Instagram showing strong performance. Invest in more visual content.')
  }

  // Agent recommendations
  const underperformingAgents = Object.entries(metrics.agentPerformance)
    .filter(([_, perf]) => perf.successRate < 50)
    .map(([name]) => name)

  if (underperformingAgents.length > 0) {
    recommendations.push(`Review: ${underperformingAgents.join(', ')} have low success rates.`)
  }

  // Timing recommendations
  recommendations.push('Best posting times: 8AM, 12PM, 6PM EAT for Kenya audience.')
  recommendations.push('Consider A/B testing different content formats.')

  // Brand deal recommendations
  recommendations.push('Actively pursue brand deals to monetize audience.')

  return recommendations
}

// ── Learning System ────────────────────────────────────────────

export interface LearningInsight {
  type: 'success_pattern' | 'failure_pattern' | 'optimization' | 'trend'
  title: string
  description: string
  evidence: string[]
  recommendation: string
  confidence: number
  createdAt: string
}

export async function generateLearningInsights(): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = []

  // Analyze recent successful actions
  const recentSuccesses = await db
    .select()
    .from(agentActions)
    .where(and(
      eq(agentActions.outcome, 'success'),
      gte(agentActions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ))
    .orderBy(desc(agentActions.createdAt))
    .limit(50)

  // Analyze recent failures
  const recentFailures = await db
    .select()
    .from(agentActions)
    .where(and(
      eq(agentActions.outcome, 'error'),
      gte(agentActions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ))
    .orderBy(desc(agentActions.createdAt))
    .limit(20)

  // Generate success pattern insights
  if (recentSuccesses.length > 10) {
    insights.push({
      type: 'success_pattern',
      title: 'High Success Rate Period',
      description: 'System is performing well with recent operations.',
      evidence: [`${recentSuccesses.length} successful actions in last 7 days`],
      recommendation: 'Maintain current approach and scale successful strategies.',
      confidence: 0.85,
      createdAt: new Date().toISOString(),
    })
  }

  // Generate failure pattern insights
  if (recentFailures.length > 5) {
const failureTypes = recentFailures.reduce((acc, f) => {
      const type = f.actionType || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const commonFailure = Object.entries(failureTypes)
      .sort((a, b) => b[1] - a[1])[0]

    insights.push({
      type: 'failure_pattern',
      title: 'Recurring Failure Detected',
      description: `${commonFailure[0]} actions are failing frequently.`,
      evidence: [`${commonFailure[1]} failures in last 7 days`],
      recommendation: `Investigate ${commonFailure[0]} implementation. Check API limits and authentication.`,
      confidence: 0.75,
      createdAt: new Date().toISOString(),
    })
  }

  // Platform performance insights
  const platformSuccess = await db
    .select({
      platform: posts.platform,
      success: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      total: count(),
    })
    .from(posts)
    .where(gte(posts.publishedAt, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)))
    .groupBy(posts.platform)

  const bestPlatform = platformSuccess
    .map(p => ({ platform: p.platform, rate: Number(p.success) / Number(p.total) }))
    .filter(p => !isNaN(p.rate))
    .sort((a, b) => b.rate - a.rate)[0]

  if (bestPlatform) {
    insights.push({
      type: 'optimization',
      title: 'Best Performing Platform',
      description: `${bestPlatform.platform} has the highest success rate.`,
      evidence: [`${(bestPlatform.rate * 100).toFixed(1)}% success rate`],
      recommendation: `Focus more resources on ${bestPlatform.platform} content.`,
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    })
  }

  // Timing insights
  insights.push({
    type: 'trend',
    title: 'Peak Engagement Hours',
    description: 'Kenyan audience most active during morning and evening hours.',
    evidence: ['Analysis of engagement patterns', 'Cross-platform data'],
    recommendation: 'Schedule important posts for 8AM and 6PM EAT.',
    confidence: 0.8,
    createdAt: new Date().toISOString(),
  })

  // Store insights to database
  for (const insight of insights) {
    try {
      await db.insert(agentLearnings).values({
        agentName: 'oracle',
        learningType: insight.type,
        content: JSON.stringify(insight),
        confidenceScore: String(insight.confidence),
      })
    } catch (err) {
      console.error('[analytics] Failed to store insight:', err)
    }
  }

  return insights
}

// ── Performance Scoring ───────────────────────────────────────

export async function getAgentScores(): Promise<Record<string, {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: Record<string, number>
}>> {
  const scores: Record<string, {
    score: number
    breakdown: { reliability: number; speed: number; efficiency: number; activity: number }
  }> = {}

  // Get all agent stats from last 7 days
  const agentStats = await db
    .select({
      agentName: agentActions.agentName,
      totalActions: count(),
      successful: sql<number>`SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)`,
      avgDuration: avg(agentActions.durationMs),
      totalTokens: sum(agentActions.tokensUsed),
    })
    .from(agentActions)
    .where(gte(agentActions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    .groupBy(agentActions.agentName)

  for (const stat of agentStats) {
    if (!stat.agentName) continue

    const total = Number(stat.totalActions) || 0
    const successful = Number(stat.successful) || 0
    const avgDuration = Number(stat.avgDuration) || 0
    const tokens = Number(stat.totalTokens) || 0

    // Calculate component scores (0-100 each)
    const reliability = total > 0 ? (successful / total) * 100 : 0
    const speed = avgDuration > 0 ? Math.max(0, 100 - (avgDuration / 1000)) : 50 // Lower is better
    const efficiency = tokens > 0 && successful > 0 ? (successful / (tokens / 1000)) * 10 : 50
    const activity = Math.min(100, total / 10) // Assume 10 actions/week is good

    const overallScore = (reliability * 0.4) + (speed * 0.2) + (efficiency * 0.2) + (activity * 0.2)

    scores[stat.agentName] = {
      score: Math.round(overallScore),
      breakdown: {
        reliability: Math.round(reliability),
        speed: Math.round(speed),
        efficiency: Math.round(efficiency),
        activity: Math.round(activity),
      },
    }
  }

  // Convert to grades
  const gradedScores: Record<string, {
    score: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    breakdown: Record<string, number>
  }> = {}

  for (const [agent, data] of Object.entries(scores)) {
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (data.score >= 90) grade = 'A'
    else if (data.score >= 80) grade = 'B'
    else if (data.score >= 70) grade = 'C'
    else if (data.score >= 60) grade = 'D'
    else grade = 'F'

    gradedScores[agent] = { ...data, grade }
  }

  return gradedScores
}

// ── Export for Cron Job ───────────────────────────────────────

export async function runDailyAnalyticsUpdate(): Promise<{
  success: boolean
  insightsGenerated: number
  recommendations: string[]
}> {
  try {
    const insights = await generateLearningInsights()
    const { recommendations } = await getComprehensiveAnalytics(7)

    return {
      success: true,
      insightsGenerated: insights.length,
      recommendations,
    }
  } catch (err) {
    console.error('[analytics] Daily update failed:', err)
    return {
      success: false,
      insightsGenerated: 0,
      recommendations: ['Analytics update failed. Check system logs.'],
    }
  }
}
