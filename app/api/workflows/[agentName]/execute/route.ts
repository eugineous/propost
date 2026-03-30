export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { executeStep, advanceCursor } from '@/lib/workflowEngine'

export async function POST(_req: NextRequest, { params }: { params: { agentName: string } }) {
  const { agentName } = params

  const result = await executeStep(agentName)
  if (result.ok && result.preview !== 'skipped (paused)') {
    await advanceCursor(agentName, result)
  }

  return NextResponse.json({ ok: result.ok, preview: result.preview, error: result.error })
}
