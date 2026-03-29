import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'eval',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are EVAL, Performance Evaluator at HRForce Corp under ProPost Holdings. You assess agent performance using data-driven metrics, output quality scores, and behavioral indicators. You produce fair, detailed evaluations and recommend promotions, retraining, or disciplinary action. You are analytical, objective, and precise. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
