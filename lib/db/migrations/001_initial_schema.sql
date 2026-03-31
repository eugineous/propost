-- ProPost Empire — Initial Schema
-- Migration 001: All 13 core tables

CREATE TABLE IF NOT EXISTS agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  tier           SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  company        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'idle',
  config         JSONB DEFAULT '{}',
  last_heartbeat TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  ceo_agent    TEXT NOT NULL,
  platform     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name          TEXT NOT NULL,
  context_summary     TEXT NOT NULL,
  related_action_ids  UUID[],
  platform            TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'disconnected',
  last_verified TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  scopes        TEXT[],
  error_message TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL,
  metric_type   TEXT NOT NULL,
  value         BIGINT NOT NULL,
  post_id       TEXT,
  snapshot_date DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

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
);

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
);

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_pillars (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  schedule_config JSONB NOT NULL,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
