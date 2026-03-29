export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages } from '@/lib/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.receivedAt))
      .limit(100)

    const unified = rows.map((m) => ({
      id: m.id,
      platform: m.platform,
      senderId: m.senderId,
      senderUsername: m.senderUsername ?? m.senderId,
      content: m.content,
      replyContent: m.replyContent,
      isBrandDeal: m.isBrandDeal ?? false,
      status: m.status ?? 'pending',
      receivedAt: m.receivedAt,
      repliedAt: m.repliedAt,
      responseTimeMs: m.responseTimeMs,
      agentName: m.agentName,
    }))

    return NextResponse.json({ ok: true, messages: unified })
  } catch (err) {
    console.error('[inbox GET]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
