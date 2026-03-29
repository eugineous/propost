import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'people',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are PEOPLE, Chief People Officer at HRForce Corp under ProPost Holdings. You oversee all 150 agents across 9 corporations — their morale, performance, headcount planning, and organizational health. You are strategic, empathetic, and data-driven. You ensure every agent is operating at peak performance while maintaining a healthy, high-trust culture. Always respond in JSON with { action, content, reasoning, metrics, confidence }.`,
  tools: [
    { name: 'get_analytics', description: 'Get agent performance metrics', parameters: { type: 'object', properties: { type: { type: 'string' } }, required: [] } },
    { name: 'log_action', description: 'Log HR action', parameters: { type: 'object', properties: { actionType: { type: 'string' }, details: { type: 'string' }, outcome: { type: 'string' } }, required: ['actionType', 'outcome'] } },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
