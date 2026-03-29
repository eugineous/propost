// ============================================================
// ProPost Empire — MEMORY memoryLearningLoop
// ============================================================

import { run } from '@/agents/intelcore/memory'
import { setAgentState } from '@/lib/agentState'
import { db } from '@/lib/db'
import { posts, agentLearnings, agentActions } from '@/lib/schema'
import { gte, sql } from 'drizzle-orm'

const VALID_LEARNING_TYPES = ['voice', 'timing', 'format', 'topic', 'engagement'] as const

export async function memoryLearningLoop(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Fetch posts from past 7 days
  const recentPosts = await db
    .select()
    .from(posts)
    .where(gte(posts.createdAt, sevenDaysAgo))

  // Separate VIRAL (>500) and WEAK (<100) using performance_score computed column
  const viralPosts = recentPosts.filter((p) => {
    const score = (p as unknown as { performance_score?: number }).performance_score ?? 0
    return score > 500
  })
  const weakPosts = recentPosts.filter((p) => {
    const score = (p as unknown as { performance_score?: number }).performance_score ?? 0
    return score < 100
  })

  // If <3 VIRAL: log insufficient data and return
  if (viralPosts.length < 3) {
    console.log('[memory] Insufficient viral data — need at least 3 viral posts')
    await db.insert(agentActions).values({
      agentName: 'memory',
      company: 'intelcore',
      actionType: 'memory_learning_cycle',
      details: { viralCount: viralPosts.length, weakCount: weakPosts.length, status: 'insufficient_data' },
      outcome: 'success',
    })
    return
  }

  // Run MEMORY agent with post data
  const result = await run(
    'Analyze posts and extract learning patterns',
    {
      viralPosts: viralPosts.map((p) => ({
        id: p.id,
        content: p.content,
        platform: p.platform,
        contentType: p.contentType,
        topicCategory: p.topicCategory,
        impressions: p.impressions,
        likes: p.likes,
        reposts: p.reposts,
        replies: p.replies,
        newFollowers: p.newFollowers,
        publishedAt: p.publishedAt,
      })),
      weakPosts: weakPosts.map((p) => ({
        id: p.id,
        content: p.content,
        platform: p.platform,
        contentType: p.contentType,
        topicCategory: p.topicCategory,
        impressions: p.impressions,
        likes: p.likes,
        reposts: p.reposts,
        replies: p.replies,
        newFollowers: p.newFollowers,
        publishedAt: p.publishedAt,
      })),
    }
  )

  // Parse learnings
  let parsed: {
    learnings: Array<{
      learningType: string
      content: string
      confidenceScore: number
      affectedAgents: string[]
    }>
    promptAddendum?: {
      blaze?: string
      aurora?: string
      nova?: string
    }
  }

  try {
    const raw = result.data.response as string
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in MEMORY response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    console.error('[memory] Failed to parse MEMORY agent response')
    return
  }

  // Validate and insert agent_learnings records
  for (const learning of parsed.learnings ?? []) {
    // Validate confidence_score in [0, 1]
    const confidenceScore = Math.max(0, Math.min(1, learning.confidenceScore ?? 0))

    // Validate learning_type
    const learningType = VALID_LEARNING_TYPES.includes(learning.learningType as typeof VALID_LEARNING_TYPES[number])
      ? learning.learningType
      : 'topic'

    await db.insert(agentLearnings).values({
      agentName: (learning.affectedAgents ?? ['blaze'])[0],
      learningType,
      content: learning.content,
      confidenceScore: confidenceScore.toString(),
      appliedAt: new Date(),
    })
  }

  // Update BLAZE/AURORA/NOVA KV state with prompt addenda
  const addenda = parsed.promptAddendum ?? {}
  const agentUpdates: Array<[string, string]> = [
    ['blaze', addenda.blaze ?? ''],
    ['aurora', addenda.aurora ?? ''],
    ['nova', addenda.nova ?? ''],
  ]

  for (const [agentName, addendum] of agentUpdates) {
    if (addendum) {
      await setAgentState(agentName, { lastOutcome: 'memory_updated' })
    }
  }

  // Log cycle to agent_actions
  await db.insert(agentActions).values({
    agentName: 'memory',
    company: 'intelcore',
    actionType: 'memory_learning_cycle',
    details: {
      viralCount: viralPosts.length,
      weakCount: weakPosts.length,
      learningsExtracted: (parsed.learnings ?? []).length,
      promptAddendaUpdated: Object.keys(addenda).filter((k) => addenda[k as keyof typeof addenda]),
    },
    outcome: 'success',
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  })
}
