export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { scribeReport } from '@/lib/scribe'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await scribeReport()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/sitrep]', err)
    return NextResponse.json({ error: 'SitRep generation failed' }, { status: 500 })
  }
}

