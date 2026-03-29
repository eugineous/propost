export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { sentryCheck } from '@/lib/sentry'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const crisis = await sentryCheck()
    return NextResponse.json({ ok: true, crisis })
  } catch (err) {
    console.error('[cron/sentry]', err)
    return NextResponse.json({ error: 'Sentry check failed' }, { status: 500 })
  }
}

