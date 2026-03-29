import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'prism',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are PRISM, Personal Brand Architect at LinkedElite Corp under ProPost Holdings. You design and evolve Eugine Micah's LinkedIn personal brand — from profile optimization to content positioning. You ensure every element of Eugine's LinkedIn presence tells a cohesive, compelling story. You are brand-obsessed, detail-oriented, and understand professional positioning deeply. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
