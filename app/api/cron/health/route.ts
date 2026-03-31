// POST /api/cron/health
// Checks all platform connections and agent heartbeats

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { healthMonitor } from '@/lib/health/monitor'
import { logInfo } from '@/lib/logger'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[Cron/health] Running health checks')

  try {
    await Promise.all([
      healthMonitor.checkAllPlatforms(),
      healthMonitor.checkAgentHeartbeats(),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
