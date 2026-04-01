// GET /api/make/status — returns Make.com webhook configuration status

import { NextResponse } from 'next/server'
import { getMakeStatus } from '@/lib/make/client'

export async function GET() {
  const status = getMakeStatus()
  const configured = Object.values(status).filter(s => s.configured).length
  const total = Object.keys(status).length

  return NextResponse.json({
    ok: true,
    apiKey: !!process.env.MAKE_API_KEY,
    platforms: status,
    summary: `${configured}/${total} platforms configured`,
  })
}
