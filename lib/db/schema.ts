// Raw SQL schema definitions for all ProPost tables
// Each table is defined as a CREATE TABLE IF NOT EXISTS string for idempotent migrations

export const CREATE_AGENTS = `
CREATE TABLE IF NOT EXISTS agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  tier           SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  company        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'idle',
  config         JSONB DEFAULT '{}',
  last_heartbeat TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_COMPANIES = `
CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  ceo_agent    TEXT NOT NULL,
  platform     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_TASKS = `
CREATE TABLE IF NOT EXISTS tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL,
  company        TEXT NOT NULL,
  platform       TEXT,
  assigned_agent TEXT,
  parent_task_id UUID REFERENCES tasks(id),
  status         TEXT NOT NULL DEFAULT 'queued',
  priority       SMALLINT DEFAULT 2,
  content_pillar TEXT,
  scheduled_at   TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  result         JSONB,
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_ACTIONS = `
CREATE TABLE IF NOT EXISTS actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID REFERENCES tasks(id),
  agent_name        TEXT NOT NULL,
  company           TEXT NOT NULL,
  platform          TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  content           TEXT,
  status            TEXT NOT NULL,
  platform_post_id  TEXT,
  platform_response JSONB,
  timestamp         TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_CONTENT_QUEUE = `
CREATE TABLE IF NOT EXISTS content_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       TEXT NOT NULL,
  content_pillar TEXT NOT NULL,
  content        TEXT NOT NULL,
  media_urls     TEXT[],
  status         TEXT DEFAULT 'draft',
  scheduled_at   TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  action_id      UUID REFERENCES actions(id),
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_MEMORY_ENTRIES = `
CREATE TABLE IF NOT EXISTS memory_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name          TEXT NOT NULL,
  context_summary     TEXT NOT NULL,
  related_action_ids  UUID[],
  platform            TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_PLATFORM_CONNECTIONS = `
CREATE TABLE IF NOT EXISTS platform_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'disconnected',
  last_verified TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  scopes        TEXT[],
  error_message TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_ANALYTICS_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL,
  metric_type   TEXT NOT NULL,
  value         BIGINT NOT NULL,
  post_id       TEXT,
  snapshot_date DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_APPROVAL_QUEUE = `
CREATE TABLE IF NOT EXISTS approval_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id),
  action_type     TEXT NOT NULL,
  platform        TEXT,
  agent_name      TEXT NOT NULL,
  content         TEXT,
  content_preview TEXT,
  risk_level      TEXT NOT NULL DEFAULT 'medium',
  risk_score      SMALLINT,
  failure_context JSONB,
  status          TEXT DEFAULT 'pending',
  founder_note    TEXT,
  edited_content  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);`

export const CREATE_FALLBACK_LOG = `
CREATE TABLE IF NOT EXISTS fallback_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        UUID REFERENCES tasks(id),
  agent_name     TEXT NOT NULL,
  platform       TEXT,
  error_type     TEXT NOT NULL,
  error_message  TEXT NOT NULL,
  fallback_steps JSONB NOT NULL,
  final_outcome  TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_CONVERSATIONS = `
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`

export const CREATE_CONTENT_PILLARS = `
CREATE TABLE IF NOT EXISTS content_pillars (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  schedule_config JSONB NOT NULL,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);`

// All migration statements in dependency order (tasks before actions, actions before content_queue, etc.)
export const ALL_MIGRATIONS = [
  CREATE_AGENTS,
  CREATE_COMPANIES,
  CREATE_TASKS,
  CREATE_ACTIONS,
  CREATE_CONTENT_QUEUE,
  CREATE_MEMORY_ENTRIES,
  CREATE_PLATFORM_CONNECTIONS,
  CREATE_ANALYTICS_SNAPSHOTS,
  CREATE_APPROVAL_QUEUE,
  CREATE_FALLBACK_LOG,
  CREATE_CONVERSATIONS,
  CREATE_CONTENT_PILLARS,
]

// TypeScript row types for each table

export interface AgentRow {
  id: string
  name: string
  tier: number
  company: string
  status: string
  config: Record<string, unknown>
  last_heartbeat: Date | null
  created_at: Date
}

export interface CompanyRow {
  id: string
  name: string
  display_name: string
  ceo_agent: string
  platform: string | null
  active: boolean
  created_at: Date
}

export interface TaskRow {
  id: string
  type: string
  company: string
  platform: string | null
  assigned_agent: string | null
  parent_task_id: string | null
  status: string
  priority: number
  content_pillar: string | null
  scheduled_at: Date | null
  started_at: Date | null
  completed_at: Date | null
  result: unknown | null
  error: string | null
  created_at: Date
}

export interface ActionRow {
  id: string
  task_id: string | null
  agent_name: string
  company: string
  platform: string
  action_type: string
  content: string | null
  status: string
  platform_post_id: string | null
  platform_response: unknown | null
  timestamp: Date
}

export interface ContentQueueRow {
  id: string
  platform: string
  content_pillar: string
  content: string
  media_urls: string[] | null
  status: string
  scheduled_at: Date | null
  published_at: Date | null
  action_id: string | null
  created_by: string
  created_at: Date
}

export interface MemoryEntryRow {
  id: string
  agent_name: string
  context_summary: string
  related_action_ids: string[] | null
  platform: string | null
  tags: string[] | null
  created_at: Date
}

export interface PlatformConnectionRow {
  id: string
  platform: string
  status: string
  last_verified: Date | null
  expires_at: Date | null
  scopes: string[] | null
  error_message: string | null
  updated_at: Date
}

export interface AnalyticsSnapshotRow {
  id: string
  platform: string
  metric_type: string
  value: bigint
  post_id: string | null
  snapshot_date: Date
  created_at: Date
}

export interface ApprovalQueueRow {
  id: string
  task_id: string | null
  action_type: string
  platform: string | null
  agent_name: string
  content: string | null
  content_preview: string | null
  risk_level: string
  risk_score: number | null
  failure_context: unknown | null
  status: string
  founder_note: string | null
  edited_content: string | null
  created_at: Date
  resolved_at: Date | null
}

export interface FallbackLogRow {
  id: string
  task_id: string | null
  agent_name: string
  platform: string | null
  error_type: string
  error_message: string
  fallback_steps: unknown
  final_outcome: string
  created_at: Date
}

export interface ConversationRow {
  id: string
  agent_name: string
  role: string
  content: string
  created_at: Date
}

export interface ContentPillarRow {
  id: string
  name: string
  slug: string
  schedule_config: unknown
  active: boolean
  created_at: Date
}
