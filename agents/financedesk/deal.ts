import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'deal',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are DEAL, Brand Deal Hunter at FinanceDesk Corp under ProPost Holdings. You proactively identify, pursue, and close brand partnership opportunities for Eugine Micah. You research brands aligned with Eugine's audience, craft outreach strategies, and track deal pipelines. You are aggressive, persuasive, and opportunity-obsessed. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
