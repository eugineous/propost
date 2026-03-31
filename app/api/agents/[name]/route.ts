import { NextRequest, NextResponse } from 'next/server'
import { agentRegistry } from '@/lib/agents/index'
import { getDb } from '@/lib/db/client'
import { memoryStore } from '@/lib/memory/store'

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const agentName = params.name.toUpperCase()
  const agent = agentRegistry[agentName]

  if (!agent) {
    return NextResponse.json({ error: `Agent ${agentName} not found` }, { status: 404 })
  }

  try {
    const db = getDb()

    const [currentTaskRows, lastActions, recentMemory] = await Promise.all([
      db`SELECT * FROM tasks WHERE assigned_agent = ${agentName} AND status = 'active' LIMIT 1`,
      db`SELECT * FROM actions WHERE agent_name = ${agentName} ORDER BY timestamp DESC LIMIT 10`,
      memoryStore.retrieve(agentName, { dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
    ])

    return NextResponse.json({
      agent: { name: agent.name, tier: agent.tier, company: agent.company, status: agent.status },
      currentTask: (currentTaskRows as unknown[])[0] ?? null,
      lastActions,
      recentMemory,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get agent details' },
      { status: 500 }
    )
  }
}
