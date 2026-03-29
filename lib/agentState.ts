// ============================================================
// ProPost Empire — Cloudflare KV Agent State Management
// ============================================================

import { AgentStateKV, Corp } from '@/lib/types'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_KV_AGENT_STATE_ID = process.env.CF_KV_AGENT_STATE_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!

const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_AGENT_STATE_ID}/values`

const DEFAULT_STATE: AgentStateKV = {
  lastRunAt: '',
  lastOutcome: '',
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

export async function pauseAgent(agentName: string, reason: string): Promise<void> {
  await setAgentState(agentName, { isPaused: true, pauseReason: reason })
}

export async function resumeAgent(agentName: string): Promise<void> {
  const current = await getAgentState(agentName)
  const updated: AgentStateKV = { ...current, isPaused: false, pauseReason: undefined }
  await kvPut(agentKey(agentName), updated)
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
  // IntelCore
  'sovereign', 'oracle', 'memory', 'sentry', 'scribe',
  // XForce
  'zara', 'blaze', 'scout', 'echo', 'hawk', 'lumen', 'pixel_x',
  // LinkedElite
  'nova', 'orator', 'bridge', 'atlas', 'deal_li', 'graph',
  // GramGod
  'aurora', 'vibe', 'chat', 'deal_ig', 'lens',
  // PagePower
  'chief', 'pulse', 'community', 'reach',
  // WebBoss
  'root', 'crawl', 'build', 'shield', 'speed',
]

const CORP_AGENT_MAP: Record<Corp, string[]> = {
  intelcore: ['sovereign', 'oracle', 'memory', 'sentry', 'scribe'],
  xforce: ['zara', 'blaze', 'scout', 'echo', 'hawk', 'lumen', 'pixel_x'],
  linkedelite: ['nova', 'orator', 'bridge', 'atlas', 'deal_li', 'graph'],
  gramgod: ['aurora', 'vibe', 'chat', 'deal_ig', 'lens'],
  pagepower: ['chief', 'pulse', 'community', 'reach'],
  webboss: ['root', 'crawl', 'build', 'shield', 'speed'],
}
