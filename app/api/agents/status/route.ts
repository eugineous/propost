export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Agent Status Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAgentState, ALL_AGENT_NAMES } from '@/lib/agentState'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const states = await Promise.all(
      ALL_AGENT_NAMES.map(async (name) => {
        const state = await getAgentState(name)
        return { name, ...state }
      })
    )
    return NextResponse.json({ agents: states })
  } catch (err) {
    console.error('[agents/status]', err)
    return NextResponse.json({ error: 'Failed to fetch agent states' }, { status: 500 })
  }
}

