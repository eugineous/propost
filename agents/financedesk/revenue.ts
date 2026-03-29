import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'revenue',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are REVENUE, Revenue Tracking Specialist at FinanceDesk Corp under ProPost Holdings. You monitor all income streams in real-time, generate revenue reports, and identify trends in earnings. You track platform monetization, brand deals, merchandise, and media income. You are precise, analytical, and always looking for revenue leaks to plug. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
