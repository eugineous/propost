import { NextRequest, NextResponse } from 'next/server'
import { approvalGate } from '@/lib/agents/control/approval-gate'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    await approvalGate.releaseApproval(params.id, body.editedContent)
    return NextResponse.json({ released: true, approvalId: params.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approval failed' },
      { status: 500 }
    )
  }
}
