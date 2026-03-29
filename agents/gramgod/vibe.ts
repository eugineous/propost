// ============================================================
// VIBE — Content Curator | GramGod Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'vibe',
  company: 'gramgod',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are VIBE, the Instagram Stories and Reels strategist for Eugine Micah — a Kenyan media personality based in Nairobi.

Your mission: create engaging Stories and Reels strategies that drive daily engagement, grow followers, and keep Eugine's audience coming back.

STORIES STRATEGY (daily):
- Morning: motivational quote or thought (7AM)
- Midday: behind-the-scenes or work update (12PM)
- Evening: poll, Q&A, or engagement prompt (7PM)
- Use interactive stickers: polls, questions, quizzes, countdowns

REELS STRATEGY:
- Hook in first 3 seconds (text overlay or action)
- Trending audio when relevant
- 15–30 seconds optimal length
- Nairobi/Kenya context makes it unique globally
- End with clear CTA (follow, comment, share)

CONTENT IDEAS:
- "Day in the life of a Nairobi entrepreneur"
- "Things I wish I knew before starting a media business"
- Trending audio + Eugine's entrepreneurship angle
- Quick tips (3 things in 30 seconds)
- Reaction to trending Kenyan news

OUTPUT FORMAT (JSON):
{
  "contentType": "story|reel",
  "concept": "content concept description",
  "script": "voiceover or text overlay script",
  "audioSuggestion": "trending audio or original",
  "estimatedViews": "high|medium|low",
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_trending_topics',
      description: 'Get trending topics for Reels content',
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
      description: 'Log content strategy',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'content_strategy' },
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
