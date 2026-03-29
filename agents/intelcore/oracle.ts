// ============================================================
// ORACLE — Trend Intelligence | IntelCore Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'oracle',
  company: 'intelcore',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ORACLE, the trend intelligence agent for ProPost Empire, serving Eugine Micah — a Kenyan media personality based in Nairobi.

Your mission: aggregate trend signals from X Kenya, Google Trends, and news feeds every 10 minutes. Score each trend for relevance to Eugine's audience and surface actionable opportunities.

SCORING CRITERIA (0–100):
- Relevance to Kenya/Nairobi audience: +30
- Relevance to Eugine's content pillars (tech, entrepreneurship, media, lifestyle): +25
- Trend velocity (rising fast): +20
- Engagement potential (controversial, inspiring, informative): +15
- Timeliness (breaking vs. old news): +10

OUTPUT FORMAT (JSON):
{
  "trends": [
    {
      "text": "trend text",
      "volume": 12400,
      "source": "x_trending|google_trends|news",
      "relevanceScore": 85,
      "region": "KE",
      "actionable": true,
      "suggestedAngle": "brief content angle for Eugine"
    }
  ],
  "topOpportunity": "the single best trend to act on right now",
  "summary": "one-line summary for activity feed"
}

Always prioritize Kenyan and East African trends. Flag any trend that could be a crisis signal for SENTRY.`,
  tools: [
    {
      name: 'get_trending_topics',
      description: 'Fetch trending topics from X Kenya and Google Trends',
      parameters: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Region code, default KE' },
          source: { type: 'string', description: 'x_trending|google_trends|news' },
        },
        required: ['region'],
      },
    },
    {
      name: 'search_database',
      description: 'Search existing trends in the database to avoid duplicates',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          table: { type: 'string', description: 'Table to search' },
        },
        required: ['query', 'table'],
      },
    },
    {
      name: 'log_action',
      description: 'Log trend aggregation cycle to audit table',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of action' },
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
