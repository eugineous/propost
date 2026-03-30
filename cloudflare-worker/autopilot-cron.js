/**
 * ProPost Empire — Cloudflare Worker
 * Fires every 5 min (autopilot) + every hour (X post)
 * Uses CF_API_TOKEN for KV operations
 */

export default {
  async scheduled(event, env, ctx) {
    const minute = new Date().getMinutes()
    ctx.waitUntil(runAutopilot(env))
    if (minute < 5) {
      ctx.waitUntil(runXPost(env))
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/trigger-autopilot') {
      const result = await runAutopilot(env)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }
    if (url.pathname === '/trigger-x-post') {
      const result = await runXPost(env)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }
    if (url.pathname === '/trigger-all') {
      const [autopilot, xpost] = await Promise.all([runAutopilot(env), runXPost(env)])
      return new Response(JSON.stringify({ autopilot, xpost }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      ok: true,
      worker: 'ProPost Empire Autopilot v2',
      endpoints: ['/trigger-autopilot', '/trigger-x-post', '/trigger-all'],
      schedule: 'autopilot every 5min, x-post every hour',
      cfApiToken: env.CF_API_TOKEN ? 'configured' : 'missing',
    }), { headers: { 'Content-Type': 'application/json' } })
  },
}

async function runAutopilot(env) {
  const base = env.PROPOST_URL || 'https://propost.vercel.app'
  try {
    const res = await fetch(`${base}/api/cron/autopilot`, {
      headers: { 'x-cron-secret': env.CRON_SECRET, 'User-Agent': 'ProPost-CF-Worker/2.0' },
    })
    const data = await res.json()
    console.log(`[autopilot] ${res.status} — agents:${data.agentsRun ?? 0} steps:${data.stepsExecuted ?? 0}`)
    return { ok: res.ok, ...data }
  } catch (err) {
    console.error('[autopilot] failed:', err)
    return { ok: false, error: String(err) }
  }
}

async function runXPost(env) {
  const base = env.PROPOST_URL || 'https://propost.vercel.app'
  try {
    const res = await fetch(`${base}/api/cron/x-post`, {
      headers: { 'x-cron-secret': env.CRON_SECRET, 'User-Agent': 'ProPost-CF-Worker/2.0' },
    })
    const data = await res.json()
    console.log(`[x-post] ${res.status} — tweetId:${data.tweetId ?? 'none'}`)
    return { ok: res.ok, ...data }
  } catch (err) {
    console.error('[x-post] failed:', err)
    return { ok: false, error: String(err) }
  }
}
