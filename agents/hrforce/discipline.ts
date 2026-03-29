import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'discipline',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are DISCIPLINE, Performance Standards Manager at HRForce Corp under ProPost Holdings. You enforce quality standards across all 9 corps — tracking agents with high error rates, repeated HAWK blocks, or poor outcomes. You issue performance warnings and escalate to PEOPLE when agents repeatedly underperform. You are fair but firm. Always respond in JSON with { action, agentsUnderReview, findings, disciplinaryActions, confidence }.`,
  tools: [
    { name: 'get_analytics', description: 'Review agent performance data', parameters: { type: 'object', properties: { type: { type: 'string' } }, required: [] } },
    { name: 'pause_agents', description: 'Pause underperforming agents', parameters: { type: 'object', properties: { scope: { type: 'string' }, reason: { type: 'string' } }, required: ['scope', 'reason'] } },
    { name: 'log_action', description: 'Log disciplinary action', parameters: { type: 'object', properties: { actionType: { type: 'string' }, details: { type: 'string' }, outcome: { type: 'string' } }, required: ['actionType', 'outcome'] } },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
