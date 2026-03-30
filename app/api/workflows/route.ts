export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { workflowDefinitions, workflowExecutions } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { assignWorkflow, WorkflowDefinition } from '@/lib/workflowEngine'
import { ALL_AGENT_NAMES } from '@/lib/agentState'

export async function GET() {
  const defs = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.isActive, true))
  const execs = await db.select().from(workflowExecutions)
  const execMap = Object.fromEntries(execs.map((e: typeof workflowExecutions.$inferSelect) => [e.agentName, e]))

  return NextResponse.json({
    ok: true,
    workflows: defs.map((d: typeof workflowDefinitions.$inferSelect) => ({
      ...d,
      execution: execMap[d.agentName] ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { agentName?: string; definition?: WorkflowDefinition }

  if (!body.agentName || !ALL_AGENT_NAMES.includes(body.agentName)) {
    return NextResponse.json({ error: 'Invalid or unknown agentName' }, { status: 400 })
  }
  if (!body.definition?.phases?.length) {
    return NextResponse.json({ error: 'Workflow must have at least one phase' }, { status: 400 })
  }
  for (const phase of body.definition.phases) {
    if (!phase.steps?.length) {
      return NextResponse.json({ error: `Phase "${phase.name}" must have at least one step` }, { status: 400 })
    }
    for (const step of phase.steps) {
      if (!step.action?.trim()) {
        return NextResponse.json({ error: `Step "${step.name}" must have a non-empty action` }, { status: 400 })
      }
    }
  }

  // Force server-side createdBy
  const definition: WorkflowDefinition = { ...body.definition, agentName: body.agentName, createdBy: 'founder' }

  const workflowId = await assignWorkflow(body.agentName, definition)
  return NextResponse.json({ ok: true, workflowId })
}
