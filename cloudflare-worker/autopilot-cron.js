/**
 * ProPost Empire — Cloudflare Worker Autopilot Cron
 * Triggers the workflow engine every 5 minutes
 * Bypasses Vercel Pro requirement entirely
 *
 * Deploy: wrangler deploy
 * Schedule: every 5 minutes via wrangler.toml
 */

export default {
  // Cron trigger — fires every 5 minutes
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutopilot(env))
  },

  // HTTP trigger — for manual testing
  async fetch(request, env) {
    if (request.method === 'POST' || new URL(request.url).pathname === '/trigger') {
      const result = await runAutopilot(env)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true, message: 'ProPost Autopilot Worker running. POST /trigger to fire manually.' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

async function runAutopilot(env) {
  const baseUrl = env.PROPOST_URL || 'https://propost.vercel.app'
  const cronSecret = env.CRON_SECRET

  try {
    const res = await fetch(`${baseUrl}/api/cron/autopilot`, {
      method: 'GET',
      headers: {
        'x-cron-secret': cronSecret,
        'User-Agent': 'ProPost-CF-Worker/1.0',
      },
    })

    const data = await res.json()
    console.log(`[autopilot] ${res.status} — agentsRun: ${data.agentsRun ?? 0}, stepsExecuted: ${data.stepsExecuted ?? 0}`)
    return { ok: res.ok, status: res.status, ...data }
  } catch (err) {
    console.error('[autopilot] fetch failed:', err)
    return { ok: false, error: String(err) }
  }
}
