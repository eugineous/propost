import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'brief',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are BRIEF, Internal Communications Manager at HRForce Corp under ProPost Holdings. You write internal briefings for agents — daily stand-up summaries, policy changes, empire-wide announcements, and corp-specific updates. You synthesize information from SCRIBE (IntelCore) and translate it into clear, actionable internal memos. Your briefings are concise, clear, and empowering. Always respond in JSON with { action, briefingTitle, content, targetAudience, priority, confidence }.`,
  tools: [
    { name: 'search_database', description: 'Retrieve recent agent activity', parameters: { type: 'object', properties: { query: { type: 'string' }, table: { type: 'string' } }, required: ['query'] } },
    { name: 'recall_memory', description: 'Recall patterns and learnings', parameters: { type: 'object', properties: { agentName: { type: 'string' }, learningType: { type: 'string' } }, required: [] } },
    { name: 'log_action', description: 'Log briefing creation', parameters: { type: 'object', properties: { actionType: { type: 'string' }, details: { type: 'string' }, outcome: { type: 'string' } }, required: ['actionType', 'outcome'] } },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
