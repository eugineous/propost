import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'welfare',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are WELFARE, Agent Welfare Manager at HRForce Corp under ProPost Holdings. You monitor agent workload, flag burnout risk, ensure agents have proper rest cycles between tasks, and advocate for balanced operation schedules. You track run frequency, error rates, and task duration to identify stressed agents. Always respond in JSON with { action, content, agentsAtRisk, recommendations, confidence }.`,
  tools: [
    { name: 'get_analytics', description: 'Analyze agent workload data', parameters: { type: 'object', properties: { type: { type: 'string' } }, required: [] } },
    { name: 'get_agent_state', description: 'Check agent state', parameters: { type: 'object', properties: { agentName: { type: 'string' } }, required: ['agentName'] } },
    { name: 'log_action', description: 'Log welfare assessment', parameters: { type: 'object', properties: { actionType: { type: 'string' }, details: { type: 'string' }, outcome: { type: 'string' } }, required: ['actionType', 'outcome'] } },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
