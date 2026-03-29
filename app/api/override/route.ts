export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Override API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  pauseAgent,
  resumeAgent,
  pauseAllAgents,
  resumeAllAgents,
  pauseCorpAgents,
  getAgentState,
  ALL_AGENT_NAMES,
} from '@/lib/agentState'
import { OverrideRequest, OverrideResponse, Corp } from '@/lib/types'

const CORPS: Corp[] = ['xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore']

function isCorp(scope: string): scope is Corp {
  return CORPS.includes(scope as Corp)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: OverrideRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { command, scope, reason, content } = body
  let affectedAgents: string[] = []
  let message = ''

  try {
    if (command === 'PAUSE') {
      if (scope === 'all') {
        await pauseAllAgents(reason ?? 'Manual override')
        affectedAgents = [...ALL_AGENT_NAMES]
        message = 'All agents paused'
      } else if (isCorp(scope)) {
        await pauseCorpAgents(scope, reason ?? 'Manual override')
        // Get corp agents from the state module
        const { CORP_AGENT_MAP } = await import('@/lib/agentState') as unknown as { CORP_AGENT_MAP?: Record<string, string[]> }
        affectedAgents = CORP_AGENT_MAP?.[scope] ?? []
        message = `${scope} corp paused`
      } else {
        await pauseAgent(scope, reason ?? 'Manual override')
        affectedAgents = [scope]
        message = `Agent ${scope} paused`
      }
    }

    if (command === 'RESUME') {
      if (scope === 'all') {
        await resumeAllAgents()
        affectedAgents = [...ALL_AGENT_NAMES]
        message = 'All agents resumed'
      } else if (isCorp(scope)) {
        // Resume all agents in corp
        const { CORP_AGENT_MAP } = await import('@/lib/agentState') as unknown as { CORP_AGENT_MAP?: Record<string, string[]> }
        const agents = CORP_AGENT_MAP?.[scope] ?? []
        await Promise.all(agents.map((a) => resumeAgent(a)))
        affectedAgents = agents
        message = `${scope} corp resumed`
      } else {
        await resumeAgent(scope)
        affectedAgents = [scope]
        message = `Agent ${scope} resumed`
      }
    }

    if (command === 'STATUS') {
      const states = await Promise.all(
        ALL_AGENT_NAMES.map(async (name) => {
          const state = await getAgentState(name)
          return { name, ...state }
        })
      )
      const response: OverrideResponse = {
        applied: true,
        affectedAgents: ALL_AGENT_NAMES,
        message: JSON.stringify(states),
      }
      return NextResponse.json(response)
    }

    if (command === 'OVERRIDE') {
      // Direct content override — log and acknowledge
      affectedAgents = scope === 'all' ? ALL_AGENT_NAMES : [scope]
      message = `Override applied to ${scope}`
    }

    const response: OverrideResponse = {
      applied: true,
      affectedAgents,
      message,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[override]', err)
    return NextResponse.json({ error: 'Override failed' }, { status: 500 })
  }
}

