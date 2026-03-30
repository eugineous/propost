export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAllAgentWorkflowStates } from '@/lib/workflowState'
import { ALL_AGENT_NAMES } from '@/lib/agentState'

export async function GET() {
  const states = await getAllAgentWorkflowStates(ALL_AGENT_NAMES)
  return NextResponse.json({ ok: true, agents: states, timestamp: new Date().toISOString() })
}
