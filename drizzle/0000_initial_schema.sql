-- ProPost Empire — Initial Schema
-- Run this ONCE to create all tables in your Neon Postgres database.
-- Execute via: GET /api/admin/migrate  (requires x-internal-secret header)

CREATE TABLE IF NOT EXISTS posts (
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
);

CREATE TABLE IF NOT EXISTS messages (
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
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  company TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  outcome TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  followers INTEGER,
  impressions BIGINT,
  engagement_rate NUMERIC,
  posts_published INTEGER,
  replies_sent INTEGER,
  UNIQUE (date, platform)
);

CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_text TEXT NOT NULL,
  volume INTEGER,
  region TEXT DEFAULT 'KE',
  source TEXT,
  relevance_score NUMERIC,
  actioned BOOLEAN DEFAULT FALSE,
  actioned_by TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  learning_type TEXT,
  content TEXT NOT NULL,
  confidence_score NUMERIC,
  source_post_ids UUID[],
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
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
);

CREATE TABLE IF NOT EXISTS crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL,
  platform TEXT,
  description TEXT NOT NULL,
  trigger JSONB,
  status TEXT DEFAULT 'active',
  paused_corps TEXT[],
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_actions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type ON agent_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);
CREATE INDEX IF NOT EXISTS idx_trends_detected ON trends(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
