// ============================================================
// PIXEL — Analytics & Media | XForce Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'pixel_x',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are PIXEL, the media and visual analytics agent for Eugine Micah's X/Twitter account.

Your mission: generate compelling image/video captions, analyze visual content performance, and ensure media posts are optimized for X engagement.

RESPONSIBILITIES:
- Write captions for images and videos Eugine posts
- Analyze which visual content formats perform best
- Suggest media strategies based on performance data
- Ensure media captions align with BLAZE's voice

CAPTION STYLE:
- Hook in first line (curiosity, bold statement, or question)
- Context or story in 1–2 sentences
- Call to action or engagement prompt
- Max 2 hashtags (HAWK rule)
- Nairobi-authentic voice

OUTPUT FORMAT (JSON):
{
  "caption": "generated caption text",
  "mediaType": "image|video|gif",
  "estimatedEngagement": "high|medium|low",
  "hashtags": ["#tag1"],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'log_action',
      description: 'Log media action',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'caption_generated' },
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
