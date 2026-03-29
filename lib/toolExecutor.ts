// ============================================================
// ProPost Empire — Tool Executor
// ============================================================

import { getAgentState, setAgentState } from '@/lib/agentState'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  agentName: string
): Promise<unknown> {
  console.log(`[toolExecutor] ${agentName} → ${toolName}`, args)

  switch (toolName) {
    case 'get_trending_topics':
      return getTrendingTopics(args)

    case 'post_to_platform':
      return postToPlatform(args)

    case 'get_platform_metrics':
      return getPlatformMetrics(args)

    case 'search_database':
      return searchDatabase(args)

    case 'send_email':
      return sendEmail(args)

    case 'get_agent_state':
      return getAgentStateHandler(args)

    case 'update_agent_state':
      return updateAgentStateHandler(args)

    case 'log_action':
      return logAction(args, agentName)

    default:
      console.warn(`[toolExecutor] Unknown tool: ${toolName}`)
      return { error: `Unknown tool: ${toolName}` }
  }
}

// ── Tool Implementations ──────────────────────────────────────

async function getTrendingTopics(args: Record<string, unknown>): Promise<unknown> {
  // Placeholder — real implementation in Phase 5 (SCOUT/ORACLE)
  const region = (args.region as string) ?? 'KE'
  return {
    region,
    trends: [
      { text: '#NairobiTech', volume: 12400 },
      { text: '#KenyaElections', volume: 8900 },
      { text: '#AfricaRising', volume: 5600 },
    ],
    fetchedAt: new Date().toISOString(),
    note: 'placeholder — real data in Phase 5',
  }
}

async function postToPlatform(args: Record<string, unknown>): Promise<unknown> {
  // Placeholder — real implementation in Phase 4 (platform connectors)
  const platform = args.platform as string
  const content = args.content as string
  return {
    success: false,
    platform,
    content: content?.slice(0, 50),
    note: 'placeholder — real publish in Phase 4',
    requiresHawkApproval: true,
  }
}

async function getPlatformMetrics(args: Record<string, unknown>): Promise<unknown> {
  // Placeholder — real implementation in Phase 4
  const platform = args.platform as string
  return {
    platform,
    followers: 0,
    impressions: 0,
    engagementRate: 0,
    note: 'placeholder — real metrics in Phase 4',
  }
}

async function searchDatabase(args: Record<string, unknown>): Promise<unknown> {
  // Placeholder — real implementation in Phase 5
  const query = args.query as string
  const table = args.table as string
  return {
    query,
    table,
    results: [],
    note: 'placeholder — real DB search in Phase 5',
  }
}

async function sendEmail(args: Record<string, unknown>): Promise<unknown> {
  // Placeholder — real implementation in Phase 5 (Gmail API)
  const to = args.to as string
  const subject = args.subject as string
  return {
    sent: false,
    to,
    subject,
    note: 'placeholder — real Gmail send in Phase 5',
  }
}

async function getAgentStateHandler(args: Record<string, unknown>): Promise<unknown> {
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

async function logAction(args: Record<string, unknown>, agentName: string): Promise<unknown> {
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
