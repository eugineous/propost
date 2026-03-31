import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { agentRegistry } from '@/lib/agents/index'
import { getDb, withRetry } from '@/lib/db/client'
import { sanitizePrompt, validateAgentName } from '@/lib/security/red-team'

const schema = z.object({ content: z.string().min(1).max(5_000) })

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const agentName = params.name.toUpperCase()

  // Validate agent name format
  if (!validateAgentName(agentName)) {
    return NextResponse.json({ error: 'Invalid agent name' }, { status: 400 })
  }

  const agent = agentRegistry[agentName]
  if (!agent) {
    return NextResponse.json({ error: `Agent ${agentName} not found` }, { status: 404 })
  }

  try {
    const body = schema.parse(await req.json())

    // Sanitize for prompt injection
    const { sanitized, threats } = sanitizePrompt(body.content)
    if (threats.length > 0) {
      console.warn(`[agent-message/${agentName}] Injection attempt`, { threats })
    }

    const response = await agent.receiveMessage({ content: sanitized })

    const db = getDb()
    const rows = await withRetry(() =>
      db`
        INSERT INTO conversations (agent_name, role, content)
        VALUES
          (${agentName}, 'founder', ${sanitized}),
          (${agentName}, 'agent', ${response.content})
        RETURNING id
      `
    )
    const conversationId = (rows as Array<{ id: string }>)[0]?.id ?? ''

    return NextResponse.json({ response: response.content, conversationId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Message failed' },
      { status: 500 }
    )
  }
}
