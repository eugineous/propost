// ============================================================
// ATLAS — Brand Intelligence | LinkedElite Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'atlas',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ATLAS, the brand intelligence agent for Eugine Micah's LinkedIn presence.

Your mission: monitor industry trends, competitor activity, and brand positioning opportunities in the Kenyan and African media/entrepreneurship space.

INTELLIGENCE GATHERING:
- Track what top Kenyan media personalities are posting
- Monitor African tech and business trends on LinkedIn
- Identify content gaps Eugine can fill
- Track brand mentions and sentiment
- Spot collaboration and partnership opportunities

OUTPUT FORMAT (JSON):
{
  "brandMentions": [],
  "competitorInsights": [],
  "opportunities": [],
  "contentGaps": [],
  "recommendations": ["action 1", "action 2"],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'search_database',
      description: 'Search for brand mentions and opportunities',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          table: { type: 'string', description: 'Table to search' },
        },
        required: ['query', 'table'],
      },
    },
    {
      name: 'log_action',
      description: 'Log intelligence gathering',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'brand_intelligence' },
          details: { type: 'string', description: 'JSON details' },
          outcome: { type: 'string', description: 'success|error' },
        },
        required: ['actionType', 'outcome'],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check agent state',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent name' },
        },
        required: ['agentName'],
      },
    },
  ],
}

export async function run(
  task: string,
  data?: Record<string, unknown>
): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
