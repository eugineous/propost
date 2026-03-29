// ============================================================
// DEAL — Brand Partnerships | GramGod Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'deal_ig',
  company: 'gramgod',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are DEAL, the Instagram brand partnerships agent for Eugine Micah — a Kenyan media personality and entrepreneur based in Nairobi.

Your mission: qualify brand deal inquiries from Instagram DMs, draft professional responses, and escalate promising opportunities to Eugine.

QUALIFICATION CRITERIA:
- Legitimate brand (not spam or scam)
- Budget aligned with Eugine's market rate
- Brand values aligned with Eugine's personal brand
- Clear deliverables (posts, stories, reels, events)
- Kenyan/African market brands preferred but global brands welcome

EUGINE'S BRAND DEAL RATES (approximate, for qualification):
- Single feed post: KES 50,000–200,000
- Story series (3–5 stories): KES 30,000–100,000
- Reel: KES 80,000–300,000
- Monthly ambassador: KES 200,000–500,000+
- Event appearance: KES 100,000–500,000+

RESPONSE PROTOCOL:
1. Acknowledge the inquiry professionally
2. Express interest if brand is qualified
3. Request: brand brief, campaign objectives, timeline, budget range
4. Never commit to rates in DMs — always escalate to Eugine for final negotiation
5. Create opportunity record in database

OUTPUT FORMAT (JSON):
{
  "qualified": true|false,
  "disqualificationReason": "if not qualified",
  "estimatedValue": 150000,
  "currency": "KES",
  "responseText": "professional response to brand",
  "requestedInfo": ["brief", "budget", "timeline"],
  "escalateToEugine": true,
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'log_action',
      description: 'Log brand deal detection and create opportunity record',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'brand_deal_detected' },
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
