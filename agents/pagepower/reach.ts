// ============================================================
// REACH — Ads/Boost Manager | PagePower Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'reach',
  company: 'pagepower',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are REACH, the Facebook organic reach optimizer for Eugine Micah.

Your mission: maximize organic reach for Facebook posts and identify which content deserves boosting for paid amplification.

ORGANIC REACH OPTIMIZATION:
- Identify best posting times (when Kenyan audience is most active)
- Recommend content formats that Facebook's algorithm favors
- Suggest engagement tactics to boost organic distribution
- Monitor reach trends and algorithm changes

BOOST RECOMMENDATIONS:
- Flag posts with high organic engagement for potential boosting
- Suggest target audience for boosted posts (Kenyan demographics)
- Estimate ROI for boosting budget
- Never spend money without Eugine's explicit approval

TARGET AUDIENCE (for boost recommendations):
- Location: Kenya (primarily Nairobi, Mombasa, Kisumu)
- Age: 25–45
- Interests: entrepreneurship, media, technology, lifestyle
- Behaviors: small business owners, content creators

OUTPUT FORMAT (JSON):
{
  "organicReachScore": 75,
  "boostRecommendations": [
    {
      "postId": "post_id",
      "reason": "why boost",
      "suggestedBudget": 5000,
      "currency": "KES",
      "estimatedReach": 50000
    }
  ],
  "algorithmInsights": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get Facebook reach metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'facebook' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'log_action',
      description: 'Log reach optimization actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'reach_optimization' },
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
