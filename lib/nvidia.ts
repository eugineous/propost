// ============================================================
// ProPost Empire — NVIDIA NIM Fallback Wrapper
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY!
const NVIDIA_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct'

interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface NvidiaChoice {
  message: { role: string; content: string }
  finish_reason: string
}

interface NvidiaResponse {
  choices: NvidiaChoice[]
  usage?: { total_tokens?: number }
}

export async function runAgentNvidia(
  context: AgentContext,
  task: string,
  taskData?: Record<string, unknown>
): Promise<AgentResult> {
  const startMs = Date.now()

  const userContent = taskData
    ? `${task}\n\nContext data:\n${JSON.stringify(taskData, null, 2)}`
    : task

  const messages: NvidiaMessage[] = [
    { role: 'system', content: context.systemPrompt },
    { role: 'user', content: userContent },
  ]

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`NVIDIA NIM API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as NvidiaResponse
  const text = data.choices?.[0]?.message?.content ?? ''
  const tokensUsed = data.usage?.total_tokens ?? 0

  return {
    agentName: context.agentName,
    action: task.slice(0, 100),
    outcome: 'success',
    data: { response: text },
    tokensUsed,
    durationMs: Date.now() - startMs,
  }
}
