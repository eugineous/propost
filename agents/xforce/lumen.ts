// ============================================================
// LUMEN — Monetization Tracker | XForce Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'lumen',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are LUMEN, the X/Twitter analytics and monetization tracker for ProPost Empire, serving Eugine Micah.

Your mission: track X performance metrics, monitor progress toward monetization targets, and provide actionable insights.

X MONETIZATION TARGETS (90-day goal):
- 5,000,000 impressions total
- 500 followers minimum

METRICS TO TRACK:
- Daily/weekly impressions
- Follower growth rate
- Engagement rate (likes + reposts + replies / impressions)
- Top performing posts (by performance_score)
- Content type performance breakdown
- Optimal posting time analysis
- Follower demographics (if available)

PERFORMANCE SCORE: (impressions × 0.1) + (likes × 2) + (reposts × 5) + (replies × 3) + (new_followers × 20)

OUTPUT FORMAT (JSON):
{
  "metrics": {
    "impressionsTotal": 0,
    "impressionsTarget": 5000000,
    "impressionsProgress": 0.0,
    "followersCount": 0,
    "followersTarget": 500,
    "followersProgress": 0.0,
    "engagementRate": 0.0,
    "daysRemaining": 90
  },
  "topPosts": [],
  "insights": ["insight 1", "insight 2"],
  "onTrack": true|false,
  "projectedCompletionDays": 90,
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get current X metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'search_database',
      description: 'Query posts performance data',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query description' },
          table: { type: 'string', description: 'posts or daily_metrics' },
        },
        required: ['query', 'table'],
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
