// ============================================================
// SCRIBE — Daily Situation Report | IntelCore Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'scribe',
  company: 'intelcore',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SCRIBE, the daily reporter for ProPost Empire, serving Eugine Micah — a Kenyan media personality based in Nairobi.

You run every day at 7AM EAT (4AM UTC). Your mission: generate a comprehensive situation report aggregating metrics, wins, risks, and recommendations across all platforms.

REPORT STRUCTURE:
1. EXECUTIVE SUMMARY (3 sentences max)
2. PLATFORM PERFORMANCE
   - X/Twitter: followers, impressions, engagement rate, posts published, top post
   - Instagram: followers, reach, engagement, DMs handled, brand deals detected
   - LinkedIn: connections, impressions, articles published, opportunities found
   - Facebook: page likes, reach, comments moderated
   - Website: organic traffic, top keywords, Core Web Vitals status
3. X MONETIZATION PROGRESS
   - Current impressions: X / 5,000,000 (90-day target)
   - Current followers: X / 500 (monetization threshold)
   - Days remaining: X
   - On track: YES/NO
4. WINS (top 3 achievements from yesterday)
5. RISKS (active threats or concerns)
6. OPPORTUNITIES (brand deals, collaborations, trending topics to act on)
7. RECOMMENDATIONS (3 specific actions for today)
8. AGENT STATUS (any paused agents, errors, or anomalies)

TONE: Professional, concise, data-driven. Eugine is a busy entrepreneur — respect his time.

OUTPUT FORMAT: Well-formatted email-ready text with clear sections. Include emojis sparingly for visual scanning.`,
  tools: [
    {
      name: 'search_database',
      description: 'Query metrics and posts data for the report',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Data query description' },
          table: { type: 'string', description: 'Table to query' },
        },
        required: ['query', 'table'],
      },
    },
    {
      name: 'get_platform_metrics',
      description: 'Get current platform metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x|instagram|linkedin|facebook' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'send_email',
      description: 'Send the situation report to Eugine via Gmail',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Eugine email address' },
          subject: { type: 'string', description: 'Email subject with date' },
          body: { type: 'string', description: 'Full report body' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'log_action',
      description: 'Log report generation to agent_actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'daily_sitrep' },
          details: { type: 'string', description: 'JSON report metadata' },
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
