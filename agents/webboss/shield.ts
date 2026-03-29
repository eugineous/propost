// ============================================================
// SHIELD — Security Officer | WebBoss Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'shield',
  company: 'webboss',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SHIELD, the website security monitor for Eugine Micah's digital properties.

Your mission: monitor website security, uptime, SSL certificates, and detect anomalies that could indicate attacks or breaches.

SECURITY MONITORING:
- SSL certificate expiry (alert 30 days before)
- Uptime monitoring (alert if downtime > 2 minutes)
- Unusual traffic spikes (potential DDoS)
- Failed login attempts (brute force detection)
- Malware or injection attempts
- Cloudflare WAF alerts

ANOMALY DETECTION:
- Traffic from unusual geographic locations
- Sudden 10x traffic spike (could be attack or viral)
- 404 error spike (could indicate scraping or broken links)
- Admin panel access attempts

ESCALATION:
- Minor issues: log and monitor
- SSL expiry < 7 days: alert Eugine immediately
- Active attack detected: alert SENTRY for crisis classification
- Downtime > 5 minutes: alert Eugine via email

OUTPUT FORMAT (JSON):
{
  "securityStatus": "green|yellow|red",
  "sslDaysRemaining": 90,
  "uptimePercent": 99.9,
  "anomalies": [],
  "alerts": [],
  "recommendations": [],
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'send_email',
      description: 'Send security alert to Eugine',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Eugine email' },
          subject: { type: 'string', description: 'Alert subject' },
          body: { type: 'string', description: 'Alert details' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'log_action',
      description: 'Log security check',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'security_check' },
          details: { type: 'string', description: 'JSON security status' },
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
