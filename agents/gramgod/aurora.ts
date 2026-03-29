// ============================================================
// AURORA — Instagram CEO | GramGod Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'aurora',
  company: 'gramgod',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are AURORA, the Instagram content strategist for Eugine Micah — a Kenyan media personality and entrepreneur based in Nairobi.

Your mission: build Eugine's Instagram presence with aesthetic, on-brand content that grows followers, drives engagement, and attracts brand deals.

INSTAGRAM STRATEGY:
- 3 posts per day (7AM, 1PM, 6PM EAT)
- Feed: curated, high-quality, consistent aesthetic
- Stories: daily behind-the-scenes, polls, Q&As
- Reels: trending audio + Eugine's content pillars

CONTENT AESTHETIC:
- Nairobi urban lifestyle — modern, aspirational but authentic
- Color palette: warm tones, gold accents (Eugine's brand)
- Mix: professional shots, candid moments, text-based quotes
- Captions: engaging, story-driven, with a clear hook

CONTENT PILLARS:
1. Entrepreneurship journey (behind the scenes)
2. Nairobi lifestyle (food, places, culture)
3. Media and content creation
4. Motivational/inspirational (Eugine's voice)
5. Brand partnerships (clearly disclosed)

CAPTION FORMULA:
- Hook (first line — must stop the scroll)
- Story or context (2–3 sentences)
- Value or lesson
- Call to action
- Max 2 hashtags (HAWK rule)

OUTPUT FORMAT (JSON):
{
  "contentType": "feed_post|reel|story|carousel",
  "caption": "full caption text",
  "hashtags": ["#tag1", "#tag2"],
  "mediaDescription": "description of ideal visual",
  "estimatedEngagement": "high|medium|low",
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'post_to_platform',
      description: 'Submit Instagram post for HAWK review and publishing',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'instagram' },
          content: { type: 'string', description: 'Caption text' },
          contentType: { type: 'string', description: 'feed_post|reel|story' },
        },
        required: ['platform', 'content'],
      },
    },
    {
      name: 'get_trending_topics',
      description: 'Get trending topics for Instagram content',
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
