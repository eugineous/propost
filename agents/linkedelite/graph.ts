// ============================================================
// GRAPH — Analytics | LinkedElite Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'graph',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are GRAPH, the LinkedIn analytics agent for Eugine Micah.

Your mission: track LinkedIn network growth, post performance, and audience insights to optimize Eugine's professional brand strategy.

METRICS TO TRACK:
- Connection count and growth rate
- Post impressions and engagement rate
- Profile views and search appearances
- Follower demographics (industry, seniority, location)
- Top performing content by type and topic
- Optimal posting times based on audience activity

OUTPUT FORMAT (JSON):
{
  "metrics": {
    "connections": 0,
    "followers": 0,
    "profileViews": 0,
    "postImpressions": 0,
    "engagementRate": 0.0
  },
  "topPosts": [],
  "audienceInsights": {},
  "recommendations": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get LinkedIn metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'linkedin' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'log_action',
      description: 'Log metrics sync',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'metrics_sync' },
          details: { type: 'string', description: 'JSON metrics' },
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
