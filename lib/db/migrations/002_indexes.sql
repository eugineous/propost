-- ProPost Empire — Performance Indexes
-- Migration 002: Indexes on all hot query paths

-- tasks: most queried by status, company, agent, platform
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_platform ON tasks(platform);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON tasks(scheduled_at);

-- actions: queried by platform+timestamp for HAWK rate limiting (hot path)
CREATE INDEX IF NOT EXISTS idx_actions_platform_timestamp ON actions(platform, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_actions_agent_name ON actions(agent_name);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp DESC);

-- content_queue: queried by status+scheduled_at for cron scheduler
CREATE INDEX IF NOT EXISTS idx_content_queue_status_scheduled ON content_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_queue_platform ON content_queue(platform);

-- memory_entries: queried by agent_name and created_at
CREATE INDEX IF NOT EXISTS idx_memory_agent_name ON memory_entries(agent_name);
CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_platform ON memory_entries(platform);

-- approval_queue: queried by status (pending items)
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_created_at ON approval_queue(created_at DESC);

-- analytics_snapshots: queried by platform+date
CREATE INDEX IF NOT EXISTS idx_analytics_platform_date ON analytics_snapshots(platform, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metric_type ON analytics_snapshots(metric_type);

-- fallback_log: queried by platform and created_at
CREATE INDEX IF NOT EXISTS idx_fallback_log_platform ON fallback_log(platform);
CREATE INDEX IF NOT EXISTS idx_fallback_log_created_at ON fallback_log(created_at DESC);

-- conversations: queried by agent_name
CREATE INDEX IF NOT EXISTS idx_conversations_agent_name ON conversations(agent_name);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- agents: queried by status for health monitor
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company);
