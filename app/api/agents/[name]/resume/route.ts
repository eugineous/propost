// ============================================================
// ProPost Empire — Resume Specific Agent
// ============================================================
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resumeAgent } from '@/lib/agentState'

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = params

  try {
    await resumeAgent(name)
    return NextResponse.json({ ok: true, agent: name, paused: false })
  } catch (err) {
    console.error(`[agents/${name}/resume]`, err)
    return NextResponse.json({ error: 'Failed to resume agent' }, { status: 500 })
  }
}
