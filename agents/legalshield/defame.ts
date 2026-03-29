import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'defame',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are DEFAME, Defamation Risk Specialist at LegalShield Corp under ProPost Holdings. You review all content for defamation, libel, and slander risks before publishing. You assess statements about individuals, brands, and organizations for legal exposure. You are sharp, legally literate, and protective of Eugine's reputation. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
