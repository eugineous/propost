// ============================================================
// ProPost Empire — Gemini API Wrapper
// ============================================================

import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionDeclaration,
  Tool,
} from '@google/generative-ai'
import { AgentContext, AgentResult, GeminiFunctionDeclaration } from '@/lib/types'
import { executeTool } from '@/lib/toolExecutor'
import { cleanEnvValue } from '@/lib/env'

function toGeminiFunctionDeclaration(decl: GeminiFunctionDeclaration): FunctionDeclaration {
  return {
    name: decl.name,
    description: decl.description,
    parameters: decl.parameters as FunctionDeclaration['parameters'],
  }
}

export async function runAgent(
  context: AgentContext,
  task: string,
  taskData?: Record<string, unknown>
): Promise<AgentResult> {
  const startMs = Date.now()
  let tokensUsed = 0

  const attempt = async (): Promise<AgentResult> => {
    // Create the client inside the function so it picks up the cleaned env value at runtime.
    const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY)
    const modelName = cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash'
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: context.systemPrompt,
    })

    const tools: Tool[] = context.tools.length > 0
      ? [{ functionDeclarations: context.tools.map(toGeminiFunctionDeclaration) }]
      : []

    const history: Content[] = []

    // Build initial user message
    const userMessage = taskData
      ? `${task}\n\nContext data:\n${JSON.stringify(taskData, null, 2)}`
      : task

    const chat = model.startChat({ tools, history })

    let result = await chat.sendMessage(userMessage)
    let response = result.response

    // Multi-turn function calling loop
    while (true) {
      const usage = response.usageMetadata
      if (usage?.totalTokenCount) tokensUsed += usage.totalTokenCount

      const candidate = response.candidates?.[0]
      if (!candidate) break

      const parts = candidate.content?.parts ?? []
      const functionCallPart = parts.find((p: Part) => p.functionCall)

      if (!functionCallPart?.functionCall) {
        // Final text response
        const text = response.text()
        return {
          agentName: context.agentName,
          action: task.slice(0, 100),
          outcome: 'success',
          data: { response: text },
          tokensUsed,
          durationMs: Date.now() - startMs,
        }
      }

      // Execute the function call
      const { name, args } = functionCallPart.functionCall
      const toolResult = await executeTool(
        name,
        (args as Record<string, unknown>) ?? {},
        context.agentName
      )

      // Feed function response back
      result = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result: toolResult },
          },
        },
      ])
      response = result.response
    }

    // Fallback if no text was returned
    return {
      agentName: context.agentName,
      action: task.slice(0, 100),
      outcome: 'error',
      data: { error: 'No response from model' },
      tokensUsed,
      durationMs: Date.now() - startMs,
    }
  }

  try {
    return await attempt()
  } catch (err) {
    console.warn(`[gemini] ${context.agentName} first attempt failed, retrying in 2s…`, err)
    await new Promise((r) => setTimeout(r, 2000))
    try {
      return await attempt()
    } catch (retryErr) {
      throw retryErr
    }
  }
}
