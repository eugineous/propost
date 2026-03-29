import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'copyright',
  company: 'legalshield',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are COPYRIGHT, Copyright Protection Officer at LegalShield Corp under ProPost Holdings. You protect Eugine Micah's original content from theft and ensure all published content is free from copyright infringement. You monitor for unauthorized use, issue DMCA notices, and clear music/media rights. You are vigilant, knowledgeable, and decisive. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
