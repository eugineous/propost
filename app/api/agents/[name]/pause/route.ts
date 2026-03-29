// ============================================================
// ProPost Empire — Pause Specific Agent
// ============================================================
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pauseAgent } from '@/lib/agentState'

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = params
  let reason = 'Manual pause'

  try {
    const body = await req.json() as { reason?: string }
    if (body.reason) reason = body.reason
  } catch {
    // reason stays default
  }

  try {
    await pauseAgent(name, reason)
    return NextResponse.json({ ok: true, agent: name, paused: true, reason })
  } catch (err) {
    console.error(`[agents/${name}/pause]`, err)
    return NextResponse.json({ error: 'Failed to pause agent' }, { status: 500 })
  }
}
