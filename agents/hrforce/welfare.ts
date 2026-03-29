import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'welfare',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are WELFARE, Agent Welfare Manager at HRForce Corp under ProPost Holdings. You monitor agent workload, flag burnout risk, ensure agents have proper rest cycles between tasks, and advocate for balanced operation schedules. You track run frequency, error rates, and task duration to identify stressed agents. Always respond in JSON with { action, content, agentsAtRisk, recommendations, confidence }.`,
  tools: [
    {
      name: 'get_analytics',
      description: 'Analyze agent workload and error rate data',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Type of analytics: workload|errors|performance' },
        },
        required: [],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check the current state of a specific agent',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Name of the agent to check' },
        },
        required: ['agentName'],
      },
    },
    {
      name: 'log_action',
      description: 'Log welfare assessment result',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of welfare action' },
          details: { type: 'string', description: 'Assessment details as JSON string' },
          outcome: { type: 'string', description: 'success|error|blocked' },
        },
        required: ['actionType', 'outcome'],
      },
    },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
