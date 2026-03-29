export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Agent Status Route (KV-backed)
// ============================================================

import { NextResponse } from 'next/server'
import { getAgentState, ALL_AGENT_NAMES } from '@/lib/agentState'

export async function GET() {
  try {
    const kvStates = await Promise.all(
      ALL_AGENT_NAMES.map(async (name) => {
        const s = await getAgentState(name)
        const hasData = Boolean(s.lastRunAt || s.lastOutcome || s.pauseReason)
        return {
          name,
          status: hasData ? (s.isPaused ? 'paused' : 'ok') : 'no_data',
          lastRunAt: s.lastRunAt || null,
          lastOutcome: s.lastOutcome || null,
          isPaused: s.isPaused,
          pauseReason: s.pauseReason ?? null,
        }
      })
    )

    const summary = {
      total: kvStates.length,
      ok: kvStates.filter((a) => a.status === 'ok').length,
      paused: kvStates.filter((a) => a.status === 'paused').length,
      noData: kvStates.filter((a) => a.status === 'no_data').length,
    }

    return NextResponse.json({
      ok: true,
      agents: kvStates,
      summary,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[agents/status]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

