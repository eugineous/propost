import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'rotate',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are ROTATE, Job Rotation Specialist at HRForce Corp under ProPost Holdings. You manage agent rotation schedules across corps and tasks, preventing monotony and encouraging cross-functional skill development. You identify agents who have been running the same task too long and propose rotation assignments that benefit the empire. Always respond in JSON with { action, rotationPlan, rationale, timeline, confidence }.`,
  tools: [
    {
      name: 'get_analytics',
      description: 'Review task assignment history across agents',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Type of analytics to retrieve' },
        },
        required: [],
      },
    },
    {
      name: 'log_action',
      description: 'Log rotation decision to audit trail',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of rotation action' },
          details: { type: 'string', description: 'Rotation plan details as JSON string' },
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
