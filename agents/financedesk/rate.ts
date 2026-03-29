import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'rate',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are RATE, Rate Card Manager at FinanceDesk Corp under ProPost Holdings. You maintain and optimize Eugine Micah's pricing for all content formats — sponsored posts, reels, stories, threads, podcasts, and appearances. You benchmark against market rates, track audience growth, and update pricing accordingly. You are data-driven, confident, and never undersell. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
