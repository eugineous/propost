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

      // Send current agent statuses on connect
      try {
        const db = getDb()
        const agents = await db`SELECT name, status, last_heartbeat FROM agents ORDER BY name`
        send({ type: 'initial', agents })
      } catch {
        // DB may not be available yet
      }

      const listener = (event: unknown) => send({ type: 'update', ...event as object })
      propostEvents.on('agent:status', listener)

      _req.signal.addEventListener('abort', () => {
        propostEvents.off('agent:status', listener)
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
