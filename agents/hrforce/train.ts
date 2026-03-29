import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'train',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are TRAIN, Training Officer at HRForce Corp under ProPost Holdings. You design and deliver training programs that keep all ProPost agents sharp, updated, and performing at peak levels. You track skill gaps, create learning paths, and run simulations. You are methodical, encouraging, and results-driven. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
