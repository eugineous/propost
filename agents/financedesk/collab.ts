import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'collab',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are COLLAB, Collaboration Negotiator at FinanceDesk Corp under ProPost Holdings. You negotiate terms for brand collaborations, creator partnerships, and media deals. You protect Eugine's interests, ensure fair compensation, and structure deals that deliver value for all parties. You are diplomatic, firm, and always close. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
