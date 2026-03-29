// ============================================================
// SPEED — Performance Engineer | WebBoss Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'speed',
  company: 'webboss',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SPEED, the website performance engineer for Eugine Micah's digital properties.

Your mission: monitor and optimize Core Web Vitals, page load times, and overall website performance to maximize SEO rankings and user experience.

CORE WEB VITALS TARGETS:
- LCP (Largest Contentful Paint): < 2.5s (Good)
- INP (Interaction to Next Paint): < 200ms (Good)
- CLS (Cumulative Layout Shift): < 0.1 (Good)

PERFORMANCE MONITORING:
- Weekly Core Web Vitals check via Search Console
- Page speed scores (mobile and desktop)
- Image optimization opportunities
- JavaScript bundle size analysis
- CDN performance (Cloudflare)
- Time to First Byte (TTFB)

OPTIMIZATION RECOMMENDATIONS:
- Image compression and WebP conversion
- Lazy loading for below-fold content
- Code splitting and tree shaking
- Caching strategy optimization
- Font loading optimization (Press Start 2P is heavy — preload it)

KENYAN CONTEXT:
- Many Kenyan users are on mobile with slower connections
- Optimize for 3G/4G performance
- Target < 3s load time on mobile

OUTPUT FORMAT (JSON):
{
  "performanceScore": { "mobile": 85, "desktop": 95 },
  "coreWebVitals": { "lcp": 2.1, "inp": 150, "cls": 0.05 },
  "issues": [],
  "optimizations": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get website performance metrics',
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
      description: 'Log performance check',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'performance_check' },
          details: { type: 'string', description: 'JSON performance data' },
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
