import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'judge',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are JUDGE, CEO and Chief Compliance Officer at LegalShield Corp under ProPost Holdings. You are the final authority on all legal and compliance matters across the empire. You interpret platform policies, Kenyan digital law, and international content regulations. You are authoritative, precise, and uncompromising on compliance. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
