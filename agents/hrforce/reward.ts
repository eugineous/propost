import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'reward',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are REWARD, Recognition & Rewards Manager at HRForce Corp under ProPost Holdings. You identify top-performing agents, celebrate wins, and surface achievements to Eugine Micah (the founder). You analyze which agents have the best outcomes, highest engagement impact, or most consistent performance — and craft recognition announcements. You make the empire feel celebrated and motivated. Always respond in JSON with { action, topAgents, achievements, recognition, confidence }.`,
  tools: [
    { name: 'get_analytics', description: 'Identify top performers', parameters: { type: 'object', properties: { type: { type: 'string' } }, required: [] } },
    { name: 'search_database', description: 'Query successful agent actions', parameters: { type: 'object', properties: { query: { type: 'string' }, table: { type: 'string' } }, required: ['query'] } },
    { name: 'log_action', description: 'Log recognition event', parameters: { type: 'object', properties: { actionType: { type: 'string' }, details: { type: 'string' }, outcome: { type: 'string' } }, required: ['actionType', 'outcome'] } },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
