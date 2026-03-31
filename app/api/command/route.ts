import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sovereign } from '@/lib/agents/sovereign'
import { sanitizePrompt } from '@/lib/security/red-team'

const schema = z.object({ message: z.string().min(1).max(10_000) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    // Red team: sanitize for prompt injection before sending to AI
    const { safe, sanitized, threats } = sanitizePrompt(body.message)
    if (!safe) {
      // Log threats but still process sanitized version — don't reveal detection
      console.warn('[command] Prompt injection attempt detected', { threats })
    }

    const response = await sovereign.receiveMessage({ content: sanitized })
    return NextResponse.json({
      taskId: response.taskId ?? null,
      plan: response.content,
      dispatchedTo: [response.agentName],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Command failed' },
      { status: 400 }
    )
  }
}
