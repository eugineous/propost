// Gemini 2.0 Flash client wrapper
// Uses @google/generative-ai with 10s timeout via AbortController
// Routes through CF AI Gateway when CF_AI_GATEWAY_URL is set (caching + logging)

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProviderError } from '../errors'

const TIMEOUT_MS = 10_000

export async function generateWithGemini(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new AIProviderError('gemini', false, 'GEMINI_API_KEY is not set')
  }

  // Route through CF AI Gateway if configured — enables caching, logging, rate limiting
  const gatewayUrl = process.env.CF_AI_GATEWAY_URL
  const baseUrl = gatewayUrl ? `${gatewayUrl}/google-ai-studio` : undefined

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    },
    // Route through CF AI Gateway if configured
    baseUrl ? { baseUrl } : undefined
    )

    const resultPromise = model.generateContent(prompt)

    const result = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new AIProviderError('gemini', true, 'Gemini request timed out after 10s'))
        )
      }),
    ])

    const text = result.response.text()
    if (!text) {
      throw new AIProviderError('gemini', false, 'Gemini returned empty response')
    }
    return text
  } catch (err) {
    if (err instanceof AIProviderError) throw err
    throw new AIProviderError(
      'gemini',
      controller.signal.aborted,
      `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`
    )
  } finally {
    clearTimeout(timer)
  }
}
