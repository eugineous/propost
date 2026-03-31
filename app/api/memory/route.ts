import { NextRequest, NextResponse } from 'next/server'
import { memoryStore } from '@/lib/memory/store'
import type { Platform } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agent = searchParams.get('agent')
  const platform = searchParams.get('platform') as Platform | null
  const keyword = searchParams.get('keyword')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    let entries
    if (keyword && !agent) {
      entries = await memoryStore.search(keyword)
    } else if (agent) {
      entries = await memoryStore.retrieve(agent, {
        platform: platform ?? undefined,
        keyword: keyword ?? undefined,
        dateFrom: from ? new Date(from) : undefined,
        dateTo: to ? new Date(to) : undefined,
      })
    } else {
      entries = await memoryStore.search(keyword ?? '', undefined)
    }
    return NextResponse.json(entries)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Memory fetch failed' },
      { status: 500 }
    )
  }
}
