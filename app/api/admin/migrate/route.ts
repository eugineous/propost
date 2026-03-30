export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — One-shot DB bootstrap
// GET /api/admin/migrate  (requires x-internal-secret header)
// Run ONCE after first deployment to create all tables.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      media_urls TEXT[],
      status TEXT NOT NULL DEFAULT 'draft',
      platform_id TEXT,
      published_at TIMESTAMPTZ,
      scheduled_at TIMESTAMPTZ,
      agent_name TEXT NOT NULL,
      hawk_approved BOOLEAN DEFAULT FALSE,
      hawk_risk_score INTEGER,
      impressions BIGINT DEFAULT 0,
      likes INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      new_followers INTEGER DEFAULT 0,
      lessons_extracted TEXT,
      content_type TEXT,
      topic_category TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform TEXT NOT NULL,
      platform_msg_id TEXT UNIQUE,
      sender_id TEXT NOT NULL,
      sender_username TEXT,
      sender_gender TEXT,
      content TEXT NOT NULL,
      reply_content TEXT,
      message_location TEXT DEFAULT 'inbox',
      response_time_ms INTEGER,
      is_brand_deal BOOLEAN DEFAULT FALSE,
      deal_value_est NUMERIC,
      status TEXT DEFAULT 'pending',
      received_at TIMESTAMPTZ NOT NULL,
      replied_at TIMESTAMPTZ,
      agent_name TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS agent_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_name TEXT NOT NULL,
      company TEXT NOT NULL,
      action_type TEXT NOT NULL,
      details JSONB,
      outcome TEXT,
      tokens_used INTEGER,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS daily_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      platform TEXT NOT NULL,
      followers INTEGER,
      impressions BIGINT,
      engagement_rate NUMERIC,
      posts_published INTEGER,
      replies_sent INTEGER,
      UNIQUE (date, platform)
    )`,

    `CREATE TABLE IF NOT EXISTS trends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trend_text TEXT NOT NULL,
      volume INTEGER,
      region TEXT DEFAULT 'KE',
      source TEXT,
      relevance_score NUMERIC,
      actioned BOOLEAN DEFAULT FALSE,
      actioned_by TEXT,
      detected_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS agent_learnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_name TEXT NOT NULL,
      learning_type TEXT,
      content TEXT NOT NULL,
      confidence_score NUMERIC,
      source_post_ids UUID[],
      applied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT,
      platform TEXT,
      source TEXT,
      sender_id TEXT,
      details JSONB,
      estimated_value NUMERIC,
      status TEXT DEFAULT 'new',
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS crisis_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      level INTEGER NOT NULL,
      platform TEXT,
      description TEXT NOT NULL,
      trigger JSONB,
      status TEXT DEFAULT 'active',
      paused_corps TEXT[],
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`,

    // Computed columns on posts (safe to run multiple times)
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS performance_score NUMERIC
      GENERATED ALWAYS AS (
        (impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)
      ) STORED`,

    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS performance_tier TEXT
      GENERATED ALWAYS AS (
        CASE
          WHEN ((impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)) > 500 THEN 'VIRAL'
          WHEN ((impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)) >= 100 THEN 'GOOD'
          ELSE 'WEAK'
        END
      ) STORED`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_actions_agent   ON agent_actions(agent_name)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_actions_type    ON agent_actions(action_type)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_platform        ON posts(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_status          ON posts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_scheduled       ON posts(scheduled_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_status       ON messages(status)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_platform     ON messages(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_trends_detected       ON trends(detected_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_daily_metrics_date    ON daily_metrics(date DESC)`,

    // ── Workflow Engine Tables ────────────────────────────────
    `CREATE TABLE IF NOT EXISTS workflow_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_name TEXT NOT NULL,
      corp TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      definition JSONB NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_by TEXT DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS workflow_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID REFERENCES workflow_definitions(id),
      agent_name TEXT NOT NULL UNIQUE,
      current_phase_index INTEGER DEFAULT 0,
      current_step_index INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ NOT NULL,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      completed_phases JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // ── Platform Connections (OAuth tokens) ──────────────────────
    `CREATE TABLE IF NOT EXISTS platform_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      scope TEXT,
      platform_user_id TEXT,
      platform_username TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_workflow_executions_next_run ON workflow_executions(next_run_at)`,
    `CREATE INDEX IF NOT EXISTS idx_workflow_executions_status   ON workflow_executions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_workflow_executions_agent    ON workflow_executions(agent_name)`,

    // Notify trigger for live activity feed
    `CREATE OR REPLACE FUNCTION notify_activity_feed()
     RETURNS TRIGGER AS $$
     BEGIN
       PERFORM pg_notify('activity_feed', row_to_json(NEW)::text);
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql`,

    `DROP TRIGGER IF EXISTS agent_action_notify ON agent_actions`,
    `CREATE TRIGGER agent_action_notify
     AFTER INSERT ON agent_actions
     FOR EACH ROW EXECUTE FUNCTION notify_activity_feed()`,
  ]

  const results: Array<{ sql: string; ok: boolean; error?: string }> = []

  for (const stmt of statements) {
    const label = stmt.trim().slice(0, 60).replace(/\s+/g, ' ')
    try {
      await db.execute(sql.raw(stmt))
      results.push({ sql: label, ok: true })
    } catch (err) {
      results.push({ sql: label, ok: false, error: String(err) })
    }
  }

  const failed = results.filter((r) => !r.ok)
  return NextResponse.json({
    ok: failed.length === 0,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  })
}
