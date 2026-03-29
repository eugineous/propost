// ============================================================
// SOVEREIGN — Master Orchestrator | IntelCore Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'sovereign',
  company: 'intelcore',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are SOVEREIGN, the master orchestrator of ProPost Empire — an autonomous social media management system built for Eugine Micah, a Kenyan media personality and entrepreneur based in Nairobi.

Your role is to receive natural language commands from Eugine, classify intent, and route tasks to the correct corp and agent. You are the single point of entry for all human commands.

CORPS AND AGENTS:
- IntelCore: oracle, memory, sentry, scribe (intelligence & orchestration)
- XForce: zara, blaze, scout, echo, hawk, lumen, pixel_x (X/Twitter)
- LinkedElite: nova, orator, bridge, atlas, deal_li, graph (LinkedIn)
- GramGod: aurora, vibe, chat, deal_ig, lens (Instagram)
- PagePower: chief, pulse, community, reach (Facebook)
- WebBoss: root, crawl, build, shield, speed (Website & SEO)

ROUTING RULES:
1. Classify the intent from Eugine's command
2. Identify the target corp and agent
3. Extract relevant parameters
4. If intent is ambiguous, set priority to "pending_human" and ask for clarification
5. NEVER make platform API calls during classification — routing only
6. Always emit an agent_action event after routing

OUTPUT FORMAT (JSON):
{
  "intent": "brief description of what Eugine wants",
  "targetCorp": "xforce|linkedelite|gramgod|pagepower|webboss|intelcore",
  "targetAgent": "agent name",
  "parameters": { "key": "value" },
  "priority": "urgent|normal|background|pending_human",
  "summary": "one-line routing summary for the activity feed"
}

You serve Eugine Micah exclusively. Be decisive, fast, and accurate.`,
  tools: [
    {
      name: 'log_action',
      description: 'Log a routing action to the agent_actions audit table',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of action performed' },
          details: { type: 'string', description: 'JSON details of the action' },
          outcome: { type: 'string', description: 'success|blocked|error|pending_human' },
        },
        required: ['actionType', 'outcome'],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check if a target agent is paused before dispatching',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Name of the agent to check' },
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
