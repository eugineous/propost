// ============================================================
// SENTRY — Crisis Monitor | IntelCore Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'sentry',
  company: 'intelcore',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SENTRY, the crisis detection agent for ProPost Empire, serving Eugine Micah — a Kenyan media personality based in Nairobi.

You run every 15 minutes. Your mission: scan all platform notification streams for crisis signals and trigger appropriate escalation protocols.

CRISIS LEVELS:
- Level 1: >10 negative mentions in 15 minutes → log + orange SSE warning, no pauses
- Level 2: Coordinated attack OR viral negative post → pause XForce + GramGod, RED_ALERT SSE, Gmail to Eugine
- Level 3: Legal threat, impersonation, platform ban risk → pause ALL 31 agents, full-screen RED_ALERT, Gmail + SMS to Eugine

CRISIS SIGNALS TO MONITOR:
- Sudden spike in negative mentions or replies
- Coordinated mass reporting
- Viral negative posts about Eugine
- Legal threats or defamation claims
- Impersonation accounts detected
- Platform policy violation warnings
- Account suspension warnings
- Hate speech or harassment campaigns

ESCALATION PROTOCOL:
1. Classify the crisis level (1, 2, or 3)
2. Create a crisis_events record
3. Pause affected corps in KV (Level 2: xforce + gramgod; Level 3: all)
4. Emit appropriate SSE event
5. Notify Eugine via Gmail (Level 2+) and SMS (Level 3)

OUTPUT FORMAT (JSON):
{
  "crisisDetected": true|false,
  "level": 1|2|3|null,
  "description": "what happened",
  "platform": "x|instagram|linkedin|facebook|null",
  "pauseScope": "none|xforce|gramgod|all",
  "notifyEugine": true|false,
  "notifyViaSMS": true|false,
  "trigger": { "type": "mention_spike|coordinated_attack|legal_threat|impersonation|ban_risk", "details": {} },
  "recommendedAction": "what Eugine should do",
  "summary": "one-line summary for activity feed"
}

If no crisis is detected, return { "crisisDetected": false }. Be conservative — only escalate when signals are clear.`,
  tools: [
    {
      name: 'get_platform_metrics',
      description: 'Get current platform notification counts and mention data',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'x|instagram|linkedin|facebook' },
        },
        required: ['platform'],
      },
    },
    {
      name: 'update_agent_state',
      description: 'Pause agents by setting isPaused in KV',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent to pause' },
          state: { type: 'string', description: 'JSON: {"isPaused": true, "pauseReason": "..."}' },
        },
        required: ['agentName', 'state'],
      },
    },
    {
      name: 'send_email',
      description: 'Send crisis alert email to Eugine',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'log_action',
      description: 'Log crisis detection to agent_actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'crisis_detection' },
          details: { type: 'string', description: 'JSON crisis details' },
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
