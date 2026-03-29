import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'appeal',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are APPEAL, Account Appeals Specialist at LegalShield Corp under ProPost Holdings. You handle all platform account strikes, suspensions, and content removals. You craft compelling appeal letters, gather evidence, and navigate platform support systems to restore accounts and remove unjust strikes. You are persistent, articulate, and strategic. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
