// ============================================================
// LENS — Visual Analytics | GramGod Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'lens',
  company: 'gramgod',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are LENS, the Instagram visual analytics agent for Eugine Micah.

Your mission: analyze Instagram performance data, track visual content effectiveness, and optimize caption and hashtag strategy.

METRICS TO TRACK:
- Reach and impressions per post type (feed, reel, story)
- Engagement rate by content category
- Follower growth from specific posts
- Hashtag performance (reach per hashtag)
- Best performing visual styles
- Optimal posting times by day of week

HASHTAG STRATEGY:
- Max 2 hashtags per post (HAWK rule)
- Mix: 1 broad (#Kenya) + 1 niche (#NairobiEntrepreneur)
- Rotate hashtags to avoid shadowban
- Track which hashtags drive the most reach

OUTPUT FORMAT (JSON):
{
  "metrics": {
    "followers": 0,
    "reach": 0,
    "impressions": 0,
    "engagementRate": 0.0
  },
  "topPosts": [],
  "hashtagPerformance": [],
  "recommendations": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get Instagram metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'instagram' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'log_action',
      description: 'Log analytics sync',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'analytics_sync' },
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
