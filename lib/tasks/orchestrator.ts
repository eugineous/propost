// TaskOrchestrator — creates, assigns, and tracks tasks in the `tasks` table
// Emits SSE events via propostEvents on every status change

import { getDb, withRetry } from '../db/client'
import { propostEvents } from '../events'
import type { Task, TaskStatus, TaskType, Company, Platform, ContentPillar } from '../types'
import type { TaskRow } from '../db/schema'

export interface TaskSpec {
  type: TaskType
  company: Company
  platform?: Platform
  contentPillar?: ContentPillar
  scheduledAt?: Date
  priority?: 1 | 2 | 3
  parentTaskId?: string
  assignedAgent?: string
  // Pre-generated content stored on the task so agents don't re-generate
  content?: string
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    type: row.type as TaskType,
    company: row.company as Company,
    platform: row.platform as Platform | undefined,
    assignedAgent: row.assigned_agent ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    status: row.status as TaskStatus,
    priority: (row.priority ?? 2) as 1 | 2 | 3,
    contentPillar: row.content_pillar as ContentPillar | undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
  }
}

export class TaskOrchestrator {
  /** Create a new task and persist it to the `tasks` table */
  async createTask(spec: TaskSpec): Promise<Task> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        INSERT INTO tasks (
          type,
          company,
          platform,
          content_pillar,
          scheduled_at,
          priority,
          parent_task_id,
          assigned_agent,
          status,
          result
        ) VALUES (
          ${spec.type},
          ${spec.company},
          ${spec.platform ?? null},
          ${spec.contentPillar ?? null},
          ${spec.scheduledAt ?? null},
          ${spec.priority ?? 2},
          ${spec.parentTaskId ?? null},
          ${spec.assignedAgent ?? null},
          'queued',
          ${spec.content ? JSON.stringify({ content: spec.content }) : null}
        )
        RETURNING *
      `
    })

    const task = rowToTask((rows as TaskRow[])[0])
    propostEvents.emit('activity', { type: 'task_created', task })
    return task
  }

  /** Assign a task to an agent (sets status → 'assigned') */
  async assignTask(taskId: string, agentName: string): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE tasks
        SET assigned_agent = ${agentName},
            status = 'assigned'
        WHERE id = ${taskId}
      `
    })

    propostEvents.emit('activity', {
      type: 'task_assigned',
      taskId,
      agentName,
    })
  }

  /** Update task status and optionally store result/error */
  async updateStatus(
    taskId: string,
    status: TaskStatus,
    result?: unknown,
    error?: string
  ): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        UPDATE tasks
        SET status       = ${status},
            result       = ${result !== undefined ? JSON.stringify(result) : null},
            error        = ${error ?? null},
            started_at   = CASE WHEN ${status} = 'active'    AND started_at IS NULL THEN NOW() ELSE started_at END,
            completed_at = CASE WHEN ${status} IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
        WHERE id = ${taskId}
      `
    })

    propostEvents.emit('activity', { type: 'task_status', taskId, status })
  }

  /** Return all tasks that are currently active or assigned */
  async getActiveTasks(): Promise<Task[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        SELECT * FROM tasks
        WHERE status IN ('queued', 'assigned', 'active', 'pending_approval')
        ORDER BY priority ASC, created_at ASC
      `
    })

    return (rows as TaskRow[]).map(rowToTask)
  }

  /** Return all tasks assigned to a specific agent */
  async getTasksByAgent(agentName: string): Promise<Task[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        SELECT * FROM tasks
        WHERE assigned_agent = ${agentName}
        ORDER BY created_at DESC
      `
    })

    return (rows as TaskRow[]).map(rowToTask)
  }

  /** Return all sub-tasks of a parent task */
  async getSubTasks(parentTaskId: string): Promise<Task[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        SELECT * FROM tasks
        WHERE parent_task_id = ${parentTaskId}
        ORDER BY created_at ASC
      `
    })

    return (rows as TaskRow[]).map(rowToTask)
  }
}

export const taskOrchestrator = new TaskOrchestrator()
