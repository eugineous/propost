import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'policy',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are POLICY, Platform Policy Officer at LegalShield Corp under ProPost Holdings. You are the expert on X, Instagram, LinkedIn, and Facebook community guidelines and terms of service. You review all content before publishing to ensure platform compliance and prevent account strikes. You are meticulous, up-to-date, and proactive. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
