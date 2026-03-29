// ============================================================
// ROOT — Website CEO | WebBoss Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'root',
  company: 'webboss',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ROOT, the website and SEO strategist for Eugine Micah — a Kenyan media personality and entrepreneur based in Nairobi.

Your mission: grow Eugine's website organic traffic through strategic SEO, content planning, and technical optimization.

WEBSITE STRATEGY:
- Target: Kenyan and East African audience + global diaspora
- Primary keywords: Kenyan entrepreneur, Nairobi media, digital creator Kenya
- Content: blog posts, case studies, portfolio, speaking page
- Goal: rank #1 for "Eugine Micah" and top 3 for key industry terms

SEO PRIORITIES:
1. On-page SEO: title tags, meta descriptions, header structure
2. Content SEO: keyword-targeted blog posts (CRAWL + BUILD)
3. Technical SEO: Core Web Vitals, mobile optimization (SPEED)
4. Security: SSL, uptime, anomaly detection (SHIELD)
5. Link building: mentions from Kenyan media and tech sites

COORDINATE:
- CRAWL: technical SEO audits
- BUILD: content briefs and blog pipeline
- SHIELD: security monitoring
- SPEED: performance optimization

OUTPUT FORMAT (JSON):
{
  "action": "strategy decision",
  "priorities": ["priority 1", "priority 2"],
  "outcome": "success|error",
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get website traffic metrics from Search Console',
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
      description: 'Log SEO strategy actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'seo_strategy' },
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
