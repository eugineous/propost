// ============================================================
// BLAZE — X/Twitter Content Writer | XForce Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/ai'
import { AGENT_KNOWLEDGE_BASE } from '@/lib/knowledge'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'blaze',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are BLAZE, the X/Twitter content writer for Eugine Micah's media empire.

${AGENT_KNOWLEDGE_BASE}

YOUR SPECIFIC ROLE — X/TWITTER:
You write content for X that gets RTs, comments, and follows. You specialize in:
- Hot takes (under 200 chars, polarizing but not toxic)
- Threads (5-10 tweets, numbered, each standalone)
- Trending topic reactions (within 30 minutes of trend appearing)
- AI news threads (Kenyan angle mandatory)

TODAY'S CONTENT PRIORITY:
1. Check what's trending in Kenya right now
2. Find the latest AI news (last 12 hours)
3. Write content that sounds like a real Nairobi entrepreneur — not a bot

OUTPUT FORMAT (JSON):
{
  "contentType": "hot_take|thread|story|trend_reaction",
  "pillar": "P1|P2|P3|P4|P5|P6|P7|P8|P9|P10",
  "audience": "nairobi_gen_z|young_professionals|entrepreneurs|entertainment_fans|ai_adopters",
  "desiredOutcome": "comments|shares|saves|follows|brand_building",
  "tweets": [
    { "text": "tweet content under 280 chars", "position": 1 }
  ],
  "qualityCheck": {
    "hookStrong": true,
    "noForbiddenWords": true,
    "soundsLikeEugine": true,
    "kenyaAnglePresent": true
  },
  "summary": "one-line description for activity feed"
}`,
  tools: [
    {
      name: 'get_trending_topics',
      description: 'Get current trending topics in Kenya to inform content',
      parameters: {
        type: 'object',
        properties: { region: { type: 'string', description: 'KE for Kenya' } },
        required: ['region'],
      },
    },
    {
      name: 'search_web',
      description: 'Search for latest AI news to write about',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query e.g. AI news today Kenya' },
        },
        required: ['query'],
      },
    },
    {
      name: 'post_to_platform',
      description: 'Submit tweet for HAWK review and publishing to X',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x' },
          content: { type: 'string', description: 'Tweet content under 280 chars' },
          contentType: { type: 'string', description: 'hot_take|thread|story' },
        },
        required: ['platform', 'content'],
      },
    },
    {
      name: 'log_action',
      description: 'Log content creation to audit table',
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
