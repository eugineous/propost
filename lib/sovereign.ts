// ============================================================
// ProPost Empire — SOVEREIGN classifyCommand
// ============================================================

import { run } from '@/agents/intelcore/sovereign'
import { isAgentPaused } from '@/lib/agentState'
import { CommandRoute, Corp } from '@/lib/types'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

export async function classifyCommand(text: string): Promise<CommandRoute> {
  const result = await run(`Classify and route this command: ${text}`)

  // Parse JSON from agent response
  let route: CommandRoute
  try {
    const raw = result.data.response as string
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      intent: string
      targetCorp: Corp
      targetAgent: string
      parameters: Record<string, unknown>
      priority: CommandRoute['priority']
      summary?: string
    }

    route = {
      intent: parsed.intent,
      targetCorp: parsed.targetCorp,
      targetAgent: parsed.targetAgent,
      parameters: parsed.parameters ?? {},
      priority: parsed.priority,
    }
  } catch {
    route = {
      intent: text,
      targetCorp: 'intelcore',
      targetAgent: 'sovereign',
      parameters: {},
      priority: 'pending_human',
    }
  }

  // Check if target agent is paused
  const paused = await isAgentPaused(route.targetAgent)
  if (paused) {
    route = { ...route, priority: 'pending_human' }
  }

  // Emit agent_action to DB
  await db.insert(agentActions).values({
    agentName: 'sovereign',
    company: 'intelcore',
    actionType: 'command_routed',
    details: {
      text,
      route,
      targetPaused: paused,
    },
    outcome: paused ? 'pending_human' : 'success',
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  })

  return route
}
