import { NextRequest } from 'next/server'
import { propostEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* stream closed */ }
      }

      // Send current agent statuses from DB on connect
      try {
        const { getDb } = await import('@/lib/db/client')
        const db = getDb()
        const agents = await db`
          SELECT name, status, last_heartbeat, company, tier
          FROM agents
          ORDER BY tier ASC, name ASC
        `
        send({ type: 'initial', agents })
      } catch {
        // DB not ready yet — send empty initial state
        send({ type: 'initial', agents: [] })
      }

      const listener = (event: unknown) => send({ type: 'update', ...(event as object) })
      propostEvents.on('agent:status', listener)

      // Keep-alive ping every 20s (Vercel Hobby SSE limit ~60s — client reconnects)
      const pingInterval = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { /* closed */ }
      }, 20_000)

      // Auto-close at 55s so Vercel doesn't kill it mid-stream
      const autoClose = setTimeout(() => {
        clearInterval(pingInterval)
        propostEvents.off('agent:status', listener)
        send({ type: 'reconnect' })
        try { controller.close() } catch { /* closed */ }
      }, 55_000)

      _req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        clearTimeout(autoClose)
        propostEvents.off('agent:status', listener)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
