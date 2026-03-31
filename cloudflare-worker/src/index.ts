// ============================================================
// ProPost Empire — Cloudflare Worker v4.0
//
// CAPABILITIES:
//   1. All cron triggers (health, content-schedule, ai-news, analytics, x-post)
//   2. Webhook reception + HMAC verification + KV audit storage + forwarding
//   3. CF Queues — reliable task delivery with dead-letter handling
//   4. CF KV — fast agent state reads for dashboard SSE
//   5. CF Workers AI — third AI fallback (Llama 3)
//   6. CF Analytics Engine — real-time event tracking
//   7. Edge rate limiting — per-IP protection before hitting Vercel
//   8. CF AI Gateway — proxy for Gemini + NVIDIA with caching + logging
//   9. Durable Objects — per-company live task state coordination
// ============================================================

export interface Env {
  // KV namespaces
  WEBHOOK_KV: KVNamespace
  AGENT_STATE_KV: KVNamespace

  // Queues
  TASK_QUEUE: Queue
  DEAD_LETTER_QUEUE: Queue

  // Workers AI
  AI: Ai

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset

  // Durable Objects
  COMPANY_STATE: DurableObjectNamespace

  // Secrets
  PROPOST_URL: string
  CRON_SECRET: string
  INTERNAL_SECRET: string
  WEBHOOK_VERIFY_TOKEN: string
  X_WEBHOOK_SECRET: string
  INSTAGRAM_APP_SECRET: string
  FACEBOOK_APP_SECRET: string
  LINKEDIN_CLIENT_SECRET: string
  X_BROWSER_POSTER_URL: string
  CF_AI_GATEWAY_URL: string
}

// ─── Rate limiting (in-memory per isolate, resets on worker restart) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ─── Cron jobs ────────────────────────────────────────────────────────────────

interface CronJob {
  path: string
  label: string
  shouldRun: (now: Date) => boolean
}

const CRON_JOBS: CronJob[] = [
  { path: '/api/cron/health', label: 'health-check', shouldRun: () => true },
  { path: '/api/agents/work', label: 'agent-work', shouldRun: () => true },
  { path: '/api/cron/daily-workflows', label: 'daily-workflows', shouldRun: () => true },
  { path: '/api/cron/content-schedule', label: 'content-schedule', shouldRun: (d) => d.getUTCMinutes() % 15 === 0 },
  { path: '/api/cron/ai-news', label: 'ai-news', shouldRun: (d) => d.getUTCMinutes() === 0 && [3, 9, 15, 21].includes(d.getUTCHours()) },
  { path: '/api/cron/analytics', label: 'analytics', shouldRun: (d) => d.getUTCHours() === 2 && d.getUTCMinutes() === 0 },
  { path: '/api/cron/x-post', label: 'x-post', shouldRun: (d) => d.getUTCMinutes() === 0 },
  // Replies: 3x per day at 6AM, 10AM, 3PM UTC (= 9AM, 1PM, 6PM EAT)
  { path: '/api/cron/replies', label: 'replies', shouldRun: (d) => d.getUTCMinutes() === 0 && [6, 10, 15].includes(d.getUTCHours()) },
]

async function runCronJob(job: CronJob, env: Env): Promise<{ label: string; ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(`${env.PROPOST_URL}${job.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
        'x-internal-secret': env.INTERNAL_SECRET,
        'User-Agent': 'ProPost-CF-Worker/4.0',
        'Content-Type': 'application/json',
      },
    })

    // Track in Analytics Engine
    env.ANALYTICS.writeDataPoint({
      blobs: [job.label, res.ok ? 'success' : 'failure'],
      doubles: [res.status],
      indexes: [job.label],
    })

    console.log(`[cron/${job.label}] ${res.status}`)
    return { label: job.label, ok: res.ok, status: res.status }
  } catch (err) {
    console.error(`[cron/${job.label}] failed:`, err)
    // Push to dead-letter queue for retry
    await env.DEAD_LETTER_QUEUE.send({ type: 'cron_failure', job: job.label, error: String(err), timestamp: Date.now() })
    return { label: job.label, ok: false, error: String(err) }
  }
}

// ─── HMAC helpers ─────────────────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Platform = 'x' | 'instagram' | 'facebook' | 'linkedin'

async function validateSignature(platform: Platform, req: Request, body: string, env: Env): Promise<boolean> {
  try {
    if (platform === 'x') {
      const sig = req.headers.get('x-twitter-webhooks-signature') ?? ''
      return sig === `sha256=${await hmacSha256Hex(env.X_WEBHOOK_SECRET, body)}`
    }
    if (platform === 'instagram') {
      const sig = req.headers.get('x-hub-signature-256') ?? ''
      return sig === `sha256=${await hmacSha256Hex(env.INSTAGRAM_APP_SECRET, body)}`
    }
    if (platform === 'facebook') {
      const sig = req.headers.get('x-hub-signature-256') ?? ''
      return sig === `sha256=${await hmacSha256Hex(env.FACEBOOK_APP_SECRET, body)}`
    }
    if (platform === 'linkedin') {
      const sig = req.headers.get('x-li-signature') ?? ''
      return sig === await hmacSha256Hex(env.LINKEDIN_CLIENT_SECRET, body)
    }
    return false
  } catch { return false }
}

function getPlatform(pathname: string): Platform | null {
  if (pathname.startsWith('/webhook/x')) return 'x'
  if (pathname.startsWith('/webhook/instagram')) return 'instagram'
  if (pathname.startsWith('/webhook/facebook')) return 'facebook'
  if (pathname.startsWith('/webhook/linkedin')) return 'linkedin'
  return null
}

// ─── Workers AI fallback ──────────────────────────────────────────────────────

async function workersAIGenerate(env: Env, prompt: string): Promise<string> {
  try {
    const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are ProPost, a social media content expert. Be concise, sharp, and human.' },
        { role: 'user', content: prompt },
      ],
    }) as { response?: string }
    return result.response ?? ''
  } catch (err) {
    console.error('[workers-ai] failed:', err)
    return ''
  }
}

// ─── Agent state KV helpers ───────────────────────────────────────────────────

async function setAgentState(env: Env, agentName: string, state: Record<string, unknown>): Promise<void> {
  await env.AGENT_STATE_KV.put(
    `agent:${agentName}`,
    JSON.stringify({ ...state, updatedAt: Date.now() }),
    { expirationTtl: 3600 } // 1 hour TTL — agents refresh via heartbeat
  )
}

async function getAgentState(env: Env, agentName: string): Promise<Record<string, unknown> | null> {
  const raw = await env.AGENT_STATE_KV.get(`agent:${agentName}`)
  return raw ? JSON.parse(raw) : null
}

// ─── Durable Object: CompanyState ─────────────────────────────────────────────

export class CompanyState {
  private state: DurableObjectState
  private tasks: Map<string, unknown> = new Map()

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/task') {
      const task = await request.json()
      const id = crypto.randomUUID()
      this.tasks.set(id, task)
      await this.state.storage.put(`task:${id}`, task)
      return Response.json({ id })
    }

    if (request.method === 'GET' && url.pathname === '/tasks') {
      const all = await this.state.storage.list({ prefix: 'task:' })
      return Response.json(Object.fromEntries(all))
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (id) {
        this.tasks.delete(id)
        await this.state.storage.delete(`task:${id}`)
      }
      return Response.json({ ok: true })
    }

    return new Response('Not Found', { status: 404 })
  }
}

// ─── Queue consumer ───────────────────────────────────────────────────────────

async function handleQueueMessage(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    const data = msg.body as Record<string, unknown>
    console.log(`[queue] Processing message type: ${data.type}`)

    try {
      if (data.type === 'cron_task') {
        // Retry failed cron job
        const job = CRON_JOBS.find((j) => j.label === data.job)
        if (job) await runCronJob(job, env)
      } else if (data.type === 'ai_fallback') {
        // Use Workers AI as fallback
        const result = await workersAIGenerate(env, data.prompt as string)
        if (result) {
          // Forward result back to Vercel
          await fetch(`${env.PROPOST_URL}/api/command`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': env.INTERNAL_SECRET,
            },
            body: JSON.stringify({ message: result, source: 'workers_ai_fallback' }),
          })
        }
      }
      msg.ack()
    } catch (err) {
      console.error('[queue] Message processing failed:', err)
      msg.retry()
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default {
  // ── Scheduled: all crons ──────────────────────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date()
    const jobs = CRON_JOBS.filter((j) => j.shouldRun(now))
    console.log(`[scheduled] ${now.toISOString()} — ${jobs.length} job(s): ${jobs.map((j) => j.label).join(', ')}`)

    ctx.waitUntil(
      Promise.all(jobs.map((job) => runCronJob(job, env))).then((results) => {
        const failed = results.filter((r) => !r.ok)
        if (failed.length > 0) {
          console.error(`[scheduled] ${failed.length} failed:`, failed.map((r) => r.label).join(', '))
        }
      })
    )
  },

  // ── Queue consumer ────────────────────────────────────────────────────────
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    await handleQueueMessage(batch, env)
  },

  // ── Fetch: webhooks + API ─────────────────────────────────────────────────
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'

    // ── Security headers on all responses ─────────────────────────────────
    const secHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }

    // ── Rate limiting ──────────────────────────────────────────────────────
    if (!checkRateLimit(ip)) {
      env.ANALYTICS.writeDataPoint({ blobs: ['rate_limited', ip], doubles: [1], indexes: ['security'] })
      return new Response('Too Many Requests', { status: 429, headers: secHeaders })
    }

    // ── Health ─────────────────────────────────────────────────────────────
    if (pathname === '/' || pathname === '/health') {
      return Response.json({
        ok: true,
        worker: 'ProPost Empire CF Worker v4.0',
        capabilities: ['crons', 'webhooks', 'queues', 'kv-agent-state', 'workers-ai', 'analytics-engine', 'durable-objects', 'rate-limiting'],
        cronJobs: CRON_JOBS.map((j) => j.label),
      }, { headers: secHeaders })
    }

    // ── Agent state read (for dashboard SSE) ──────────────────────────────
    if (pathname.startsWith('/agent-state/') && request.method === 'GET') {
      const auth = request.headers.get('authorization')
      if (auth !== `Bearer ${env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
      const agentName = pathname.replace('/agent-state/', '')
      const state = await getAgentState(env, agentName)
      return Response.json(state ?? { status: 'unknown' }, { headers: secHeaders })
    }

    // ── Agent state write (from Vercel) ───────────────────────────────────
    if (pathname.startsWith('/agent-state/') && request.method === 'PUT') {
      const internalSecret = request.headers.get('x-internal-secret')
      if (internalSecret !== env.INTERNAL_SECRET) return new Response('Forbidden', { status: 403 })
      const agentName = pathname.replace('/agent-state/', '')
      const body = await request.json() as Record<string, unknown>
      await setAgentState(env, agentName, body)
      return Response.json({ ok: true }, { headers: secHeaders })
    }

    // ── Workers AI fallback endpoint ──────────────────────────────────────
    if (pathname === '/ai/generate' && request.method === 'POST') {
      const internalSecret = request.headers.get('x-internal-secret')
      if (internalSecret !== env.INTERNAL_SECRET) return new Response('Forbidden', { status: 403 })
      const { prompt } = await request.json() as { prompt: string }
      const result = await workersAIGenerate(env, prompt)
      env.ANALYTICS.writeDataPoint({ blobs: ['workers_ai_call', 'success'], doubles: [1], indexes: ['ai'] })
      return Response.json({ content: result }, { headers: secHeaders })
    }

    // ── Manual cron trigger ───────────────────────────────────────────────
    if (pathname === '/trigger' && request.method === 'POST') {
      const auth = request.headers.get('authorization')
      if (auth !== `Bearer ${env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
      const body = await request.json().catch(() => ({})) as { job?: string }
      const jobs = body.job ? CRON_JOBS.filter((j) => j.label === body.job) : CRON_JOBS
      ctx.waitUntil(Promise.all(jobs.map((j) => runCronJob(j, env))))
      return Response.json({ triggered: jobs.map((j) => j.label) }, { headers: secHeaders })
    }

    // ── Queue task (from Vercel for reliable delivery) ────────────────────
    if (pathname === '/queue/task' && request.method === 'POST') {
      const internalSecret = request.headers.get('x-internal-secret')
      if (internalSecret !== env.INTERNAL_SECRET) return new Response('Forbidden', { status: 403 })
      const task = await request.json()
      await env.TASK_QUEUE.send(task)
      return Response.json({ queued: true }, { headers: secHeaders })
    }

    // ── Webhook handling ──────────────────────────────────────────────────
    const platform = getPlatform(pathname)
    if (!platform) return new Response('Not Found', { status: 404, headers: secHeaders })

    // Meta hub challenge (GET)
    if (request.method === 'GET' && (platform === 'instagram' || platform === 'facebook')) {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain', ...secHeaders } })
      }
      return new Response('Forbidden', { status: 403, headers: secHeaders })
    }

    // X CRC challenge (GET)
    if (request.method === 'GET' && platform === 'x') {
      const crcToken = url.searchParams.get('crc_token')
      if (!crcToken) return new Response('Missing crc_token', { status: 400 })
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey('raw', enc.encode(env.X_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(crcToken))
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      return Response.json({ response_token: `sha256=${b64}` }, { headers: secHeaders })
    }

    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: secHeaders })

    const rawBody = await request.text()

    // Validate HMAC — reject immediately on failure
    const valid = await validateSignature(platform, request, rawBody, env)
    if (!valid) {
      console.warn(`[webhook/${platform}] Invalid signature from ${ip}`)
      env.ANALYTICS.writeDataPoint({ blobs: ['webhook_rejected', platform, ip], doubles: [1], indexes: ['security'] })
      return new Response('Forbidden', { status: 403, headers: secHeaders })
    }

    // Store in KV (5-min TTL for audit)
    const kvKey = `webhook:${platform}:${Date.now()}`
    await env.WEBHOOK_KV.put(kvKey, rawBody, { expirationTtl: 300 })

    // Track in Analytics Engine
    env.ANALYTICS.writeDataPoint({ blobs: ['webhook_received', platform], doubles: [1], indexes: ['webhooks'] })

    // Forward to Vercel (fire-and-forget via ctx.waitUntil)
    ctx.waitUntil(
      fetch(`${env.PROPOST_URL}/api/webhooks/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_SECRET,
          ...(platform === 'x' && { 'x-twitter-webhooks-signature': request.headers.get('x-twitter-webhooks-signature') ?? '' }),
          ...((platform === 'instagram' || platform === 'facebook') && { 'x-hub-signature-256': request.headers.get('x-hub-signature-256') ?? '' }),
        },
        body: rawBody,
      }).catch((err) => console.error(`[webhook/${platform}] Forward failed:`, err))
    )

    return new Response('OK', { status: 200, headers: secHeaders })
  },
}
