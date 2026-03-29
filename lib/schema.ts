import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  numeric,
  date,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Posts ─────────────────────────────────────────────────────
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: text('platform').notNull(), // x | instagram | linkedin | facebook
  content: text('content').notNull(),
  mediaUrls: text('media_urls').array(),
  status: text('status').notNull().default('draft'), // draft|scheduled|published|failed|blocked
  platformId: text('platform_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  agentName: text('agent_name').notNull(),
  hawkApproved: boolean('hawk_approved').default(false),
  hawkRiskScore: integer('hawk_risk_score'),
  impressions: bigint('impressions', { mode: 'number' }).default(0),
  likes: integer('likes').default(0),
  reposts: integer('reposts').default(0),
  replies: integer('replies').default(0),
  newFollowers: integer('new_followers').default(0),
  // performance_score and performance_tier are computed columns — managed via raw SQL migration
  lessonsExtracted: text('lessons_extracted'),
  contentType: text('content_type'), // thread|hot_take|story|carousel|video
  topicCategory: text('topic_category'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Messages (DMs, comments) ──────────────────────────────────
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: text('platform').notNull(),
  platformMsgId: text('platform_msg_id').unique(),
  senderId: text('sender_id').notNull(),
  senderUsername: text('sender_username'),
  senderGender: text('sender_gender'),
  content: text('content').notNull(),
  replyContent: text('reply_content'),
  messageLocation: text('message_location').default('inbox'), // inbox | message_request
  responseTimeMs: integer('response_time_ms'),
  isBrandDeal: boolean('is_brand_deal').default(false),
  dealValueEst: numeric('deal_value_est'),
  status: text('status').default('pending'), // pending|replied|escalated|ignored
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  agentName: text('agent_name'),
})

// ── Agent Actions (audit log) ─────────────────────────────────
export const agentActions = pgTable('agent_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentName: text('agent_name').notNull(),
  company: text('company').notNull(),
  actionType: text('action_type').notNull(),
  details: jsonb('details'),
  outcome: text('outcome'), // success|blocked|error|pending_human
  tokensUsed: integer('tokens_used'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Daily Metrics ─────────────────────────────────────────────
export const dailyMetrics = pgTable(
  'daily_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    platform: text('platform').notNull(),
    followers: integer('followers'),
    impressions: bigint('impressions', { mode: 'number' }),
    engagementRate: numeric('engagement_rate'),
    postsPublished: integer('posts_published'),
    repliesSent: integer('replies_sent'),
  },
  (t) => ({ uniq: unique().on(t.date, t.platform) })
)

// ── Trends ────────────────────────────────────────────────────
export const trends = pgTable('trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  trendText: text('trend_text').notNull(),
  volume: integer('volume'),
  region: text('region').default('KE'),
  source: text('source'), // x_trending|google_trends|news
  relevanceScore: numeric('relevance_score'),
  actioned: boolean('actioned').default(false),
  actionedBy: text('actioned_by'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Agent Learnings ───────────────────────────────────────────
export const agentLearnings = pgTable('agent_learnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentName: text('agent_name').notNull(),
  learningType: text('learning_type'), // voice|timing|format|topic|engagement
  content: text('content').notNull(),
  confidenceScore: numeric('confidence_score'),
  sourcePostIds: uuid('source_post_ids').array(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Opportunities ─────────────────────────────────────────────
export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type'), // brand_deal|collaboration|speaking|media|other
  platform: text('platform'),
  source: text('source'),
  senderId: text('sender_id'),
  details: jsonb('details'),
  estimatedValue: numeric('estimated_value'),
  status: text('status').default('new'), // new|reviewing|accepted|rejected|expired
  detectedAt: timestamp('detected_at', { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Crisis Events ─────────────────────────────────────────────
export const crisisEvents = pgTable('crisis_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  level: integer('level').notNull(), // 1|2|3
  platform: text('platform'),
  description: text('description').notNull(),
  trigger: jsonb('trigger'),
  status: text('status').default('active'), // active|acknowledged|resolved
  pausedCorps: text('paused_corps').array(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).default(sql`NOW()`),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})
