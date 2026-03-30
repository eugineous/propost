# Implementation Plan: Agent Workflow Engine

## Overview

Implement a structured workflow engine for all 47 ProPost Empire agents: DB schema migration, core engine, KV state manager, default workflow seeding, autopilot rewrite, API routes, Workflow Editor UI, and a 3D Retro Office replacing OfficeCanvas. TypeScript throughout, Next.js App Router, Drizzle ORM + Neon Postgres, Cloudflare KV, Three.js / React Three Fiber.

## Tasks

- [x] 1. DB Schema Migration — add workflow tables to `lib/schema.ts`
  - [x] 1.1 Add `workflow_definitions` and `workflow_executions` tables to `lib/schema.ts`
    - Add `workflowDefinitions` pgTable with fields: `id`, `agentName`, `corp`, `name`, `description`, `definition` (jsonb), `isActive`, `createdBy`, `createdAt`, `updatedAt`
    - Add `workflowExecutions` pgTable with fields: `id`, `workflowId` (FK → workflowDefinitions), `agentName` (unique), `currentPhaseIndex`, `currentStepIndex`, `status`, `lastRunAt`, `nextRunAt`, `errorCount`, `lastError`, `completedPhases` (jsonb), `createdAt`, `updatedAt`
    - Export both tables from `lib/schema.ts`
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]\* 1.2 Write property test for schema shape
    - **Property 11: Agent Name Validation** — any `agentName` not in `ALL_AGENT_NAMES` must be rejected at the API layer
    - **Validates: Requirements 1.4, 6.2**

- [x] 2. Core Workflow Engine — create `lib/workflowEngine.ts`
  - [x] 2.1 Define TypeScript interfaces: `WorkflowStep`, `WorkflowPhase`, `WorkflowDefinition`, `WorkflowExecutionState`, `StepResult`
    - Mirror the interfaces from the design document exactly
    - Export all interfaces for use by API routes and UI
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement `assignWorkflow(agentName, definition)`
    - Validate `agentName` is in `ALL_AGENT_NAMES` (import from `lib/agentState.ts`)
    - Deactivate any existing `status='active'` execution for the agent before inserting
    - Insert into `workflow_definitions` and `workflow_executions` with `status='active'`, `currentPhaseIndex=0`, `currentStepIndex=0`, `nextRunAt=NOW()`
    - Call `setAgentWorkflowState` (from `lib/workflowState.ts`) with initial KV state
    - _Requirements: 1.3, 1.4, 4.1_

  - [ ]\* 2.3 Write property test for `assignWorkflow` initial state
    - **Property 1: Workflow Assignment Initial State** — after `assignWorkflow`, execution row has `status='active'`, `currentPhaseIndex=0`, `currentStepIndex=0`, `nextRunAt` non-null
    - **Property 2: Single Active Execution Per Agent** — after multiple `assignWorkflow` calls to same agent, exactly one `status='active'` row exists
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.4 Implement `computeProgress(definition, phaseIndex, stepIndex)`
    - Calculate total steps across all phases
    - Calculate completed steps up to current position
    - Return `Math.round((completedSteps / totalSteps) * 100)` clamped to [0, 100]
    - _Requirements: 3.6_

  - [ ]\* 2.5 Write property test for `computeProgress`
    - **Property 7: Progress Range Invariant** — for any valid `(phaseIndex, stepIndex)` within a `WorkflowDefinition`, `computeProgress` returns an integer in [0, 100]
    - Use fast-check `fc.integer` to generate arbitrary valid indices
    - **Validates: Requirements 3.6**

  - [x] 2.6 Implement `advanceCursor(agentName, stepResult)`
    - Load execution + definition from DB
    - Apply cursor advancement algorithm from design pseudocode:
      - Not last step → increment `currentStepIndex`, set `nextRunAt = NOW() + step.durationEstimateMs ?? 60000`
      - Last step, not last phase → increment `currentPhaseIndex`, reset `currentStepIndex=0`
      - Last step, last phase, no `repeatIntervalMs` → set `status='completed'`
      - Last step, recurring phase → reset `currentStepIndex=0`, set `nextRunAt = NOW() + repeatIntervalMs`
    - Update `workflow_executions` row in DB
    - Call `setAgentWorkflowState` to sync KV
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

  - [ ]\* 2.7 Write property tests for `advanceCursor`
    - **Property 3: Cursor Advances on Success** — after successful step, `currentStepIndex` increments when not last step
    - **Property 4: Phase Transition on Last Step** — at last step of non-last phase, `currentPhaseIndex` increments and `currentStepIndex` resets to 0
    - **Property 5: Workflow Completion** — after N×M successful `advanceCursor` calls on non-recurring workflow, `status='completed'`
    - **Property 6: Recurring Phase Never Completes** — recurring phase never sets `status='completed'`
    - Use fast-check to generate arbitrary valid `WorkflowDefinition` shapes
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 2.8 Implement `executeStep(agentName)`
    - Check `isAgentPaused(agentName)` — return early if paused (no cursor advance, no log)
    - Load execution from DB; validate phase/step indices exist in definition
    - Call `setAgentActive(agentName)` before dispatch
    - Call `dispatchToAgent(corp, agentName, { task: step.action, ...step.params })` using `AGENT_CORP_LOOKUP`
    - On success: call `setAgentIdle(agentName)`, insert `agent_actions` row with `outcome='success'`
    - On failure: call `setAgentError(agentName)`, increment `errorCount`, set `nextRunAt = NOW() + 5min`
    - When `errorCount >= 3`: set `status='error'`, insert `agent_actions` with `actionType='crisis_alert'`
    - Return `StepResult { ok, preview, error? }`
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.9 Implement `getDueExecutions()` and `scheduleAllDueAgents()`
    - `getDueExecutions`: query `workflow_executions WHERE status='active' AND next_run_at <= NOW()`
    - `scheduleAllDueAgents`: call `getDueExecutions`, process up to 10 agents concurrently via `Promise.allSettled`, call `executeStep` then `advanceCursor` for each, handle missing `workflow_id` (set `status='error'`, log `workflow_definition_missing`), return `{ agentsRun, stepsExecuted }`
    - _Requirements: 2.1, 2.4, 10.5_

  - [ ]\* 2.10 Write property test for error count monotonicity
    - **Property 10: Error Count Monotonicity** — across any sequence of step executions, `errorCount` never decreases
    - **Validates: Requirements 2.6**

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. KV State Manager — create `lib/workflowState.ts`
  - [x] 4.1 Implement `getAgentWorkflowState(agentName)` and `setAgentWorkflowState(agentName, state)`
    - Key pattern: `workflow:{agentName}:state`
    - Use existing CF KV REST API pattern from `lib/agentState.ts` (same env vars: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_KV_AGENT_STATE_ID`)
    - In-memory fallback when CF KV is not configured; log warning on KV failure without throwing
    - Store `AgentWorkflowKV` shape: `workflowId`, `workflowName`, `currentPhase`, `currentStep`, `status`, `lastRunAt`, `nextRunAt`, `progress`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 4.2 Write property test for KV consistency
    - **Property 8: KV Consistency After Cursor Advance** — after `advanceCursor`, KV entry reflects same `currentPhase`, `currentStep`, `status`, `nextRunAt` as DB row
    - **Validates: Requirements 4.1, 4.2**

- [x] 5. Default Workflow Seeding — create `lib/defaultWorkflows.ts`
  - [x] 5.1 Implement CHAT agent 4-phase Instagram DM workflow definition
    - Phase 1: Backlog Clearance (5 steps: scan_dm_backlog, classify_messages, reply_dm_batch×3)
    - Phase 2: Shoutout Selection (2 steps: score_messages, select_shoutouts)
    - Phase 3: Reporting (1 step: send_gmail_report)
    - Phase 4: Ongoing Engagement (1 step: daily_engagement, `repeatIntervalMs=86400000`)
    - _Requirements: 7.3_

  - [x] 5.2 Implement default workflow definitions for all remaining 46 agents
    - Each agent gets at least 1 phase with at least 1 step appropriate to their role
    - Group by corp; derive action strings from agent role (e.g. `blaze` → `generate_hot_take`, `scout` → `fetch_trends`, `judge` → `review_content_compliance`, `banker` → `analyze_revenue`, `sovereign` → `run_intelligence_sweep`)
    - _Requirements: 7.4_

  - [x] 5.3 Implement `seedDefaultWorkflows()` function
    - For each agent in `ALL_AGENT_NAMES`: check if `status='active'` execution already exists; skip if so (idempotent)
    - Call `assignWorkflow(agentName, definition)` for agents without active executions
    - Insert `agent_actions` row with `actionType='workflow_seeded'` for each newly seeded agent
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]\* 5.4 Write property test for seed idempotency
    - **Property 12: Seed Idempotency** — running `seedDefaultWorkflows()` twice must not create duplicate `workflow_executions` rows for any agent
    - **Validates: Requirements 7.2**

- [x] 6. Autopilot Rewrite — update `app/api/cron/autopilot/route.ts`
  - [x] 6.1 Rewrite autopilot GET handler to call `scheduleAllDueAgents()` from `lib/workflowEngine.ts`
    - Keep existing `validateCronSecret` guard
    - Keep existing platform-enabled checks (`igEnabled`, `xEnabled`, `liEnabled`, `fbEnabled`) and blocked-action inserts
    - Keep existing `agent_actions` summary log (`autopilot_tick`)
    - Replace the `hit()` fan-out loop with a single `scheduleAllDueAgents()` call
    - Return `{ ok, agentsRun, stepsExecuted }` alongside existing platform status fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Workflow API Routes
  - [x] 7.1 Create `app/api/workflows/route.ts` (GET list, POST create/assign)
    - GET: query all `workflow_definitions` joined with `workflow_executions`; return list with execution state
    - POST: validate `agentName` in `ALL_AGENT_NAMES` (400 if not); validate phases/steps non-empty (400 if not); validate each step `action` is non-empty string; set `createdBy='founder'` server-side; call `assignWorkflow()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.1, 10.2, 10.3, 10.4_

  - [x] 7.2 Create `app/api/workflows/[agentName]/route.ts` (GET state, DELETE deactivate)
    - GET: read KV state via `getAgentWorkflowState(agentName)`; fall back to DB if KV miss
    - DELETE: set execution `status='paused'` and definition `is_active=false`; update KV
    - _Requirements: 6.1, 6.5, 4.4_

  - [x] 7.3 Create `app/api/workflows/[agentName]/execute/route.ts` (POST manual trigger)
    - POST: call `executeStep(agentName)` then `advanceCursor(agentName, result)` regardless of `next_run_at`
    - Return step result
    - _Requirements: 6.6_

  - [x] 7.4 Create `app/api/monitor/live/route.ts` (GET all agent KV states)
    - Read KV state for all agents in `ALL_AGENT_NAMES` via `getAgentWorkflowState`
    - Return map of `agentName → AgentWorkflowKV | null`
    - _Requirements: 4.2, 8.8_

  - [x] 7.5 Create `app/api/admin/seed-workflows/route.ts` (POST run seed)
    - POST: call `seedDefaultWorkflows()` from `lib/defaultWorkflows.ts`
    - Require `validateCronSecret` or admin session check
    - Return `{ ok, seeded: number }`
    - _Requirements: 7.1, 7.2_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Workflow Editor UI — create `app/settings/workflows/page.tsx`
  - [x] 9.1 Create the page with auth guard and agent selector
    - Server component shell with `getServerSession` redirect if unauthenticated
    - Agent selector dropdown showing all 47 agents grouped by their 9 corps
    - On select: fetch current workflow state from `GET /api/workflows/[agentName]`
    - _Requirements: 5.1, 5.2_

  - [x] 9.2 Implement phase and step builder
    - Add/remove/reorder phases; set `repeatIntervalMs` per phase
    - Add/remove/reorder steps per phase; fields: action string, params (JSON textarea), `durationEstimateMs`, retry toggle
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 9.3 Implement assign button and live execution state display
    - "Assign to Agent" button POSTs to `/api/workflows`; show success/error toast
    - Display current phase name, step name, status badge, progress bar, last/next run times per agent
    - _Requirements: 5.6, 5.7_

  - [x] 9.4 Add "Workflows" link to settings navigation
    - Update `app/settings/page.tsx` or the settings nav component to include a link to `/settings/workflows`
    - _Requirements: 5.1_

- [x] 10. 3D Retro Office — create `components/Office3D/`
  - [x] 10.1 Install dependencies and create component scaffold
    - Install `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`
    - Create `components/Office3D/index.tsx` as the main export
    - Create `components/Office3D/types.ts` with `Office3DRoom` and `Office3DAgent` interfaces from design
    - _Requirements: 8.1, 8.2_

  - [x] 10.2 Implement 9 themed room geometries in a 3×3 grid
    - Each room: box-geometry space with low-poly retro furniture using `@react-three/drei` primitives
    - Rooms: `war_room` (XForce), `boardroom` (LinkedElite), `studio` (GramGod), `server_room` (WebBoss), `command_center` (IntelCore), `people_hub` (HRForce), `compliance` (LegalShield), `finance_floor` (FinanceDesk), `community_hall` (PagePower)
    - Apply emissive glow/pulse to rooms with `isActive=true`
    - _Requirements: 8.1, 8.9_

  - [x] 10.3 Implement low-poly agent characters with animation states
    - Each agent: simple low-poly humanoid mesh (box body, sphere head) with unique `color`
    - Animation states: `idle` (standing/wandering), `typing` (arm movement at desk), `celebrating` (jump), `error` (head-in-hands + red indicator), `sleeping` (slumped)
    - Map workflow `status` → animation: `'active'` → `'typing'`, `'idle'`/`'completed'` → `'idle'`, `'error'` → `'error'`
    - _Requirements: 8.3, 8.4, 8.5, 8.11_

  - [x] 10.4 Implement floating speech bubbles, name tags, and click side panel
    - Use `@react-three/drei` `<Html>` or `<Billboard>` for speech bubbles showing `currentStep` when typing
    - Always show agent name tag
    - On agent click: render HTML overlay side panel with workflow name, current phase, current step, progress %, last run, next run
    - _Requirements: 8.6, 8.7_

  - [x] 10.5 Implement isometric camera and `/api/monitor/live` polling
    - Default orthographic/isometric camera with `<OrbitControls>` constrained for isometric feel
    - Click room → camera lerps to room center; click agent → camera lerps to agent
    - Poll `GET /api/monitor/live` every 5 seconds via `useEffect`/`setInterval`; map `AgentWorkflowKV` status to `animationState`
    - _Requirements: 8.8, 8.10_

  - [ ]\* 10.6 Write property test for pixel agent state mapping
    - **Property 13: Pixel Agent State Reflects Workflow State** — for any workflow status input, agent `animationState` matches the mapping rule
    - **Property 14: Speech Bubble Content** — any agent in `'typing'` state with non-empty `currentStep` renders a speech bubble with that step name
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6**

- [x] 11. Wire Up Dashboard — swap OfficeCanvas for Office3D
  - [x] 11.1 Update the dashboard page to import and render `Office3D` instead of `OfficeCanvas`
    - Find the dashboard page that renders `OfficeCanvas` and replace the import + JSX
    - `Office3D` self-polls `/api/monitor/live` so no additional props needed
    - _Requirements: 8.2_

- [x] 12. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` — install with `npm install --save-dev fast-check`
- `workflow_executions.next_run_at` must be indexed — add via raw SQL in the migration at `/api/admin/migrate`
- `lib/workflowState.ts` reuses the same CF KV REST API pattern as `lib/agentState.ts` (same env vars, different key prefix `workflow:` vs `agent:`)
- The autopilot rewrite keeps all existing platform-enabled checks and blocked-action logging intact
- `lib/defaultWorkflows.ts` seed is idempotent and safe to re-run; trigger via `POST /api/admin/seed-workflows`
