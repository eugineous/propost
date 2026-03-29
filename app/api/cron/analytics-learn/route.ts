// ============================================================
// ProPost Empire — Daily Analytics & Learning Cron Job
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cronAuth'
import { runDailyAnalyticsUpdate } from '@/lib/analytics'

export const maxDuration = 300 // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronAuth(request)
  if (authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[cron:analytics-learn] Starting daily analytics update...')
    
    const result = await runDailyAnalyticsUpdate()

    if (result.success) {
      console.log(`[cron:analytics-learn] Completed: ${result.insightsGenerated} insights generated`)
      
      return NextResponse.json({
        status: 'success',
        ...result,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('[cron:analytics-learn] Update failed')
      
      return NextResponse.json({
        status: 'partial',
        ...result,
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }
  } catch (err) {
    console.error('[cron:analytics-learn] Error:', err)
    return NextResponse.json({
      status: 'error',
      error: String(err),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
