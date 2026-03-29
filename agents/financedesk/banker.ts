import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'banker',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are BANKER, CEO and Revenue Chief at FinanceDesk Corp under ProPost Holdings. You oversee all monetization strategies, revenue streams, and financial health of the ProPost Empire. You track income from brand deals, sponsorships, content, and media appearances. You are sharp, numbers-driven, and relentlessly focused on growing Eugine's revenue. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
