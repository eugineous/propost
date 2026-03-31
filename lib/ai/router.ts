// AI Router — routes tasks to the correct AI provider
//
// Routing rules:
//   plan | analyze | summarize | validate  →  Gemini 2.0 Flash (primary)
//   draft | generate                       →  NVIDIA NIM llama-3.1-70b (primary)
//
// On primary failure (10s timeout): switch to alternate provider
// On both failures: throw AIProviderError

import type { AITask } from '../types'
import { AIProviderError } from '../errors'
import { generateWithGemini } from './gemini'
import { generateWithNvidia } from './nvidia'

export interface AIResponse {
  content: string
  provider: 'gemini' | 'nvidia'
  taskType: AITask
}

export interface AIRouter {
  route(task: AITask, prompt: string, context?: Record<string, unknown>): Promise<AIResponse>
}

// Tasks that route to Gemini (reasoning / analysis)
const GEMINI_TASKS = new Set<AITask>(['plan', 'analyze', 'summarize', 'validate'])

// Tasks that route to NVIDIA NIM (creative / generation)
const NVIDIA_TASKS = new Set<AITask>(['draft', 'generate'])

function getPrimaryProvider(task: AITask): 'gemini' | 'nvidia' {
  if (GEMINI_TASKS.has(task)) return 'gemini'
  if (NVIDIA_TASKS.has(task)) return 'nvidia'
  // Default to gemini for any unknown task type
  return 'gemini'
}

function getAlternateProvider(primary: 'gemini' | 'nvidia'): 'gemini' | 'nvidia' {
  return primary === 'gemini' ? 'nvidia' : 'gemini'
}

async function callProvider(
  provider: 'gemini' | 'nvidia' | 'workers_ai',
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (provider === 'gemini') return generateWithGemini(prompt, systemPrompt)
  if (provider === 'nvidia') return generateWithNvidia(prompt, systemPrompt)
  // Workers AI fallback — calls CF worker endpoint
  const workerUrl = process.env.CF_WORKER_URL
  const internalSecret = process.env.INTERNAL_SECRET
  if (!workerUrl || !internalSecret) throw new Error('CF_WORKER_URL not configured for Workers AI fallback')
  const res = await fetch(`${workerUrl}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
    body: JSON.stringify({ prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }),
  })
  if (!res.ok) throw new Error(`Workers AI returned ${res.status}`)
  const data = await res.json() as { content: string }
  return data.content
}

function buildSystemPrompt(context?: Record<string, unknown>): string | undefined {
  if (!context || Object.keys(context).length === 0) return undefined
  return `Context: ${JSON.stringify(context)}`
}

class AIRouterImpl implements AIRouter {
  async route(
    task: AITask,
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<AIResponse> {
    const primary = getPrimaryProvider(task)
    const alternate = getAlternateProvider(primary)
    const systemPrompt = buildSystemPrompt(context)

    // Try primary provider
    try {
      const content = await callProvider(primary, prompt, systemPrompt)
      return { content, provider: primary, taskType: task }
    } catch (primaryErr) {
      console.warn(
        `[AIRouter] Primary provider ${primary} failed for task "${task}":`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      )
    }

    // Try alternate provider
    try {
      const content = await callProvider(alternate, prompt, systemPrompt)
      return { content, provider: alternate, taskType: task }
    } catch (alternateErr) {
      console.warn(`[AIRouter] Alternate provider ${alternate} failed, trying Workers AI fallback`)
    }

    // Try Workers AI (CF edge fallback — third provider)
    try {
      const content = await callProvider('workers_ai', prompt, systemPrompt)
      return { content, provider: 'gemini', taskType: task } // report as gemini for compatibility
    } catch (fallbackErr) {
      const timedOut = fallbackErr instanceof AIProviderError ? fallbackErr.timedOut : false
      throw new AIProviderError(
        alternate,
        timedOut,
        `All AI providers failed for task "${task}". Last error: ${
          fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        }`
      )
    }
  }
}

export const aiRouter: AIRouter = new AIRouterImpl()
