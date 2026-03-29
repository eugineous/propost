// ============================================================
// ProPost Empire — Cloudflare KV Agent State Management
// ============================================================

import { AgentStateKV, Corp } from '@/lib/types'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_KV_AGENT_STATE_ID = process.env.CF_KV_AGENT_STATE_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!

const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_AGENT_STATE_ID}/values`

const DEFAULT_STATE: AgentStateKV = {
  lastRunAt: '',
  lastOutcome: '',
  currentState: 'idle',
  previousState: 'idle',
  stateChangedAt: new Date(0).toISOString(),
  rateLimitCounters: { postsToday: 0, repliesToday: 0, followsToday: 0 },
  isPaused: false,
}

function agentKey(agentName: string): string {
  return `agent:${agentName}:state`
}

async function kvGet(key: string): Promise<AgentStateKV | null> {
  const res = await fetch(`${KV_BASE_URL}/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`KV GET failed: ${res.status} ${await res.text()}`)
  const text = await res.text()
  try {
    return JSON.parse(text) as AgentStateKV
  } catch {
    return null
  }
}

async function kvPut(key: string, value: AgentStateKV): Promise<void> {
  const res = await fetch(`${KV_BASE_URL}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  })
  if (!res.ok) throw new Error(`KV PUT failed: ${res.status} ${await res.text()}`)
}

export async function getAgentState(agentName: string): Promise<AgentStateKV> {
  const state = await kvGet(agentKey(agentName))
  return state ?? { ...DEFAULT_STATE }
}

export async function setAgentState(agentName: string, patch: Partial<AgentStateKV>): Promise<void> {
  const current = await getAgentState(agentName)
  const updated: AgentStateKV = { ...current, ...patch }
  await kvPut(agentKey(agentName), updated)
}

async function emitAgentStateChange(
  agentName: string,
  prevState: string,
  newState: string,
  reason?: string
): Promise<void> {
  const company = Object.entries(CORP_AGENT_MAP).find(([, agents]) => agents.includes(agentName))?.[0] ?? 'intelcore'
  await db.insert(agentActions).values({
    agentName,
    company,
    actionType: 'agent_state_change',
    details: {
      summary: `${agentName} ${prevState} -> ${newState}${reason ? ` (${reason})` : ''}`,
      prevState,
      newState,
      reason: reason ?? null,
    },
    outcome: 'success',
  })
}

async function transitionAgentState(
  agentName: string,
  newState: 'idle' | 'active' | 'blocked' | 'error' | 'paused',
  reason?: string
): Promise<void> {
  const current = await getAgentState(agentName)
  const prev = current.currentState ?? 'idle'
  const now = new Date().toISOString()
  await kvPut(agentKey(agentName), {
    ...current,
    previousState: prev,
    currentState: newState,
    stateChangedAt: now,
    isPaused: newState === 'paused' ? true : current.isPaused,
    pauseReason: newState === 'paused' ? reason : current.pauseReason,
  })
  await emitAgentStateChange(agentName, prev, newState, reason)
}

export async function setAgentActive(agentName: string, reason?: string): Promise<void> {
  await transitionAgentState(agentName, 'active', reason)
}

export async function setAgentIdle(agentName: string, reason?: string): Promise<void> {
  await transitionAgentState(agentName, 'idle', reason)
}

export async function setAgentBlocked(agentName: string, reason?: string): Promise<void> {
  await transitionAgentState(agentName, 'blocked', reason)
}

export async function setAgentError(agentName: string, reason?: string): Promise<void> {
  await transitionAgentState(agentName, 'error', reason)
}

export async function pauseAgent(agentName: string, reason: string): Promise<void> {
  await transitionAgentState(agentName, 'paused', reason)
}

export async function resumeAgent(agentName: string): Promise<void> {
  const current = await getAgentState(agentName)
  const updated: AgentStateKV = {
    ...current,
    isPaused: false,
    pauseReason: undefined,
    previousState: current.currentState ?? 'paused',
    currentState: 'idle',
    stateChangedAt: new Date().toISOString(),
  }
  await kvPut(agentKey(agentName), updated)
  await emitAgentStateChange(agentName, current.currentState ?? 'paused', 'idle', 'resume')
}

export async function incrementRateLimit(
  agentName: string,
  type: 'postsToday' | 'repliesToday' | 'followsToday'
): Promise<void> {
  const current = await getAgentState(agentName)
  const updated: AgentStateKV = {
    ...current,
    rateLimitCounters: {
      ...current.rateLimitCounters,
      [type]: current.rateLimitCounters[type] + 1,
    },
  }
  await kvPut(agentKey(agentName), updated)
}

export async function isAgentPaused(agentName: string): Promise<boolean> {
  const state = await getAgentState(agentName)
  return state.isPaused
}

export async function pauseAllAgents(reason: string): Promise<void> {
  await Promise.all(ALL_AGENT_NAMES.map((name) => pauseAgent(name, reason)))
}

export async function resumeAllAgents(): Promise<void> {
  await Promise.all(ALL_AGENT_NAMES.map((name) => resumeAgent(name)))
}

export async function pauseCorpAgents(corp: Corp, reason: string): Promise<void> {
  const agents = CORP_AGENT_MAP[corp] ?? []
  await Promise.all(agents.map((name) => pauseAgent(name, reason)))
}

// ── Agent Name Registry ───────────────────────────────────────

export const ALL_AGENT_NAMES: string[] = [
  // IntelCore (5)
  'sovereign', 'oracle', 'memory', 'sentry', 'scribe',
  // XForce (13)
  'zara', 'blaze', 'scout', 'echo', 'hawk', 'lumen', 'pixel_x',
  'thunder', 'surge', 'flint', 'nova_x', 'forge', 'trace',
  // LinkedElite (10)
  'nova', 'orator', 'bridge', 'atlas', 'deal_li', 'graph',
  'voice', 'prism', 'mentor', 'amplify',
  // GramGod (12)
  'aurora', 'vibe', 'chat', 'deal_ig', 'lens',
  'reel', 'story', 'caption', 'hashtag', 'tribe', 'fanbase', 'rescue',
  // PagePower (4)
  'chief', 'pulse', 'community', 'reach',
  // WebBoss (5)
  'root', 'crawl', 'build', 'shield', 'speed',
  // HRForce (12)
  'people', 'welfare', 'rotate', 'discipline', 'reward', 'brief',
  'onboard', 'culture', 'train', 'eval', 'social', 'advocate',
  // LegalShield (9)
  'judge', 'policy', 'risk', 'copyright', 'gdpr', 'defame', 'shadow', 'appeal', 'counsel',
  // FinanceDesk (10)
  'banker', 'deal', 'rate', 'invoice', 'sponsor', 'revenue', 'pitch', 'collab', 'grants', 'forecast',
]

const CORP_AGENT_MAP: Record<Corp, string[]> = {
  intelcore: ['sovereign', 'oracle', 'memory', 'sentry', 'scribe'],
  xforce: ['zara', 'blaze', 'scout', 'echo', 'hawk', 'lumen', 'pixel_x', 'thunder', 'surge', 'flint', 'nova_x', 'forge', 'trace'],
  linkedelite: ['nova', 'orator', 'bridge', 'atlas', 'deal_li', 'graph', 'voice', 'prism', 'mentor', 'amplify'],
  gramgod: ['aurora', 'vibe', 'chat', 'deal_ig', 'lens', 'reel', 'story', 'caption', 'hashtag', 'tribe', 'fanbase', 'rescue'],
  pagepower: ['chief', 'pulse', 'community', 'reach'],
  webboss: ['root', 'crawl', 'build', 'shield', 'speed'],
  hrforce: ['people', 'welfare', 'rotate', 'discipline', 'reward', 'brief', 'onboard', 'culture', 'train', 'eval', 'social', 'advocate'],
  legalshield: ['judge', 'policy', 'risk', 'copyright', 'gdpr', 'defame', 'shadow', 'appeal', 'counsel'],
  financedesk: ['banker', 'deal', 'rate', 'invoice', 'sponsor', 'revenue', 'pitch', 'collab', 'grants', 'forecast'],
}
