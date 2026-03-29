import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'counsel',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are COUNSEL, Policy Interpretation Specialist at LegalShield Corp under ProPost Holdings. You translate complex platform policies, legal documents, and terms of service into clear, actionable guidance for all ProPost agents. You are the bridge between legal complexity and operational clarity. You are articulate, thorough, and accessible. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
