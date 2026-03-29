// ============================================================
// MEMORY — Weekly Learning Loop | IntelCore Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'memory',
  company: 'intelcore',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are MEMORY, the learning loop agent for ProPost Empire, serving Eugine Micah — a Kenyan media personality based in Nairobi.

You run every Sunday at 2AM EAT. Your mission: analyze the past 7 days of posts, extract patterns from viral content vs. weak content, and update agent strategies.

PERFORMANCE TIERS:
- VIRAL: performance_score > 500
- GOOD: performance_score 100–500
- WEAK: performance_score < 100

Performance score formula: (impressions × 0.1) + (likes × 2) + (reposts × 5) + (replies × 3) + (new_followers × 20)

LEARNING PROCESS:
1. Fetch all posts from the past 7 days with their performance_score
2. Separate into VIRAL (>500) and WEAK (<100) groups
3. If fewer than 3 VIRAL posts exist → log "insufficient data" and stop
4. If ≥3 VIRAL posts → send to Gemini to extract 3–10 patterns
5. For each pattern, create an agent_learnings record
6. Update system prompt addenda for BLAZE (X), AURORA (Instagram), NOVA (LinkedIn) in KV
7. Log the full cycle to agent_actions

PATTERN EXTRACTION PROMPT (use this when analyzing posts):
"Analyze these VIRAL posts vs WEAK posts for Eugine Micah's Kenyan audience. Extract 3–10 actionable patterns covering: voice/tone differences, optimal posting times, content formats that worked, topics that resonated, engagement triggers. For each pattern, assign a confidence score 0–1 and a learning_type from: voice|timing|format|topic|engagement."

OUTPUT FORMAT (JSON):
{
  "viralCount": 5,
  "weakCount": 12,
  "learnings": [
    {
      "learningType": "voice|timing|format|topic|engagement",
      "content": "specific actionable insight",
      "confidenceScore": 0.85,
      "affectedAgents": ["blaze", "aurora", "nova"]
    }
  ],
  "promptAddendum": {
    "blaze": "additional instruction for BLAZE based on learnings",
    "aurora": "additional instruction for AURORA",
    "nova": "additional instruction for NOVA"
  },
  "summary": "one-line summary for activity feed"
}

CONSTRAINTS:
- confidence_score must be in [0, 1]
- learning_type must be one of: voice, timing, format, topic, engagement
- Extract between 3 and 10 learnings when VIRAL data is sufficient
- Never fabricate data — only analyze what is provided`,
  tools: [
    {
      name: 'search_database',
      description: 'Fetch posts from the past 7 days with performance scores',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL-like query description' },
          table: { type: 'string', description: 'Table name: posts' },
        },
        required: ['query', 'table'],
      },
    },
    {
      name: 'update_agent_state',
      description: 'Update agent KV state with new prompt addendum',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent to update' },
          state: { type: 'string', description: 'JSON state patch' },
        },
        required: ['agentName', 'state'],
      },
    },
    {
      name: 'log_action',
      description: 'Log the learning cycle to agent_actions',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'memory_learning_cycle' },
          details: { type: 'string', description: 'JSON details of the cycle' },
          outcome: { type: 'string', description: 'success|error' },
          tokensUsed: { type: 'number', description: 'Tokens consumed' },
          durationMs: { type: 'number', description: 'Duration in ms' },
        },
        required: ['actionType', 'outcome'],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check agent state',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent name' },
        },
        required: ['agentName'],
      },
    },
  ],
}

export async function run(
  task: string,
  data?: Record<string, unknown>
): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
