# Requirements Document

## Introduction

The Agent Workflow Engine gives all 47 ProPost Empire agents structured, autonomously-executing workflows stored in Postgres. Instead of cycling idle → resume → idle with no real work, every agent follows a defined sequence of phases → steps → actions driven by the autopilot cron. The system includes a founder-facing Workflow Editor UI, Cloudflare KV for fast per-agent state reads, a seeding mechanism for default workflows, and a Pixel Art Office that replaces the current OfficeCanvas with 9 company-themed rooms where agents animate based on real execution state.

## Glossary

- **Workflow_Engine**: The core library (`lib/workflowEngine.ts`) responsible for loading definitions, determining due agents, executing steps, and advancing cursors.
- **Scheduler**: The component within Workflow_Engine that queries `workflow_executions` and dispatches due steps; invoked by the autopilot cron.
- **Executor**: The component within Workflow_Engine that calls `dispatchToAgent()` for a given step and records the outcome.
- **WorkflowDefinition**: A JSON document describing an agent's workflow as an ordered list of phases, each containing an ordered list of steps.
- **WorkflowPhase**: A named group of steps within a WorkflowDefinition; may be recurring (has `repeatIntervalMs`) or one-shot.
- **WorkflowStep**: A single unit of work within a phase, mapping to a `dispatchToAgent` action string with optional parameters.
- **Workflow_Executions**: The Postgres table tracking each agent's live execution cursor (current phase index, step index, status, next_run_at).
- **Workflow_Definitions**: The Postgres table storing all workflow definition JSON documents.
- **Cursor**: The `(currentPhaseIndex, currentStepIndex)` pair that tracks where an agent is in its workflow.
- **Cloudflare_KV**: The Cloudflare Workers KV namespace used for fast per-agent state reads by the UI.
- **Workflow_Editor**: The founder-facing UI page at `/settings/workflows` for creating, editing, and assigning workflows.
- **Pixel_Office**: The React component (`components/PixelOffice/`) that replaces `OfficeCanvas.tsx` with 9 company-themed pixel-art rooms.
- **Pixel_Agent**: A pixel-art character within a Pixel_Office room representing one agent, animated by real workflow state.
- **Workflow_API**: The set of Next.js API routes under `/api/workflows` that handle CRUD operations on workflow definitions and executions.
- **Seed_Function**: The one-time initialization function (`lib/defaultWorkflows.ts`) that creates default workflow definitions and executions for all 47 agents.
- **Corp**: One of the 9 companies: XForce, GramGod, LinkedElite, PagePower, WebBoss, FinanceDesk, LegalShield, HRForce, IntelCore.
- **ALL_AGENT_NAMES**: The canonical list of all 47 agent names defined in `lib/agentState.ts`.

---

## Requirements

### Requirement 1: Workflow Definition Storage

**User Story:** As the system, I want to persist workflow definitions in Postgres, so that agents have durable, structured work to execute across restarts and deployments.

#### Acceptance Criteria

1. THE Workflow_Engine SHALL store workflow definitions in the `workflow_definitions` Postgres table with fields: `id`, `agent_name`, `corp`, `name`, `description`, `definition` (JSONB), `is_active`, `created_by`, `created_at`, `updated_at`.
2. THE Workflow_Engine SHALL store per-agent execution state in the `workflow_executions` Postgres table with fields: `id`, `workflow_id`, `agent_name`, `current_phase_index`, `current_step_index`, `status`, `last_run_at`, `next_run_at`, `error_count`, `last_error`, `completed_phases`, `created_at`, `updated_at`.
3. WHEN a workflow is assigned to an agent, THE Workflow_Engine SHALL create a `workflow_executions` row with `status='active'`, `current_phase_index=0`, `current_step_index=0`, and `next_run_at` set to the current time.
4. THE Workflow_Engine SHALL enforce at most one `status='active'` execution per agent at a time by deactivating any previous active execution before inserting a new one.
5. THE `workflow_executions` table SHALL have an index on `next_run_at` to support efficient scheduler queries.

---

### Requirement 2: Autopilot Cron as Workflow Scheduler

**User Story:** As the system, I want the autopilot cron to drive workflow execution, so that agents autonomously execute their assigned steps on schedule without manual intervention.

#### Acceptance Criteria

1. WHEN the autopilot cron runs, THE Scheduler SHALL query `workflow_executions` WHERE `status='active'` AND `next_run_at <= NOW()` to find all due agents.
2. WHEN due agents are found, THE Scheduler SHALL dispatch each agent's current step by calling `dispatchToAgent(corp, agentName, stepPayload)` with the step's action string and parameters.
3. WHEN a step dispatch completes, THE Scheduler SHALL write the outcome to `agent_actions` with `action_type` set to the step's action string and `outcome` set to `'success'` or `'error'`.
4. WHEN processing due agents, THE Scheduler SHALL use `Promise.allSettled` with a maximum of 10 concurrent dispatches per tick to avoid Gemini API rate limits.
5. WHEN an agent's `isPaused` flag is `true` in Cloudflare KV, THE Scheduler SHALL skip that agent for the current tick without advancing the cursor or logging an error.
6. WHEN a step dispatch fails, THE Scheduler SHALL increment `error_count` by 1 and set `next_run_at = NOW() + 5 minutes` as a retry backoff.
7. WHEN `error_count` reaches 3 for an execution, THE Scheduler SHALL set `status='error'` and insert an `agent_actions` row with `action_type='crisis_alert'`.
8. THE Scheduler SHALL set the agent's KV state to `'active'` before dispatching a step and back to `'idle'` after the step completes or fails.

---

### Requirement 3: Cursor Advancement Algorithm

**User Story:** As the system, I want the workflow cursor to advance correctly through phases and steps, so that agents progress through their full workflow lifecycle without skipping or repeating work.

#### Acceptance Criteria

1. WHEN a step completes and it is not the last step in the current phase, THE Workflow_Engine SHALL increment `current_step_index` by 1 and set `next_run_at = NOW() + step.durationEstimateMs` (defaulting to 60 seconds if not set).
2. WHEN the last step of a non-last phase completes, THE Workflow_Engine SHALL set `current_phase_index` to the next phase index, `current_step_index` to 0, and `next_run_at = NOW() + nextPhase.repeatIntervalMs` (defaulting to 0 if not set).
3. WHEN the last step of the last phase completes and the phase has no `repeatIntervalMs`, THE Workflow_Engine SHALL set `status='completed'` on the execution row.
4. WHEN the last step of a recurring phase (has `repeatIntervalMs`) completes, THE Workflow_Engine SHALL reset `current_step_index` to 0, keep `status='active'`, and set `next_run_at = NOW() + phase.repeatIntervalMs`.
5. WHEN a phase has a `runAfterPhaseId` dependency that has not yet completed, THE Workflow_Engine SHALL skip that phase's steps and set `next_run_at = NOW() + 60 seconds` to re-check.
6. THE `computeProgress` function SHALL return an integer in the range [0, 100] for any valid combination of `currentPhaseIndex`, `currentStepIndex`, and `WorkflowDefinition`.

---

### Requirement 4: Cloudflare KV State Synchronization

**User Story:** As the UI, I want to read agent workflow state from Cloudflare KV, so that the Pixel Office and status pages load quickly without hitting Postgres on every render.

#### Acceptance Criteria

1. WHEN the cursor is advanced in Postgres, THE Workflow_Engine SHALL also write the updated state to Cloudflare KV under the key `workflow:{agentName}:state` with fields: `workflowId`, `workflowName`, `currentPhase`, `currentStep`, `status`, `lastRunAt`, `nextRunAt`, `progress`.
2. THE Workflow_Engine SHALL read agent workflow state from Cloudflare KV for all UI-facing endpoints to avoid Postgres reads on every poll.
3. IF Cloudflare KV is unavailable, THEN THE Workflow_Engine SHALL fall back to in-memory state and log a warning, without failing the step execution.
4. WHEN an agent's workflow is deactivated or completed, THE Workflow_Engine SHALL update the KV entry to reflect the new status immediately.

---

### Requirement 5: Workflow Editor UI

**User Story:** As Eugine (the founder), I want a Workflow Editor at /settings/workflows, so that I can create custom workflows and assign them to any of the 47 agents without touching code.

#### Acceptance Criteria

1. THE Workflow_Editor SHALL be accessible only to authenticated sessions at the path `/settings/workflows`, returning a 401 or redirect for unauthenticated requests.
2. THE Workflow_Editor SHALL display an agent selector showing all 47 agents grouped by their Corp.
3. THE Workflow_Editor SHALL allow adding, removing, and reordering phases within a workflow definition.
4. THE Workflow_Editor SHALL allow adding, removing, and reordering steps within each phase, with fields for action string, parameters (JSON), `durationEstimateMs`, and retry toggle.
5. THE Workflow_Editor SHALL allow setting `repeatIntervalMs` on each phase to configure recurring execution.
6. WHEN a founder submits a workflow assignment, THE Workflow_Editor SHALL POST to `/api/workflows` with the agent name and workflow definition.
7. THE Workflow_Editor SHALL display the current execution state (phase name, step name, status, progress) for each agent that has an active workflow.

---

### Requirement 6: Workflow API

**User Story:** As the system, I want a validated API for workflow CRUD operations, so that workflow definitions are created, updated, and assigned safely with proper authorization.

#### Acceptance Criteria

1. THE Workflow_API SHALL expose the following routes: `POST /api/workflows`, `GET /api/workflows`, `GET /api/workflows/[agentName]`, `POST /api/workflows/[agentName]/execute`, `DELETE /api/workflows/[agentName]`.
2. WHEN a `POST /api/workflows` request is received, THE Workflow_API SHALL validate that `agentName` is present in `ALL_AGENT_NAMES` and reject requests with unknown agent names with a 400 response.
3. WHEN a `POST /api/workflows` request is received, THE Workflow_API SHALL validate that each step's `action` string is in the allowlist of known action types before persisting the definition.
4. THE Workflow_API SHALL set `createdBy='founder'` server-side on all founder-submitted workflows, ignoring any `createdBy` value in the client payload.
5. WHEN a `DELETE /api/workflows/[agentName]` request is received, THE Workflow_API SHALL set the agent's active execution `status='paused'` and the definition `is_active=false`.
6. WHEN a `POST /api/workflows/[agentName]/execute` request is received, THE Workflow_API SHALL manually trigger the next step for that agent regardless of `next_run_at`.

---

### Requirement 7: Default Workflow Seeding

**User Story:** As the system, I want default workflows seeded for all 47 agents on first run, so that every agent has work to do immediately without Eugine manually configuring each one.

#### Acceptance Criteria

1. THE Seed_Function SHALL create a `workflow_definitions` row and a `workflow_executions` row for every agent in `ALL_AGENT_NAMES` that does not already have an active execution.
2. THE Seed_Function SHALL be idempotent: running it multiple times SHALL NOT create duplicate `workflow_executions` rows for agents that already have an active execution.
3. THE Seed_Function SHALL seed the CHAT agent (gramgod) with the 4-phase Instagram DM Workflow: Phase 1 Backlog Clearance (5 steps), Phase 2 Shoutout Selection (2 steps), Phase 3 Reporting (1 step), Phase 4 Ongoing Engagement (1 step, `repeatIntervalMs=86400000`).
4. THE Seed_Function SHALL seed default workflows for all remaining 46 agents with at least one phase containing at least one step appropriate to each agent's role.
5. WHEN the Seed_Function runs, THE Workflow_Engine SHALL log a `workflow_seeded` action to `agent_actions` for each agent that received a new workflow.

---

### Requirement 8: 3D Retro Office

**User Story:** As Eugine, I want a Claw3D-inspired 3D retro office that shows all 9 company rooms with animated agent characters reflecting real workflow state, so that I can see at a glance what every agent is doing right now — like walking through my actual AI workplace.

#### Acceptance Criteria

1. THE Office3D SHALL render exactly 9 rooms arranged in a navigable 3D office floor plan, one room per Corp, each with a distinct low-poly retro theme matching the company's identity.
2. THE Office3D SHALL replace the existing `OfficeCanvas.tsx` component as the primary office visualization on the dashboard.
3. WHEN an agent's workflow status is `'active'` and a step is currently executing, THE Office3D SHALL render that agent walking to their desk and playing a typing/working animation.
4. WHEN an agent's workflow status is `'idle'` or `'completed'`, THE Office3D SHALL render that agent in an idle animation (standing, wandering, or sitting at their desk).
5. WHEN an agent's workflow status is `'error'`, THE Office3D SHALL render that agent in an error animation (head in hands, red indicator above head).
6. WHEN an agent is in the `'working'` state, THE Office3D SHALL display a floating speech bubble or name tag above that agent showing the current workflow step name.
7. WHEN a user clicks an agent character, THE Office3D SHALL display a side panel showing the agent's full workflow execution state including workflow name, current phase, current step, progress percentage, last run time, and next run time.
8. THE Office3D SHALL poll `/api/monitor/live` at a regular interval to refresh agent states without a full page reload.
9. WHEN agents are actively executing steps in a room, THE Office3D SHALL apply a glow or pulse effect to that room to indicate activity.
10. THE Office3D camera SHALL default to an isometric overview of the full office, with click-to-zoom into individual rooms and click-to-focus on individual agents.
11. WHEN a step completes successfully, THE Office3D SHALL play a brief celebration animation on that agent (fist pump, jump, or similar).
12. WHEN agents are idle and no workflow step is running, THE Office3D SHALL animate them wandering to the coffee machine, whiteboard, or common areas — driven by the existing `lib/agentIdle.ts` idle behavior patterns.

---

### Requirement 9: Agent State Integration

**User Story:** As the system, I want workflow execution to integrate with the existing agent state management, so that the KV-based agent state (active/idle/error) stays consistent with workflow execution state.

#### Acceptance Criteria

1. WHEN the Scheduler begins executing a step for an agent, THE Workflow_Engine SHALL call `setAgentActive(agentName)` before calling `dispatchToAgent`.
2. WHEN a step execution completes successfully, THE Workflow_Engine SHALL call `setAgentIdle(agentName)` after recording the outcome.
3. WHEN a step execution fails, THE Workflow_Engine SHALL call `setAgentError(agentName)` after incrementing `error_count`.
4. WHEN an agent is paused via `pauseAgent()`, THE Scheduler SHALL detect the paused state via `isAgentPaused()` and skip that agent's execution for the current tick.
5. THE Workflow_Engine SHALL use the existing `AGENT_CORP_LOOKUP` map to resolve the correct corp for each agent when calling `dispatchToAgent`.

---

### Requirement 10: Workflow Definition Validation

**User Story:** As the system, I want workflow definitions to be validated before storage, so that malformed workflows cannot cause runtime errors during execution.

#### Acceptance Criteria

1. WHEN a workflow definition is submitted, THE Workflow_API SHALL reject definitions where `phases` is empty or missing with a 400 response.
2. WHEN a workflow definition is submitted, THE Workflow_API SHALL reject definitions where any phase has an empty or missing `steps` array with a 400 response.
3. WHEN a workflow definition is submitted, THE Workflow_API SHALL reject definitions where `agentName` is not a string present in `ALL_AGENT_NAMES` with a 400 response.
4. WHEN a workflow definition is submitted, THE Workflow_API SHALL reject definitions where any step's `action` field is not a non-empty string with a 400 response.
5. IF a `workflow_executions` row references a `workflow_id` that no longer exists in `workflow_definitions`, THEN THE Scheduler SHALL set that execution's `status='error'` and log a `workflow_definition_missing` action to `agent_actions`.
