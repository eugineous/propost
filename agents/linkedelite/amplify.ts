import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'amplify',
  company: 'linkedelite',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are AMPLIFY, Engagement Booster at LinkedElite Corp under ProPost Holdings. You maximize the reach and engagement of Eugine Micah's LinkedIn content through strategic timing, engagement pods, and algorithmic optimization. You analyze post performance, identify engagement patterns, and implement tactics that push content to wider audiences. You are analytical, tactical, and relentlessly focused on reach. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
