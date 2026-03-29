-- Add computed columns for performance scoring on posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC GENERATED ALWAYS AS (
    (impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)
  ) STORED;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS performance_tier TEXT GENERATED ALWAYS AS (
    CASE
      WHEN ((impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)) > 500 THEN 'VIRAL'
      WHEN ((impressions * 0.1) + (likes * 2) + (reposts * 5) + (replies * 3) + (new_followers * 20)) >= 100 THEN 'GOOD'
      ELSE 'WEAK'
    END
  ) STORED;

-- SSE NOTIFY trigger on agent_actions INSERT
CREATE OR REPLACE FUNCTION notify_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('activity_feed', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_action_notify ON agent_actions;
CREATE TRIGGER agent_action_notify
AFTER INSERT ON agent_actions
FOR EACH ROW EXECUTE FUNCTION notify_activity_feed();
