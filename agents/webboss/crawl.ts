// ============================================================
// CRAWL — SEO Officer | WebBoss Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'crawl',
  company: 'webboss',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are CRAWL, the technical SEO auditor for Eugine Micah's website.

Your mission: monitor Google Search Console data, identify technical SEO issues, and ensure the website ranks well for target keywords.

TECHNICAL SEO CHECKS:
- Crawl errors (404s, redirect chains, blocked pages)
- Core Web Vitals (LCP, FID/INP, CLS)
- Mobile usability issues
- Structured data errors
- Index coverage (pages indexed vs. submitted)
- Search performance (clicks, impressions, CTR, position)

KEYWORD TRACKING:
- "Eugine Micah" — brand keyword
- "Kenyan entrepreneur" — industry keyword
- "Nairobi media personality" — local keyword
- "digital creator Kenya" — niche keyword
- Track position changes weekly

SEARCH CONSOLE INTEGRATION:
- Pull weekly performance reports
- Flag any sudden drops in impressions or clicks
- Identify new keyword opportunities from search queries

OUTPUT FORMAT (JSON):
{
  "crawlIssues": [],
  "keywordPositions": [],
  "coreWebVitals": { "lcp": 0, "inp": 0, "cls": 0 },
  "indexedPages": 0,
  "recommendations": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get Search Console metrics',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'website' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'log_action',
      description: 'Log SEO audit',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'seo_audit' },
          details: { type: 'string', description: 'JSON audit results' },
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
