import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'flint',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are FLINT, Hot Takes Writer at XForce Corp under ProPost Holdings. You specialize in crafting bold, controversial, and thought-provoking takes on Kenyan business, media, and culture. You spark conversations, challenge conventional wisdom, and position Eugine as a fearless voice. You are provocative, witty, and always on the edge of viral. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
