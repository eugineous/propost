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
  const browserPosterUrl = env.X_BROWSER_POSTER_URL || 'https://propost-x-poster.euginemicah.workers.dev'

  try {
    // Step 1: Ask Vercel to generate content via BLAZE (no posting)
    const genRes = await fetch(`${base}/api/cron/x-generate`, {
      headers: { 'x-cron-secret': env.CRON_SECRET, 'User-Agent': 'ProPost-CF-Worker/2.0' },
    })

    if (!genRes.ok) {
      console.warn(`[x-post] content generation failed: ${genRes.status}`)
      return { ok: false, error: `Content generation failed: ${genRes.status}` }
    }

    const { content } = await genRes.json()
    if (!content) {
      console.warn('[x-post] no content generated')
      return { ok: false, error: 'No content generated' }
    }

    // Step 2: Post via browser automation (no API credits needed)
    const postRes = await fetch(`${browserPosterUrl}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ content }),
    })

    const data = await postRes.json()
    console.log(`[x-post] browser poster ${postRes.status} — ok:${data.ok}`)

    // Step 3: Log the result back to Vercel DB
    if (data.ok) {
      await fetch(`${base}/api/cron/x-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': env.CRON_SECRET,
        },
        body: JSON.stringify({ content, method: 'browser_automation' }),
      }).catch(() => {}) // non-critical
    }

    return { ok: data.ok, method: 'browser_automation', ...data }
  } catch (err) {
    console.error('[x-post] failed:', err)
    return { ok: false, error: String(err) }
  }
}
