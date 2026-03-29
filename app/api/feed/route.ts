// ============================================================
// ProPost Empire — SSE Activity Feed
// ============================================================
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Listen on Neon Postgres LISTEN channel
      try {
        const sql = neon(process.env.DATABASE_URL!)

        // Poll agent_actions for new events (Neon serverless doesn't support LISTEN/NOTIFY directly)
        // Use polling as a fallback for serverless environments
        let lastId: string | null = null

        const poll = async () => {
          try {
            const query = lastId
              ? `SELECT * FROM agent_actions WHERE id > $1 ORDER BY created_at DESC LIMIT 20`
              : `SELECT * FROM agent_actions ORDER BY created_at DESC LIMIT 20`

            const rows = lastId
              ? await sql`SELECT * FROM agent_actions WHERE created_at > NOW() - INTERVAL '5 seconds' ORDER BY created_at ASC LIMIT 20`
              : await sql`SELECT * FROM agent_actions ORDER BY created_at DESC LIMIT 5`

            for (const row of rows) {
              const event = {
                type: row.action_type,
                agentName: row.agent_name,
                company: row.company,
                summary: (row.details as Record<string, unknown>)?.summary ?? row.action_type,
                data: row.details ?? {},
                timestamp: row.created_at,
              }
              send(JSON.stringify(event))
              lastId = row.id as string
            }
          } catch (err) {
            console.error('[feed] Poll error:', err)
          }
        }

        // Initial fetch
        await poll()

        // Poll every 3 seconds
        const pollInterval = setInterval(poll, 3000)

        // Cleanup on disconnect
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          clearInterval(pollInterval)
          controller.close()
        })
      } catch (err) {
        console.error('[feed] SSE setup error:', err)
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
