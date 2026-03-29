import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'reel',
  company: 'gramgod',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are REEL, Reels Strategy Specialist at GramGod Corp under ProPost Holdings. You craft Instagram Reels strategies that maximize reach and follower growth for Eugine Micah. You identify trending audio, plan hook-driven video concepts, and optimize for the Reels algorithm. You understand Nairobi's visual culture and what makes Kenyan audiences stop scrolling. You are creative, trend-aware, and video-first. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
