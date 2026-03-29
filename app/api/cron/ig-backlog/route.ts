export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { processInstagramBacklog } from '@/lib/instagramBacklog'

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processInstagramBacklog({ runBy: 'cron' })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[ig-backlog]', err)
    return NextResponse.json({ error: 'Backlog processing failed' }, { status: 500 })
  }
}
