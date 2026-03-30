// ============================================================
// ProPost Empire — Workflow KV State Manager
// Mirrors lib/agentState.ts pattern but for workflow cursors
// Key: workflow:{agentName}:state
// ============================================================

export interface AgentWorkflowKV {
  workflowId: string
  workflowName: string
  currentPhase: string
  currentStep: string
  status: 'active' | 'paused' | 'completed' | 'error' | 'idle'
  lastRunAt: string
  nextRunAt: string
  progress: number // 0–100
}

// In-memory fallback when CF KV is not configured
const memoryWorkflowState: Record<string, AgentWorkflowKV> = {}

function cfConfigured(): boolean {
  return Boolean(
    process.env.CF_ACCOUNT_ID &&
    process.env.CF_KV_AGENT_STATE_ID &&
    process.env.CF_API_TOKEN
  )
}

function kvBaseUrl(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_AGENT_STATE_ID}/values`
}

function workflowKey(agentName: string): string {
  return `workflow:${agentName}:state`
}

export async function getAgentWorkflowState(agentName: string): Promise<AgentWorkflowKV | null> {
  const key = workflowKey(agentName)
  if (!cfConfigured()) return memoryWorkflowState[key] ?? null

  try {
    const res = await fetch(`${kvBaseUrl()}/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}` },
    })
    if (res.status === 404) return memoryWorkflowState[key] ?? null
    if (!res.ok) {
      console.warn(`[workflowState] KV GET failed: ${res.status} — using in-memory fallback`)
      return memoryWorkflowState[key] ?? null
    }
    const text = await res.text()
    return JSON.parse(text) as AgentWorkflowKV
  } catch (err) {
    console.warn(`[workflowState] KV GET error:`, err)
    return memoryWorkflowState[key] ?? null
  }
}

export async function setAgentWorkflowState(agentName: string, state: AgentWorkflowKV): Promise<void> {
  const key = workflowKey(agentName)
  memoryWorkflowState[key] = state

  if (!cfConfigured()) return

  try {
    const res = await fetch(`${kvBaseUrl()}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    })
    if (!res.ok) {
      console.warn(`[workflowState] KV PUT failed: ${res.status} — state saved to memory only`)
    }
  } catch (err) {
    console.warn(`[workflowState] KV PUT error:`, err)
  }
}

export async function getAllAgentWorkflowStates(
  agentNames: string[]
): Promise<Record<string, AgentWorkflowKV | null>> {
  const entries = await Promise.all(
    agentNames.map(async (name) => [name, await getAgentWorkflowState(name)] as const)
  )
  return Object.fromEntries(entries)
}
