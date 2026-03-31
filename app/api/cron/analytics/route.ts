// POST /api/cron/analytics
// Pulls metrics for all platforms via analyticsEngine

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { analyticsEngine } from '@/lib/analytics/engine'
import { logInfo } from '@/lib/logger'

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logInfo('[Cron/analytics] Starting analytics pull for all platforms')

  try {
    await analyticsEngine.pullAllPlatforms()
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
