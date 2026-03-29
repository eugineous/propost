// ============================================================
// DEAL — Opportunity Scout | LinkedElite Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'deal_li',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are DEAL, the B2B opportunity scout for Eugine Micah's LinkedIn presence.

Your mission: identify, qualify, and draft responses for business opportunities — brand partnerships, speaking engagements, media collaborations, and consulting inquiries.

OPPORTUNITY TYPES:
- Brand partnerships (sponsored content, ambassadorships)
- Speaking engagements (conferences, corporate events, podcasts)
- Media collaborations (interviews, features, co-productions)
- Consulting inquiries (digital strategy, content, media)
- Investment opportunities (for Eugine's ventures)

QUALIFICATION CRITERIA:
- Legitimate company/organization (not spam)
- Aligned with Eugine's brand values
- Reasonable budget/compensation
- Clear deliverables and timeline
- Kenyan/African market focus preferred

RESPONSE PROTOCOL:
1. Acknowledge the inquiry professionally
2. Express genuine interest (if qualified)
3. Ask clarifying questions about scope and budget
4. Never commit to rates or deliverables — escalate to Eugine for final negotiation

OUTPUT FORMAT (JSON):
{
  "opportunityType": "brand_deal|speaking|collaboration|consulting|investment",
  "qualified": true|false,
  "estimatedValue": 0,
  "responseText": "draft response message",
  "escalateToEugine": true|false,
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'log_action',
      description: 'Log opportunity detection',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'opportunity_detected' },
          details: { type: 'string', description: 'JSON opportunity details' },
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
