export type Platform = 'x' | 'instagram' | 'facebook' | 'linkedin' | 'website'

export type ContentPillar =
  | 'ai_news'
  | 'youth_empowerment'
  | 'trending_topics'
  | 'elite_conversations'
  | 'kenyan_entertainment'
  | 'fashion'
  | 'media_journalism'
  | 'personal_story'
  | 'entrepreneurship'
  | 'culture_identity'

export type TaskType =
  | 'post_content'
  | 'reply'
  | 'dm_response'
  | 'thread_publish'
  | 'reel_publish'
  | 'story_publish'
  | 'article_publish'
  | 'blog_publish'
  | 'analytics_pull'
  | 'trend_analysis'
  | 'seo_audit'
  | 'health_check'
  | 'memory_store'
  | 'report_generate'

export type TaskStatus =
  | 'queued'
  | 'assigned'
  | 'active'
  | 'pending_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'unresponsive'

export type Company =
  | 'xforce'
  | 'linkedelite'
  | 'gramgod'
  | 'pagepower'
  | 'webboss'
  | 'intelcore'
  | 'system'

export type AITask = 'plan' | 'draft' | 'analyze' | 'summarize' | 'generate' | 'validate'

export interface Task {
  id: string
  type: TaskType
  company: Company
  platform?: Platform
  assignedAgent?: string
  parentTaskId?: string
  status: TaskStatus
  priority: 1 | 2 | 3
  contentPillar?: ContentPillar
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  createdAt: Date
}

export interface Action {
  id: string
  taskId?: string
  agentName: string
  company: Company
  platform: Platform
  actionType: string
  content?: string
  status: 'success' | 'failed' | 'pending'
  platformPostId?: string
  platformResponse?: unknown
  timestamp: Date
}

export interface MemoryEntry {
  id: string
  agentName: string
  contextSummary: string
  relatedActionIds?: string[]
  platform?: Platform
  tags?: string[]
  createdAt: Date
}

export interface ApprovalQueueItem {
  id: string
  taskId?: string
  actionType: string
  platform?: Platform
  agentName: string
  content?: string
  contentPreview?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore?: number
  failureContext?: unknown
  status: 'pending' | 'approved' | 'rejected' | 'edited'
  founderNote?: string
  editedContent?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface PlatformConnection {
  id: string
  platform: Platform
  status: 'connected' | 'disconnected' | 'expired' | 'error'
  lastVerified?: Date
  expiresAt?: Date
  scopes?: string[]
  errorMessage?: string
  updatedAt: Date
}

export interface FounderMessage {
  content: string
  agentName?: string
}

export interface AgentResponse {
  content: string
  agentName: string
  taskId?: string
}

export interface ActivityEvent {
  id: string
  type: 'post' | 'reply' | 'dm' | 'task_complete' | 'alert' | 'approval'
  agentName: string
  company: Company
  platform?: Platform
  contentPreview?: string
  timestamp: string
  postId?: string
}

export interface AgentStatusEvent {
  agentName: string
  status: AgentStatus
  currentTask?: string
  lastActionTime?: string
}
