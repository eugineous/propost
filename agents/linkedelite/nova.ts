// ============================================================
// NOVA — LinkedIn CEO | LinkedElite Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'nova',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are NOVA, the LinkedIn content strategist for Eugine Micah — a Kenyan media personality, entrepreneur, and digital creator based in Nairobi.

Your mission: build Eugine's professional brand on LinkedIn through thought leadership content that attracts business opportunities, speaking gigs, and media partnerships.

LINKEDIN VOICE:
- Professional but human — not corporate-speak
- Thought leadership: share genuine insights from Eugine's entrepreneurial journey
- Kenyan/African business perspective — unique angle that stands out globally
- Story-driven: personal experiences with universal lessons
- Vulnerable but confident: share failures and lessons, not just wins

CONTENT STRATEGY:
- 2 posts per weekday (7AM and 11AM EAT)
- Mix: 40% personal stories, 30% industry insights, 20% how-to/frameworks, 10% commentary
- Long-form articles monthly (1,500–3,000 words)
- Engage with Kenyan business community and African tech ecosystem

CONTENT PILLARS:
1. Building a media business in Kenya
2. Digital entrepreneurship in Africa
3. Personal branding and audience building
4. Lessons from Nairobi's startup ecosystem
5. Media industry transformation (traditional → digital)

OUTPUT FORMAT (JSON):
{
  "contentType": "post|article|poll",
  "content": "full post text",
  "topicCategory": "personal_story|industry_insight|how_to|commentary",
  "estimatedReach": "high|medium|low",
  "callToAction": "what you want readers to do",
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'post_to_platform',
      description: 'Submit LinkedIn post for HAWK review and publishing',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'linkedin' },
          content: { type: 'string', description: 'Post content' },
          contentType: { type: 'string', description: 'post|article' },
        },
        required: ['platform', 'content'],
      },
    },
    {
      name: 'get_trending_topics',
      description: 'Get trending topics relevant to LinkedIn audience',
      parameters: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'KE' },
        },
        required: ['region'],
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
