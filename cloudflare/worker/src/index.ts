/**
 * ProPost Empire — Cloudflare Worker Scheduler
 *
 * Runs every 5 minutes. Calls the right Vercel endpoints based on time.
 * Free plan: 100,000 requests/day — more than enough.
 *
 * Deploy:
 *   cd cloudflare/worker
 *   npm install
 *   wrangler deploy
 *
 * Set these in Cloudflare dashboard → Workers → propost-worker → Settings → Variables:
 *   PROPOST_URL    = https://propost.vercel.app
 *   CRON_SECRET    = propost-cron-371667210-secret
 *   INTERNAL_SECRET = propost-internal-649185875-secret
 */

export interface Env {
  PROPOST_URL: string
  CRON_SECRET: string
  INTERNAL_SECRET: string
}

async function hit(
  baseUrl: string,
  cronSecret: string,
  internalSecret: string,
  path: string,
  method: 'GET' | 'POST' = 'POST'
): Promise<{ path: string; ok: boolean; status: number; ms: number }> {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'x-internal-secret': internalSecret,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(55_000),
    })
    return { path, ok: res.ok, status: res.status, ms: Date.now() - start }
  } catch (err) {
    return { path, ok: false, status: 0, ms: Date.now() - start }
  }
}

export default {
  // HTTP handler — health check + manual trigger
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'propost-worker', ts: new Date().toISOString() })
    }
    if (req.method === 'POST' && url.pathname === '/trigger') {
      const body = await req.json() as { path?: string; method?: string }
      if (!body.path) return new Response('Missing path', { status: 400 })
      const result = await hit(env.PROPOST_URL, env.CRON_SECRET, env.INTERNAL_SECRET, body.path, (body.method as 'GET' | 'POST') ?? 'POST')
      return Response.json(result)
    }
    return new Response('ProPost Worker — POST /trigger or GET /health', { status: 200 })
  },

  // Scheduled handler — every 5 minutes
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date(event.scheduledTime)
    const utcH = now.getUTCHours()
    const utcM = now.getUTCMinutes()
    const utcD = now.getUTCDay()   // 0=Sun
    const eatH = (utcH + 3) % 24  // EAT = UTC+3

    const jobs: Array<{ path: string; method?: 'GET' | 'POST' }> = []

    // ── ALWAYS: daily-workflows every 5 min (handles randomized X+LinkedIn posting) ──
    jobs.push({ path: '/api/cron/daily-workflows' })

    // ── AI News: 6AM, 9AM, 12PM, 3PM EAT (3,6,9,12 UTC) ──
    if ([3, 6, 9, 12].includes(utcH) && utcM < 5) {
      jobs.push({ path: '/api/cron/ai-news' })
    }

    // ── Instagram + Facebook: 4x daily at same EAT slots ──
    if ([3, 6, 9, 12].includes(utcH) && utcM < 5) {
      jobs.push({ path: '/api/cron/content-schedule' })
    }

    // ── Replies: every 30 min ──
    if (utcM < 5 || (utcM >= 30 && utcM < 35)) {
      jobs.push({ path: '/api/cron/replies' })
    }

    // ── Health check: every hour ──
    if (utcM < 5) {
      jobs.push({ path: '/api/cron/health', method: 'GET' })
    }

    // ── Analytics: 2AM EAT daily ──
    if (eatH === 2 && utcM < 5) {
      jobs.push({ path: '/api/cron/analytics' })
    }

    // ── Weekly roundup: Sunday 9AM EAT ──
    if (utcD === 0 && eatH === 9 && utcM < 5) {
      jobs.push({ path: '/api/cron/daily-workflows' }) // triggers WEEKLY_ROUNDUP
    }

    if (jobs.length === 0) return

    // Fire all in parallel
    ctx.waitUntil(
      Promise.allSettled(
        jobs.map(j => hit(env.PROPOST_URL, env.CRON_SECRET, env.INTERNAL_SECRET, j.path, j.method ?? 'POST'))
      ).then(results => {
        const summary = results.map((r, i) => {
          const v = r.status === 'fulfilled' ? r.value : { path: jobs[i].path, ok: false, status: 0, ms: 0 }
          return `${v.ok ? '✓' : '✗'} ${v.path} (${v.status}, ${v.ms}ms)`
        }).join(' | ')
        console.log(`[${now.toISOString()}] ${summary}`)
      })
    )
  },
}
