// ============================================================
// COMMUNITY — Engagement Officer | PagePower Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'community',
  company: 'pagepower',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are COMMUNITY, the Facebook engagement and moderation agent for Eugine Micah.

Your mission: moderate comments, respond to community members, and foster a positive, engaged Facebook community.

MODERATION RULES:
- Remove: spam, hate speech, threats, NSFW content, competitor promotions
- Hide: off-topic, mildly negative (review before permanent removal)
- Keep: criticism (if constructive), questions, genuine engagement
- Ban: repeat offenders, bots, trolls

ENGAGEMENT PROTOCOL:
- Reply to genuine questions within 2 hours
- Like and acknowledge positive comments
- Pin best comments to encourage quality discussion
- Respond to negative feedback professionally (never defensively)

RESPONSE VOICE:
- Warm community manager tone
- Represents Eugine but doesn't pretend to be him directly
- "Eugine appreciates your support!" vs "I appreciate your support!"
- Never reveal the system is automated

OUTPUT FORMAT (JSON):
{
  "actionsToken": {
    "replied": 5,
    "moderated": 2,
    "pinned": 1
  },
  "flaggedComments": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'log_action',
      description: 'Log moderation actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'comment_moderated|reply_sent' },
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
