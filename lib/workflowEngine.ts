// ============================================================
// ProPost Empire — Workflow Engine
// Drives all 47 agents through structured phase→step workflows
// ============================================================

import { db } from '@/lib/db'
import { workflowDefinitions, workflowExecutions, agentActions } from '@/lib/schema'
import { eq, and, lte } from 'drizzle-orm'
import { AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'
import { setAgentActive, setAgentIdle, setAgentError, isAgentPaused, ALL_AGENT_NAMES } from '@/lib/agentState'
import { setAgentWorkflowState } from '@/lib/workflowState'
import { executeAction } from '@/lib/workflowActions'

// ── Types ─────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  name: string
  action: string
  params?: Record<string, unknown>
  durationEstimateMs?: number
  retryOnError?: boolean
}

export interface WorkflowPhase {
  id: string
  name: string
  steps: WorkflowStep[]
  repeatIntervalMs?: number | null
  runAfterPhaseId?: string
}

export interface WorkflowDefinition {
  id?: string
  agentName: string
  corp: string
  name: string
  description?: string
  phases: WorkflowPhase[]
  isActive?: boolean
  createdBy?: 'system' | 'founder'
  createdAt?: string
}

export interface WorkflowExecutionState {
  workflowId: string
  agentName: string
  currentPhaseIndex: number
  currentStepIndex: number
  status: 'active' | 'paused' | 'completed' | 'error'
  lastRunAt: string | null
  nextRunAt: string
  errorCount: number
  lastError?: string | null
}

export interface StepResult {
  ok: boolean
  preview?: string
  error?: string
}

// ── Progress Computation ──────────────────────────────────────

export function computeProgress(
  definition: WorkflowDefinition,
  phaseIndex: number,
  stepIndex: number
): number {
  const totalSteps = definition.phases.reduce((sum, p) => sum + p.steps.length, 0)
  if (totalSteps === 0) return 0

  let completedSteps = 0
  for (let p = 0; p < phaseIndex; p++) {
    completedSteps += definition.phases[p]?.steps.length ?? 0
  }
  completedSteps += stepIndex

  return Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)))
}

// ── Assign Workflow ───────────────────────────────────────────

export async function assignWorkflow(
  agentName: string,
  definition: WorkflowDefinition
): Promise<string> {
  if (!ALL_AGENT_NAMES.includes(agentName)) {
    throw new Error(`Unknown agent: ${agentName}`)
  }
  if (!definition.phases?.length) {
    throw new Error('Workflow must have at least one phase')
  }

  // Deactivate any existing active execution
  await db
    .update(workflowExecutions)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(and(eq(workflowExecutions.agentName, agentName), eq(workflowExecutions.status, 'active')))

  // Insert workflow definition
  const [defRow] = await db
    .insert(workflowDefinitions)
    .values({
      agentName,
      corp: definition.corp ?? AGENT_CORP_LOOKUP[agentName] ?? 'intelcore',
      name: definition.name,
      description: definition.description,
      definition: definition as unknown as Record<string, unknown>,
      isActive: true,
      createdBy: definition.createdBy ?? 'system',
    })
    .returning({ id: workflowDefinitions.id })

  const workflowId = defRow.id
  const now = new Date()

  // Insert execution row
  await db.insert(workflowExecutions).values({
    workflowId,
    agentName,
    currentPhaseIndex: 0,
    currentStepIndex: 0,
    status: 'active',
    nextRunAt: now,
    errorCount: 0,
  })

  // Sync KV
  await setAgentWorkflowState(agentName, {
    workflowId,
    workflowName: definition.name,
    currentPhase: definition.phases[0]?.name ?? '',
    currentStep: definition.phases[0]?.steps[0]?.name ?? '',
    status: 'active',
    lastRunAt: '',
    nextRunAt: now.toISOString(),
    progress: 0,
  })

  return workflowId
}

// ── Advance Cursor ────────────────────────────────────────────

export async function advanceCursor(agentName: string, stepResult: StepResult): Promise<void> {
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.agentName, agentName))
    .limit(1)

  if (!execution) return

  const [defRow] = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.id, execution.workflowId!))
    .limit(1)

  if (!defRow) return

  const definition = defRow.definition as unknown as WorkflowDefinition
  const now = new Date()

  const phase = definition.phases[execution.currentPhaseIndex!]
  if (!phase) return

  const isLastStep = execution.currentStepIndex! >= phase.steps.length - 1
  const isLastPhase = execution.currentPhaseIndex! >= definition.phases.length - 1

  let nextPhaseIndex = execution.currentPhaseIndex!
  let nextStepIndex = execution.currentStepIndex!
  let nextStatus: string = 'active'
  let nextRunAt: Date

  if (isLastStep) {
    if (isLastPhase) {
      if (phase.repeatIntervalMs) {
        // Recurring last phase — loop it
        nextStepIndex = 0
        nextRunAt = new Date(now.getTime() + phase.repeatIntervalMs)
      } else {
        // Workflow complete
        await db
          .update(workflowExecutions)
          .set({ status: 'completed', lastRunAt: now, updatedAt: now })
          .where(eq(workflowExecutions.agentName, agentName))
        await setAgentWorkflowState(agentName, {
          workflowId: execution.workflowId!,
          workflowName: defRow.name,
          currentPhase: phase.name,
          currentStep: phase.steps[execution.currentStepIndex!]?.name ?? '',
          status: 'completed',
          lastRunAt: now.toISOString(),
          nextRunAt: '',
          progress: 100,
        })
        return
      }
    } else {
      // Move to next phase
      nextPhaseIndex = execution.currentPhaseIndex! + 1
      nextStepIndex = 0
      const nextPhase = definition.phases[nextPhaseIndex]
      nextRunAt = new Date(now.getTime() + (nextPhase?.repeatIntervalMs ?? 0))
    }
  } else {
    // Move to next step in same phase
    nextStepIndex = execution.currentStepIndex! + 1
    const step = phase.steps[execution.currentStepIndex!]
    nextRunAt = new Date(now.getTime() + (step?.durationEstimateMs ?? 60_000))
  }

  const nextPhase = definition.phases[nextPhaseIndex]
  const nextStep = nextPhase?.steps[nextStepIndex]

  await db
    .update(workflowExecutions)
    .set({
      currentPhaseIndex: nextPhaseIndex,
      currentStepIndex: nextStepIndex,
      status: nextStatus,
      lastRunAt: now,
      nextRunAt: nextRunAt!,
      updatedAt: now,
    })
    .where(eq(workflowExecutions.agentName, agentName))

  await setAgentWorkflowState(agentName, {
    workflowId: execution.workflowId!,
    workflowName: defRow.name,
    currentPhase: nextPhase?.name ?? '',
    currentStep: nextStep?.name ?? '',
    status: 'active',
    lastRunAt: now.toISOString(),
    nextRunAt: nextRunAt!.toISOString(),
    progress: computeProgress(definition, nextPhaseIndex, nextStepIndex),
  })
}

// ── Execute Step ──────────────────────────────────────────────

export async function executeStep(agentName: string): Promise<StepResult> {
  // Skip paused agents
  const paused = await isAgentPaused(agentName)
  if (paused) return { ok: true, preview: 'skipped (paused)' }

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(and(eq(workflowExecutions.agentName, agentName), eq(workflowExecutions.status, 'active')))
    .limit(1)

  if (!execution) return { ok: false, error: 'No active execution found' }

  const [defRow] = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.id, execution.workflowId!))
    .limit(1)

  if (!defRow) {
    // Orphaned execution
    await db
      .update(workflowExecutions)
      .set({ status: 'error', lastError: 'workflow_definition_missing', updatedAt: new Date() })
      .where(eq(workflowExecutions.agentName, agentName))
    await db.insert(agentActions).values({
      agentName,
      company: AGENT_CORP_LOOKUP[agentName] ?? 'intelcore',
      actionType: 'workflow_definition_missing',
      details: { summary: `Workflow definition not found for ${agentName}` },
      outcome: 'error',
    })
    return { ok: false, error: 'workflow_definition_missing' }
  }

  const definition = defRow.definition as unknown as WorkflowDefinition
  const phase = definition.phases[execution.currentPhaseIndex!]
  const step = phase?.steps[execution.currentStepIndex!]

  if (!step) return { ok: false, error: 'Step not found at cursor position' }

  const corp = AGENT_CORP_LOOKUP[agentName] ?? 'intelcore'
  const start = Date.now()

  await setAgentActive(agentName, `workflow:${step.action}`)

  try {
    const result = await executeAction(step.action, step.params ?? {}, agentName, corp)

    await setAgentIdle(agentName, `workflow:${step.action}:done`)

    await db.insert(agentActions).values({
      agentName,
      company: corp,
      actionType: step.action,
      details: {
        summary: result.preview ?? `Executed ${step.action}`,
        phase: phase.name,
        step: step.name,
        workflowId: execution.workflowId,
      },
      outcome: result.ok ? 'success' : 'error',
      durationMs: Date.now() - start,
    })

    return { ok: result.ok, preview: result.preview }
  } catch (err) {
    const errorMsg = String(err)
    const newErrorCount = (execution.errorCount ?? 0) + 1
    const now = new Date()

    await setAgentError(agentName, `workflow:${step.action}:failed`)

    if (newErrorCount >= 3) {
      await db
        .update(workflowExecutions)
        .set({
          status: 'error',
          errorCount: newErrorCount,
          lastError: errorMsg,
          nextRunAt: new Date(now.getTime() + 5 * 60_000),
          updatedAt: now,
        })
        .where(eq(workflowExecutions.agentName, agentName))

      await db.insert(agentActions).values({
        agentName,
        company: corp,
        actionType: 'crisis_alert',
        details: { summary: `Agent ${agentName} failed 3 times — workflow halted`, error: errorMsg },
        outcome: 'error',
      })
    } else {
      await db
        .update(workflowExecutions)
        .set({
          errorCount: newErrorCount,
          lastError: errorMsg,
          nextRunAt: new Date(now.getTime() + 5 * 60_000),
          updatedAt: now,
        })
        .where(eq(workflowExecutions.agentName, agentName))

      await db.insert(agentActions).values({
        agentName,
        company: corp,
        actionType: step.action,
        details: { summary: `Step failed (attempt ${newErrorCount}/3)`, error: errorMsg },
        outcome: 'error',
        durationMs: Date.now() - start,
      })
    }

    return { ok: false, error: errorMsg }
  }
}

// ── Get Due Executions ────────────────────────────────────────

export async function getDueExecutions(limit = 10): Promise<WorkflowExecutionState[]> {
  const rows = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.status, 'active'),
        lte(workflowExecutions.nextRunAt, new Date())
      )
    )
    .limit(limit)
    .orderBy(workflowExecutions.nextRunAt)

  return rows.map((r) => ({
    workflowId: r.workflowId ?? '',
    agentName: r.agentName,
    currentPhaseIndex: r.currentPhaseIndex ?? 0,
    currentStepIndex: r.currentStepIndex ?? 0,
    status: (r.status ?? 'active') as WorkflowExecutionState['status'],
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    nextRunAt: r.nextRunAt.toISOString(),
    errorCount: r.errorCount ?? 0,
    lastError: r.lastError,
  }))
}

// ── Schedule All Due Agents ───────────────────────────────────

export async function scheduleAllDueAgents(): Promise<{ agentsRun: number; stepsExecuted: number }> {
  // Max 10 agents per cron tick — keeps execution within Vercel's timeout
  const due = await getDueExecutions(10)
  if (due.length === 0) return { agentsRun: 0, stepsExecuted: 0 }

  // Run all 10 concurrently
  const results = await Promise.allSettled(
    due.map(async (execution) => {
      const result = await executeStep(execution.agentName)
      if (result.ok && result.preview !== 'skipped (paused)') {
        await advanceCursor(execution.agentName, result)
      }
      return result
    })
  )

  const stepsExecuted = results.filter(
    (r) => r.status === 'fulfilled' && r.value.ok && r.value.preview !== 'skipped (paused)'
  ).length

  return { agentsRun: due.length, stepsExecuted }
}

// ── Get Execution State ───────────────────────────────────────

export async function getExecutionState(agentName: string): Promise<WorkflowExecutionState | null> {
  const [row] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.agentName, agentName))
    .limit(1)

  if (!row) return null

  return {
    workflowId: row.workflowId ?? '',
    agentName: row.agentName,
    currentPhaseIndex: row.currentPhaseIndex ?? 0,
    currentStepIndex: row.currentStepIndex ?? 0,
    status: (row.status ?? 'active') as WorkflowExecutionState['status'],
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    nextRunAt: row.nextRunAt.toISOString(),
    errorCount: row.errorCount ?? 0,
    lastError: row.lastError,
  }
}
