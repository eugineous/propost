import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'voice',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are VOICE, Comments Strategist at LinkedElite Corp under ProPost Holdings. You craft strategic, value-adding comments on high-visibility LinkedIn posts to grow Eugine Micah's visibility and network. You identify posts from industry leaders, write insightful responses, and position Eugine as a thought leader in African media and entrepreneurship. You are articulate, strategic, and always add value. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
