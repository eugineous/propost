import { NextRequest, NextResponse } from 'next/server'
import { approvalGate } from '@/lib/agents/control/approval-gate'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const reason = body.reason ?? 'Rejected by Founder'
    await approvalGate.rejectApproval(params.id, reason)
    return NextResponse.json({ cancelled: true, approvalId: params.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Rejection failed' },
      { status: 500 }
    )
  }
}
