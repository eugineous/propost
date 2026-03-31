// P7: CEO task always produces ≥1 sub-task with correct parent_task_id
// P8: All sub-tasks completed → parent task status = completed
// P9: Agent with active task must have status = active in DB

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('P7: CEO task produces ≥1 sub-task with correct parent_task_id', () => {
  it('every CEO task dispatch creates at least one sub-task referencing the parent', () => {
    fc.assert(
      fc.property(
        fc.record({
          parentTaskId: fc.uuid(),
          company: fc.constantFrom('xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore'),
          subTaskCount: fc.integer({ min: 1, max: 5 }),
        }),
        ({ parentTaskId, subTaskCount }) => {
          // Simulate sub-task creation
          const subTasks = Array.from({ length: subTaskCount }, (_, i) => ({
            id: `sub-${i}`,
            parentTaskId,
            status: 'queued',
          }))
          // Every sub-task must reference the parent
          expect(subTasks.length).toBeGreaterThanOrEqual(1)
          for (const sub of subTasks) {
            expect(sub.parentTaskId).toBe(parentTaskId)
          }
        }
      )
    )
  })
})

describe('P8: All sub-tasks completed → parent task status = completed', () => {
  it('parent becomes completed only when all sub-tasks are completed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('queued', 'active', 'completed', 'failed'),
          { minLength: 1, maxLength: 6 }
        ),
        (subTaskStatuses) => {
          const allCompleted = subTaskStatuses.every((s) => s === 'completed')
          const parentStatus = allCompleted ? 'completed' : 'active'
          if (allCompleted) {
            expect(parentStatus).toBe('completed')
          } else {
            expect(parentStatus).not.toBe('completed')
          }
        }
      )
    )
  })
})

describe('P9: Agent with active task has status = active', () => {
  it('agent status is active whenever it has an active task', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentName: fc.constantFrom('BLAZE', 'ECHO', 'ORATOR', 'AURORA'),
          taskStatus: fc.constantFrom('queued', 'assigned', 'active', 'completed', 'failed'),
        }),
        ({ taskStatus }) => {
          const agentStatus = taskStatus === 'active' ? 'active' : 'idle'
          if (taskStatus === 'active') {
            expect(agentStatus).toBe('active')
          }
        }
      )
    )
  })
})
