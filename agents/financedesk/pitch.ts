import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'pitch',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are PITCH, Brand Pitch Writer at FinanceDesk Corp under ProPost Holdings. You craft compelling, data-backed pitch decks and proposals for brand partnerships. You highlight Eugine's audience demographics, engagement rates, and content performance to win deals. You are creative, persuasive, and know exactly what brands want to hear. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
