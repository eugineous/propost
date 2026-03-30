// ============================================================
// ProPost Empire — Dual AI Engine
// Gemini 2.0 Flash + NVIDIA Nemotron 70B working together
//
// STRATEGY:
// - Gemini: creative content, tool calling, fast responses
// - NVIDIA: deep reasoning, long-form analysis, fallback
// - Auto-routing: task type determines which AI leads
// - Fallback: if primary fails, secondary takes over
// ============================================================

import { GoogleGenerativeAI, FunctionDeclaration, Tool, Content, Part } from '@google/generative-ai'
import { AgentContext, AgentResult, GeminiFunctionDeclaration } from '@/lib/types'
import { executeTool } from '@/lib/toolExecutor'
import { cleanEnvValue } from '@/lib/env'

// ── Config ────────────────────────────────────────────────────

function geminiKey() { return cleanEnvValue(process.env.GEMINI_API_KEY) }
function nvidiaKey() { return cleanEnvValue(process.env.NVIDIA_API_KEY) }
function nvidiaBase() { return cleanEnvValue(process.env.NVIDIA_BASE_URL) || 'https://integrate.api.nvidia.com/v1' }
function geminiModel() {
  const envModel = cleanEnvValue(process.env.GEMINI_MODEL)
  // Only use env var if it's a known valid model name
  const validModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro']
  if (envModel && validModels.includes(envModel)) return envModel
  return 'gemini-1.5-flash'
}

// NVIDIA models — pick based on task
const NVIDIA_MODELS = {
  reasoning:  'nvidia/llama-3.1-nemotron-70b-instruct',  // deep analysis, strategy
  fast:       'meta/llama-3.1-8b-instruct',              // quick tasks, fallback
  creative:   'mistralai/mixtral-8x7b-instruct-v0.1',    // creative writing
}

// ── Task Router ───────────────────────────────────────────────
// Determines which AI should lead based on task type

type AIRole = 'gemini' | 'nvidia' | 'both'

function routeTask(task: string, agentName: string): AIRole {
  const t = task.toLowerCase()

  // NVIDIA leads: deep analysis, research, strategy, long-form
  if (
    t.includes('analyze') || t.includes('research') || t.includes('strategy') ||
    t.includes('competitor') || t.includes('pattern') || t.includes('briefing') ||
    t.includes('report') || t.includes('intelligence') || t.includes('forecast') ||
    t.includes('legal') || t.includes('compliance') || t.includes('risk') ||
    agentName === 'oracle' || agentName === 'memory' || agentName === 'judge' ||
    agentName === 'banker' || agentName === 'forecast' || agentName === 'atlas'
  ) return 'nvidia'

  // Both: creative + analytical tasks
  if (
    t.includes('campaign') || t.includes('viral') || t.includes('brand') ||
    agentName === 'sovereign' || agentName === 'zara' || agentName === 'aurora'
  ) return 'both'

  // Gemini leads: content creation, posting, DMs, quick tasks
  return 'gemini'
}

// ── NVIDIA Call ───────────────────────────────────────────────

async function callNvidia(
  systemPrompt: string,
  userMessage: string,
  model: keyof typeof NVIDIA_MODELS = 'reasoning',
  temperature = 0.7,
  maxTokens = 2048
): Promise<string> {
  const key = nvidiaKey()
  if (!key) throw new Error('NVIDIA_API_KEY not configured')

  const res = await fetch(`${nvidiaBase()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODELS[model],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`NVIDIA API ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Gemini Call ───────────────────────────────────────────────

async function callGemini(
  context: AgentContext,
  userMessage: string
): Promise<{ text: string; tokensUsed: number }> {
  const key = geminiKey()
  if (!key) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: geminiModel(),
    systemInstruction: context.systemPrompt,
  })

  const tools: Tool[] = context.tools.length > 0
    ? [{ functionDeclarations: context.tools.map((d: GeminiFunctionDeclaration): FunctionDeclaration => ({
        name: d.name,
        description: d.description,
        parameters: d.parameters as FunctionDeclaration['parameters'],
      })) }]
    : []

  const chat = model.startChat({ tools, history: [] as Content[] })
  let result = await chat.sendMessage(userMessage)
  let response = result.response
  let tokensUsed = 0

  // Multi-turn tool calling loop
  while (true) {
    const usage = response.usageMetadata
    if (usage?.totalTokenCount) tokensUsed += usage.totalTokenCount

    const candidate = response.candidates?.[0]
    if (!candidate) break

    const parts = candidate.content?.parts ?? []
    const fnCall = parts.find((p: Part) => p.functionCall)

    if (!fnCall?.functionCall) {
      return { text: response.text(), tokensUsed }
    }

    const { name, args } = fnCall.functionCall
    const toolResult = await executeTool(name, (args as Record<string, unknown>) ?? {}, context.agentName)

    result = await chat.sendMessage([{ functionResponse: { name, response: { result: toolResult } } }])
    response = result.response
  }

  return { text: '', tokensUsed }
}

// ── Dual AI Synthesis ─────────────────────────────────────────
// When both AIs run, synthesize their outputs for best result

async function synthesize(geminiOutput: string, nvidiaOutput: string, task: string): Promise<string> {
  // Use Gemini to synthesize — it's faster and good at combining
  try {
    const key = geminiKey()
    if (!key) return geminiOutput || nvidiaOutput

    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: geminiModel() })
    const result = await model.generateContent(
      `You have two AI analyses of the same task. Synthesize them into the best possible response.

TASK: ${task.slice(0, 200)}

ANALYSIS 1 (Gemini - creative/fast):
${geminiOutput.slice(0, 1000)}

ANALYSIS 2 (NVIDIA Nemotron - deep reasoning):
${nvidiaOutput.slice(0, 1000)}

Synthesize into one optimal response. Keep the best insights from both. Be concise.`
    )
    return result.response.text()
  } catch {
    // If synthesis fails, prefer NVIDIA for depth
    return nvidiaOutput || geminiOutput
  }
}

// ── Main Entry Point ──────────────────────────────────────────

export async function runAgent(
  context: AgentContext,
  task: string,
  taskData?: Record<string, unknown>
): Promise<AgentResult> {
  const startMs = Date.now()
  let tokensUsed = 0

  const userMessage = taskData
    ? `${task}\n\nContext data:\n${JSON.stringify(taskData, null, 2)}`
    : task

  const role = routeTask(task, context.agentName)

  // ── NVIDIA leads ──────────────────────────────────────────
  if (role === 'nvidia') {
    try {
      const nvidiaText = await callNvidia(
        context.systemPrompt,
        userMessage,
        'reasoning',
        0.6,
        3000
      )
      return {
        agentName: context.agentName,
        action: task.slice(0, 100),
        outcome: 'success',
        data: { response: nvidiaText, ai: 'nvidia' },
        tokensUsed,
        durationMs: Date.now() - startMs,
      }
    } catch (nvidiaErr) {
      console.warn(`[ai] NVIDIA failed for ${context.agentName}, falling back to Gemini:`, nvidiaErr)
      // Fall through to Gemini
    }
  }

  // ── Both AIs run in parallel ──────────────────────────────
  if (role === 'both') {
    const [geminiResult, nvidiaResult] = await Promise.allSettled([
      callGemini(context, userMessage),
      callNvidia(context.systemPrompt, userMessage, 'reasoning', 0.7, 2048),
    ])

    const geminiText = geminiResult.status === 'fulfilled' ? geminiResult.value.text : ''
    const nvidiaText = nvidiaResult.status === 'fulfilled' ? nvidiaResult.value : ''
    if (geminiResult.status === 'fulfilled') tokensUsed += geminiResult.value.tokensUsed

    if (geminiText && nvidiaText) {
      const synthesized = await synthesize(geminiText, nvidiaText, task)
      return {
        agentName: context.agentName,
        action: task.slice(0, 100),
        outcome: 'success',
        data: { response: synthesized, ai: 'both', gemini: geminiText.slice(0, 200), nvidia: nvidiaText.slice(0, 200) },
        tokensUsed,
        durationMs: Date.now() - startMs,
      }
    }

    // Use whichever succeeded
    const text = geminiText || nvidiaText
    return {
      agentName: context.agentName,
      action: task.slice(0, 100),
      outcome: text ? 'success' : 'error',
      data: { response: text, ai: geminiText ? 'gemini' : 'nvidia' },
      tokensUsed,
      durationMs: Date.now() - startMs,
    }
  }

  // ── Gemini leads (default) ────────────────────────────────
  try {
    const { text, tokensUsed: tu } = await callGemini(context, userMessage)
    tokensUsed += tu

    if (text) {
      return {
        agentName: context.agentName,
        action: task.slice(0, 100),
        outcome: 'success',
        data: { response: text, ai: 'gemini' },
        tokensUsed,
        durationMs: Date.now() - startMs,
      }
    }
    throw new Error('Gemini returned empty response')
  } catch (geminiErr) {
    console.warn(`[ai] Gemini failed for ${context.agentName}, falling back to NVIDIA:`, geminiErr)

    // NVIDIA fallback
    try {
      const nvidiaText = await callNvidia(
        context.systemPrompt,
        userMessage,
        'fast', // use fast model for fallback
        0.7,
        1024
      )
      return {
        agentName: context.agentName,
        action: task.slice(0, 100),
        outcome: 'success',
        data: { response: nvidiaText, ai: 'nvidia_fallback' },
        tokensUsed,
        durationMs: Date.now() - startMs,
      }
    } catch (nvidiaErr) {
      console.error(`[ai] Both AIs failed for ${context.agentName}:`, { geminiErr, nvidiaErr })
      return {
        agentName: context.agentName,
        action: task.slice(0, 100),
        outcome: 'error',
        data: { error: `Gemini: ${String(geminiErr).slice(0, 100)} | NVIDIA: ${String(nvidiaErr).slice(0, 100)}` },
        tokensUsed,
        durationMs: Date.now() - startMs,
      }
    }
  }
}

// ── Direct text generation (no agent context needed) ──────────

export async function generateText(
  prompt: string,
  options: {
    preferNvidia?: boolean
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  const { preferNvidia = false, systemPrompt = 'You are a helpful AI assistant.', maxTokens = 1024, temperature = 0.7 } = options

  if (preferNvidia) {
    try {
      return await callNvidia(systemPrompt, prompt, 'reasoning', temperature, maxTokens)
    } catch {
      // fall through to Gemini
    }
  }

  try {
    const key = geminiKey()
    if (!key) throw new Error('No Gemini key')
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: geminiModel(), systemInstruction: systemPrompt })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch {
    // Try NVIDIA as fallback
    return callNvidia(systemPrompt, prompt, 'fast', temperature, maxTokens)
  }
}

// ── Re-export for backwards compatibility ─────────────────────
// lib/gemini.ts now delegates here
export { runAgent as runAgentGemini }
