export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { memoryLearningLoop } from '@/lib/memory'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await memoryLearningLoop()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/memory]', err)
    return NextResponse.json({ error: 'Memory learning loop failed' }, { status: 500 })
  }
}

