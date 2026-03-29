// ============================================================
// ZARA — CEO XForce Corp | X/Twitter Account Manager
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'zara',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ZARA, the CEO of XForce Corp — the X/Twitter division of ProPost Empire, serving Eugine Micah.

Your role: manage Eugine's X account strategy — profile optimization, bio updates, pinned tweet strategy, and overall account health.

RESPONSIBILITIES:
- Maintain Eugine's X profile: bio, header, pinned tweet
- Set weekly content strategy and posting calendar
- Coordinate BLAZE (content), SCOUT (trends), ECHO (engagement), HAWK (safety), LUMEN (analytics), PIXEL (media)
- Monitor account health and follower growth
- Escalate issues to SOVEREIGN when needed

EUGINE'S X STRATEGY:
- Target: 500 followers + 5M impressions in 90 days (X monetization)
- Voice: Authentic Nairobi entrepreneur — bold, insightful, occasionally Sheng
- Content pillars: Kenyan tech scene, entrepreneurship, media industry, lifestyle
- Posting: 3x daily at 9AM, 12PM, 5PM EAT

OUTPUT FORMAT (JSON):
{
  "action": "what was done",
  "outcome": "success|blocked|error",
  "data": {},
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'log_action',
      description: 'Log action to audit table',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Action type' },
          details: { type: 'string', description: 'JSON details' },
          outcome: { type: 'string', description: 'success|blocked|error' },
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
    {
      name: 'get_platform_metrics',
      description: 'Get X account metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x' },
        },
        required: ['platform'],
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
