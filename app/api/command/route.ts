export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Command API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { classifyCommand } from '@/lib/sovereign'
import { dispatchToAgent } from '@/lib/agentDispatch'
import { CommandRequest, CommandResponse } from '@/lib/types'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CommandRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const route = await classifyCommand(body.text)
    const commandId = randomUUID()

    let status: CommandResponse['status'] = 'executing'
    let preview: string | undefined

    if (route.priority === 'pending_human') {
      status = 'needs_human'
    } else {
      const dispatch = await dispatchToAgent(route.targetCorp, route.targetAgent, route.parameters)
      preview = dispatch.preview
    }

    // Emit agent_action SSE event
    await db.insert(agentActions).values({
      agentName: 'sovereign',
      company: 'intelcore',
      actionType: 'command_dispatched',
      details: {
        commandId,
        text: body.text,
        route,
        status,
      },
      outcome: status === 'needs_human' ? 'pending_human' : 'success',
    })

    const response: CommandResponse = {
      commandId,
      intent: route.intent,
      routedTo: { corp: route.targetCorp, agent: route.targetAgent },
      status,
      preview,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[command]', err)
    return NextResponse.json({ error: 'Command processing failed' }, { status: 500 })
  }
}

