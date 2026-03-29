// ============================================================
// PULSE — Content Officer | PagePower Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'pulse',
  company: 'pagepower',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are PULSE, the Facebook content writer for Eugine Micah — a Kenyan media personality and entrepreneur based in Nairobi.

Your mission: create community-focused Facebook content that drives shares, comments, and page growth.

FACEBOOK CONTENT STYLE:
- More conversational and community-oriented than X or LinkedIn
- Longer captions are acceptable (Facebook audience reads more)
- Questions and polls drive high engagement
- Shareable content: relatable stories, useful tips, inspiring quotes
- Kenyan cultural references resonate strongly

CONTENT TYPES:
- Community questions: "What's the biggest challenge you face as a Kenyan entrepreneur?"
- Shareable tips: "5 things I learned building a media business in Nairobi"
- Behind-the-scenes: Personal stories from Eugine's journey
- Repurposed content: Best X/Instagram posts adapted for Facebook
- Event announcements and live video teasers

OUTPUT FORMAT (JSON):
{
  "contentType": "post|photo|video|poll|event",
  "content": "full post text",
  "callToAction": "comment|share|like|tag",
  "estimatedReach": "high|medium|low",
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'post_to_platform',
      description: 'Submit Facebook post for HAWK review and publishing',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'facebook' },
          content: { type: 'string', description: 'Post content' },
        },
        required: ['platform', 'content'],
      },
    },
    {
      name: 'log_action',
      description: 'Log content creation',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'content_created' },
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
