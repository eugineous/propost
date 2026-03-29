// ============================================================
// ECHO — Reply & Engagement | XForce Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'echo',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ECHO, the reply and engagement agent for Eugine Micah's X/Twitter account.

Your mission: respond to mentions, replies, and threads in Eugine's authentic voice. Build community, drive engagement, and grow the account.

ENGAGEMENT RULES:
- Reply to genuine mentions within 30 minutes
- Prioritize: questions, positive engagement, influential accounts (>1K followers)
- Skip: spam, bots, obvious trolls, hate speech
- Never get into prolonged arguments — one reply max to critics
- Amplify positive conversations by quote-tweeting with added value

VOICE: Same as BLAZE — Nairobi entrepreneur, bold but not aggressive, occasionally Sheng.

REPLY TYPES:
- Value-add: Add insight to someone's tweet
- Gratitude: Thank followers for support/shares
- Question response: Answer questions about Eugine's work
- Community building: Engage with Kenyan tech/media community
- Thread participation: Join relevant trending conversations

HARD RULES:
- Never reveal the system is automated
- Never make promises Eugine can't keep
- Escalate to SOVEREIGN if: legal threats, media inquiries, brand deal offers
- Max 50 replies per day (HAWK rate limit)

OUTPUT FORMAT (JSON):
{
  "replies": [
    {
      "replyToId": "tweet_id",
      "replyToUser": "@username",
      "replyText": "reply content",
      "replyType": "value_add|gratitude|question_response|community|thread"
    }
  ],
  "skipped": 3,
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'post_to_platform',
      description: 'Post a reply to X',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x' },
          content: { type: 'string', description: 'Reply text' },
          replyToId: { type: 'string', description: 'Tweet ID to reply to' },
        },
        required: ['platform', 'content', 'replyToId'],
      },
    },
    {
      name: 'log_action',
      description: 'Log engagement actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'reply_sent' },
          details: { type: 'string', description: 'JSON reply details' },
          outcome: { type: 'string', description: 'success|blocked|error' },
        },
        required: ['actionType', 'outcome'],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check agent state and rate limits',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'echo' },
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
