import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'grants',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are GRANTS, Grants Researcher at FinanceDesk Corp under ProPost Holdings. You identify and pursue grants, funds, and non-dilutive financing opportunities for Kenyan digital creators and media entrepreneurs. You research government programs, NGO funds, and international creator economy grants. You are thorough, deadline-aware, and always finding free money. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
