import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db/client'
import { propostEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send last 100 real actions on connect
      try {
        const db = getDb()
        const rows = await db`
          SELECT id, agent_name, company, platform, action_type, content, status, platform_post_id, timestamp
          FROM actions
          ORDER BY timestamp DESC
          LIMIT 100
        `
        for (const row of (rows as Array<Record<string, unknown>>).reverse()) {
          send({
            type: 'initial',
            action: {
              id: row.id,
              agentName: row.agent_name,
              company: row.company,
              platform: row.platform,
              type: row.action_type,
              contentPreview: typeof row.content === 'string' ? row.content.slice(0, 80) : '',
              status: row.status,
              platformPostId: row.platform_post_id,
              timestamp: row.timestamp,
            },
          })
        }
      } catch {
        // DB may not be available yet
      }

      const listener = (event: unknown) => send(event)
      propostEvents.on('activity', listener)

      // Keep-alive ping every 20s
      const pingInterval = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { /* closed */ }
      }, 20_000)

      // Auto-close at 55s — client reconnects, gets fresh data
      const autoClose = setTimeout(() => {
        clearInterval(pingInterval)
        propostEvents.off('activity', listener)
        send({ type: 'reconnect' })
        try { controller.close() } catch { /* closed */ }
      }, 55_000)

      // Cleanup on close
      _req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        clearTimeout(autoClose)
        propostEvents.off('activity', listener)
        try { controller.close() } catch { /* closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
