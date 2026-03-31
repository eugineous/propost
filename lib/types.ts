// ============================================================
// ProPost Empire — Core Type Definitions
// ============================================================

export type Corp =
  | 'xforce'
  | 'linkedelite'
  | 'gramgod'
  | 'pagepower'
  | 'webboss'
  | 'intelcore'
  | 'hrforce'
  | 'legalshield'
  | 'financedesk'

export type AgentModel = 'gemini-2.5-pro' | 'nvidia-nim'

export type AgentOutcome = 'success' | 'blocked' | 'error' | 'pending_human'

export type ActivityEventType =
  | 'agent_action'
  | 'post_published'
  | 'post_failed'
  | 'dm_received'
  | 'dm_replied'
  | 'comment_replied'
  | 'comment_moderated'
  | 'agent_state_change'
  | 'trend_detected'
  | 'crisis_alert'
  | 'hawk_block'
  | 'opportunity'
  | 'metric_update'

export type Platform = 'x' | 'instagram' | 'linkedin' | 'facebook'

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'blocked'

export type PerformanceTier = 'VIRAL' | 'GOOD' | 'WEAK'

export type CrisisLevel = 1 | 2 | 3

// ── Agent Infrastructure ──────────────────────────────────────

export interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required: string[]
  }
}

export interface AgentContext {
  agentName: string
  company: Corp
  systemPrompt: string
  tools: GeminiFunctionDeclaration[]
  model: AgentModel
}

export interface AgentResult {
  agentName: string
  action: string
  outcome: AgentOutcome
  data: Record<string, unknown>
  tokensUsed: number
  durationMs: number
}

export interface CommandRoute {
  intent: string
  targetCorp: Corp
  targetAgent: string
  parameters: Record<string, unknown>
  priority: 'urgent' | 'normal' | 'background' | 'pending_human'
}

// ── Cloudflare KV State ───────────────────────────────────────

export interface AgentStateKV {
  lastRunAt: string
  lastOutcome: string
  currentState?: 'idle' | 'active' | 'blocked' | 'error' | 'paused'
  previousState?: 'idle' | 'active' | 'blocked' | 'error' | 'paused'
  stateChangedAt?: string
  rateLimitCounters: {
    postsToday: number
    repliesToday: number
    followsToday: number
  }
  isPaused: boolean
  pauseReason?: string
}

export interface SessionKV {
  userId: string
  email: string
  accessToken: string
  expiresAt: number
}

export interface TrendCacheKV {
  trends: Array<{ text: string; volume: number }>
  fetchedAt: string
}

// ── HAWK ──────────────────────────────────────────────────────

export interface HawkDecision {
  approved: boolean
  blockedReasons: string[]
  riskScore: number // 0–100
  modifications?: string
}

// ── X / Twitter ───────────────────────────────────────────────

export interface XPostRequest {
  content: string
  mediaUrls?: string[]
  replyToId?: string
  scheduledAt?: Date
}

export interface XPostResult {
  tweetId: string
  url: string
  publishedAt: Date
  hawkApproval: HawkDecision
}

// ── Instagram / CHAT ──────────────────────────────────────────

export interface IGMessage {
  id: string
  senderId: string
  text: string
  timestamp: Date
}

export interface DMContext {
  senderId: string
  senderUsername: string
  messageText: string
  receivedAt: Date
  threadHistory: IGMessage[]
}

export interface ChatDecision {
  responseText: string
  isBrandDeal: boolean
  detectedTone: 'friendly' | 'professional' | 'hostile' | 'spam'
  detectedGender: 'male' | 'female' | 'unknown'
  escalateTo: 'DEAL' | 'EUGINE' | null
  responseTimeMs: number
}

// ── Activity Feed ─────────────────────────────────────────────

export interface ActivityEvent {
  type: ActivityEventType
  agentName: string
  company: Corp
  summary: string
  data: Record<string, unknown>
  timestamp: string
}

// ── API Contracts ─────────────────────────────────────────────

export interface CommandRequest {
  text: string
  attachments?: string[]
}

export interface CommandResponse {
  commandId: string
  intent: string
  routedTo: { corp: Corp; agent: string }
  status: 'executing' | 'queued' | 'blocked_by_hawk' | 'needs_human'
  preview?: string
  estimatedCompletionMs?: number
}

export interface OverrideRequest {
  command: 'PAUSE' | 'RESUME' | 'OVERRIDE' | 'STATUS'
  scope: 'all' | Corp | string
  reason?: string
  content?: string
}

export interface OverrideResponse {
  applied: boolean
  affectedAgents: string[]
  message: string
}

// ── Crisis ────────────────────────────────────────────────────

export interface CrisisTrigger {
  level: CrisisLevel
  description: string
  pauseScope: 'none' | Corp | 'all'
  notifyEugine: boolean
}

// ── Performance ───────────────────────────────────────────────

export interface PostMetrics {
  impressions: number
  likes: number
  reposts: number
  replies: number
  newFollowers: number
}

// ── Canvas / Pixel Art ────────────────────────────────────────

export type CharacterState = 'idle' | 'active' | 'blocked' | 'paused'

export interface CanvasAgent {
  name: string
  state: CharacterState
  animFrame: number
  position: { x: number; y: number }
  lastAction?: string
}

export interface CanvasRoom {
  corp: Corp
  label: string
  position: { x: number; y: number; w: number; h: number }
  agents: CanvasAgent[]
  color: string
}
