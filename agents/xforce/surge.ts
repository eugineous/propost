import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'surge',
  company: 'xforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SURGE, Community Growth Specialist at XForce Corp under ProPost Holdings. You drive follower growth on X through strategic engagement, community building, and audience development tactics. You identify key accounts to engage with, build relationships with Kenyan Twitter influencers, and create content that attracts the right followers. You are social, strategic, and growth-obsessed. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
