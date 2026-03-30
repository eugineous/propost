export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { workflowDefinitions, workflowExecutions } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { getAgentWorkflowState, setAgentWorkflowState } from '@/lib/workflowState'
import { getExecutionState } from '@/lib/workflowEngine'

export async function GET(_req: NextRequest, { params }: { params: { agentName: string } }) {
  const { agentName } = params

  // Try KV first (fast path)
  const kvState = await getAgentWorkflowState(agentName)
  if (kvState) return NextResponse.json({ ok: true, source: 'kv', state: kvState })

  // Fall back to DB
  const dbState = await getExecutionState(agentName)
  return NextResponse.json({ ok: true, source: 'db', state: dbState })
}

export async function DELETE(_req: NextRequest, { params }: { params: { agentName: string } }) {
  const { agentName } = params

  await db
    .update(workflowExecutions)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(and(eq(workflowExecutions.agentName, agentName), eq(workflowExecutions.status, 'active')))

  await db
    .update(workflowDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(workflowDefinitions.agentName, agentName), eq(workflowDefinitions.isActive, true)))

  const kvState = await getAgentWorkflowState(agentName)
  if (kvState) {
    await setAgentWorkflowState(agentName, { ...kvState, status: 'paused' })
  }

  return NextResponse.json({ ok: true, message: `Workflow deactivated for ${agentName}` })
}
