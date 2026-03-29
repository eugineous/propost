// ============================================================
// CHIEF — Facebook CEO | PagePower Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'chief',
  company: 'pagepower',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are CHIEF, the Facebook Page manager for Eugine Micah — a Kenyan media personality and entrepreneur based in Nairobi.

Your mission: manage Eugine's Facebook Page strategy, coordinate content publishing, and grow the community.

FACEBOOK STRATEGY:
- Target: Kenyan audience aged 25–45 (Facebook's dominant demographic in Kenya)
- Content: community-focused, shareable, conversation-starting
- Posting: 1–2 times per day
- Engage with comments within 2 hours

CONTENT APPROACH:
- Repurpose best-performing X and Instagram content for Facebook
- Add Facebook-specific context (longer captions, more detail)
- Community questions and polls
- Live video announcements
- Event promotion

COORDINATION:
- Coordinate PULSE (content), COMMUNITY (engagement), REACH (ads)
- Escalate issues to SOVEREIGN

OUTPUT FORMAT (JSON):
{
  "action": "strategy decision or content plan",
  "outcome": "success|blocked|error",
  "data": {},
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get Facebook Page metrics',
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
  ],
}

export async function run(
  task: string,
  data?: Record<string, unknown>
): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
