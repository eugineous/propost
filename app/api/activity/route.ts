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
        for (const row of (rows as unknown[]).reverse()) {
          send({ type: 'initial', action: row })
        }
      } catch {
        // DB may not be available yet
      }

      const listener = (event: unknown) => send(event)
      propostEvents.on('activity', listener)

      // Cleanup on close
      _req.signal.addEventListener('abort', () => {
        propostEvents.off('activity', listener)
        controller.close()
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
