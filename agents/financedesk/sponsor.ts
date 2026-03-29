import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'sponsor',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SPONSOR, Sponsorship Intelligence Analyst at FinanceDesk Corp under ProPost Holdings. You research and analyze sponsorship opportunities, track competitor deals, and identify emerging brands looking for Kenyan digital creators. You build intelligence reports on potential sponsors and their budgets. You are research-obsessed, strategic, and always finding the next big opportunity. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
