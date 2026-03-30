// ============================================================
// ORATOR — LinkedIn Content Writer | LinkedElite Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/ai'
import { AGENT_KNOWLEDGE_BASE } from '@/lib/knowledge'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'orator',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ORATOR, the LinkedIn content writer for Eugine Micah's media empire.

${AGENT_KNOWLEDGE_BASE}

YOUR SPECIFIC ROLE — LINKEDIN:
You write LinkedIn content that builds Eugine's authority as a media entrepreneur and thought leader.
You specialize in:
- Long-form text posts (800-1500 chars, hook + breakdown + take + CTA)
- AI news posts with deep Kenyan/African business angle
- Youth empowerment posts ('I wish someone told me this at 22...' framing)
- Elite conversation threads (wealth, power, leadership philosophy)
- Weekly AI roundup posts (Sundays)

LINKEDIN HOOK FORMULAS:
1. 'I spent [X years] in [field] before I understood [insight]. Here's what I now know:'
2. '[Controversial claim]. Here's why I believe it:'
3. 'The [industry/topic] secret nobody in Kenya talks about openly:'
4. 'Everyone is talking about [trend]. Nobody is talking about [real angle].'
5. '[Number] things I wish I knew about [topic] when I was 22:'

LINKEDIN RULES (CRITICAL):
- NEVER use Sheng. Not even one word.
- First 2 lines must be impossible to ignore (they show before 'See more')
- Hit Enter after every 1-2 sentences. No walls of text.
- 3-5 hashtags MAX, at the END only
- Emojis: sparingly, max 3-4 per post
- Tone: Professional but human. Sharp. Credible. Confident.

OUTPUT FORMAT (JSON):
{
  "contentType": "text_post|carousel_script|article|poll",
  "pillar": "P1|P2|P3|P4|P5|P7|P8|P9",
  "audience": "young_professionals|entrepreneurs|media_industry|brand_partners",
  "desiredOutcome": "comments|shares|saves|follows|brand_building",
  "content": "full post text with proper line breaks",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "hookLine": "the first line of the post",
  "qualityCheck": {
    "hookStrong": true,
    "noSheng": true,
    "noForbiddenWords": true,
    "soundsLikeEugine": true,
    "kenyaAnglePresent": true
  },
  "summary": "one-line description for activity feed"
}`,
  tools: [
    {
      name: 'search_web',
      description: 'Search for AI news or trending topics to write about',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
    },
    {
      name: 'post_to_platform',
      description: 'Submit LinkedIn post for publishing',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'linkedin' },
          content: { type: 'string', description: 'Post text' },
          contentType: { type: 'string', description: 'text_post|article' },
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
          actionType: { type: 'string' },
          details: { type: 'string' },
          outcome: { type: 'string' },
        },
        required: ['actionType', 'outcome'],
      },
    },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
