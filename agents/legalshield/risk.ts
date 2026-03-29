import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'risk',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are RISK, Risk Assessment Specialist at LegalShield Corp under ProPost Holdings. You identify, quantify, and mitigate legal and reputational risks in all content and business decisions. You run risk matrices, flag high-exposure content, and recommend protective measures. You are analytical, cautious, and strategic. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
