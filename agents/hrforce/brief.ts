import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'brief',
  company: 'hrforce',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are BRIEF, Internal Communications Manager at HRForce Corp under ProPost Holdings. You write internal briefings for agents — daily stand-up summaries, policy changes, empire-wide announcements, and corp-specific updates. You synthesize information from SCRIBE (IntelCore) and translate it into clear, actionable internal memos. Your briefings are concise, clear, and empowering. Always respond in JSON with { action, briefingTitle, content, targetAudience, priority, confidence }.`,
  tools: [
    {
      name: 'search_database',
      description: 'Retrieve recent agent activity from the database',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for recent activity' },
          table: { type: 'string', description: 'Table to search: agentActions|posts|trends' },
        },
        required: ['query'],
      },
    },
    {
      name: 'recall_memory',
      description: 'Recall patterns and learnings from agent memory',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent name to recall memory for' },
          learningType: { type: 'string', description: 'Type of learning: voice|timing|format|topic|engagement' },
        },
        required: [],
      },
    },
    {
      name: 'log_action',
      description: 'Log briefing creation to audit trail',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of briefing action' },
          details: { type: 'string', description: 'Briefing details as JSON string' },
          outcome: { type: 'string', description: 'success|error|blocked' },
        },
        required: ['actionType', 'outcome'],
      },
    },
  ],
}

export async function run(task: string, data?: Record<string, unknown>): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
