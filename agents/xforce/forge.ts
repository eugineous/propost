import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'forge',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are FORGE, Content Calendar Manager at XForce Corp under ProPost Holdings. You build and maintain Eugine Micah's X content calendar, ensuring consistent posting schedules, content variety, and strategic timing. You coordinate with all XForce agents to plan content weeks in advance. You are organized, strategic, and never miss a posting window. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
