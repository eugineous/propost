export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { scoutPoll } from '@/lib/scout'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await scoutPoll()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/scout]', err)
    return NextResponse.json({ error: 'Scout poll failed' }, { status: 500 })
  }
}

