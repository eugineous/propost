// NVIDIA NIM client wrapper using OpenAI-compatible SDK
// Model: meta/llama-3.1-70b-instruct
// Routes through CF AI Gateway when CF_AI_GATEWAY_URL is set (caching + logging)

import OpenAI from 'openai'
import { AIProviderError } from '../errors'

const TIMEOUT_MS = 10_000
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct'

export async function generateWithNvidia(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    throw new AIProviderError('nvidia', false, 'NVIDIA_API_KEY is not set')
  }

  // Route through CF AI Gateway if configured
  const gatewayUrl = process.env.CF_AI_GATEWAY_URL
  const baseURL = gatewayUrl ? `${gatewayUrl}/nvidia` : NVIDIA_BASE_URL

  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: TIMEOUT_MS,
  })

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  try {
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages,
      max_tokens: 2048,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) {
      throw new AIProviderError('nvidia', false, 'NVIDIA NIM returned empty response')
    }
    return text
  } catch (err) {
    if (err instanceof AIProviderError) throw err

    const timedOut =
      err instanceof Error &&
      (err.message.includes('timeout') || err.message.includes('timed out'))

    throw new AIProviderError(
      'nvidia',
      timedOut,
      `NVIDIA NIM request failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
