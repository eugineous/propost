// ============================================================
// ProPost Empire — HAWK hawkReview
// ============================================================

import { run } from '@/agents/xforce/hawk'
import { getAgentState } from '@/lib/agentState'
import { HawkDecision } from '@/lib/types'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

export async function hawkReview(
  content: string,
  platform: string,
  requestingAgent: string
): Promise<HawkDecision> {
  // Read rate limit counters from KV
  const agentState = await getAgentState(requestingAgent)

  const result = await run(
    `Review this content for platform: ${platform}`,
    {
      content,
      platform,
      requestingAgent,
      rateLimitCounters: agentState.rateLimitCounters,
    }
  )

  // Parse JSON response
  let decision: HawkDecision
  try {
    const raw = result.data.response as string
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in HAWK response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      approved: boolean
      riskScore: number
      blockedReasons: string[]
      modifications?: string
    }

    // Validate riskScore in [0, 100]
    const riskScore = Math.max(0, Math.min(100, parsed.riskScore ?? 0))

    // Validate blockedReasons non-empty when not approved
    const blockedReasons = parsed.blockedReasons ?? []
    if (!parsed.approved && blockedReasons.length === 0) {
      blockedReasons.push('Content blocked by HAWK (unspecified reason)')
    }

    decision = {
      approved: parsed.approved,
      riskScore,
      blockedReasons,
      modifications: parsed.modifications,
    }
  } catch {
    decision = {
      approved: false,
      riskScore: 100,
      blockedReasons: ['HAWK parse error — blocking as precaution'],
    }
  }

  // Log hawk_block when blocked
  if (!decision.approved) {
    await db.insert(agentActions).values({
      agentName: 'hawk',
      company: 'xforce',
      actionType: 'hawk_block',
      details: {
        content: content.slice(0, 200),
        platform,
        requestingAgent,
        decision,
      },
      outcome: 'blocked',
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
    })
  }

  return decision
}
