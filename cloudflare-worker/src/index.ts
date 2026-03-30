// ============================================================
// ProPost Empire — Cloudflare Worker Webhook Receiver
// ============================================================

export interface Env {
  WEBHOOK_KV: KVNamespace
  VERCEL_URL: string
  X_WEBHOOK_SECRET: string
  INSTAGRAM_APP_SECRET: string
  FACEBOOK_APP_SECRET: string
  LINKEDIN_CLIENT_SECRET: string
  INTERNAL_SECRET: string
  CRON_SECRET: string
  WEBHOOK_VERIFY_TOKEN: string
}

type Platform = 'x' | 'instagram' | 'facebook' | 'linkedin'

function getPlatformFromPath(pathname: string): Platform | null {
  if (pathname.startsWith('/webhook/x')) return 'x'
  if (pathname.startsWith('/webhook/instagram')) return 'instagram'
  if (pathname.startsWith('/webhook/facebook')) return 'facebook'
  if (pathname.startsWith('/webhook/linkedin')) return 'linkedin'
  return null
}

async function hmacSha256(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function validateSignature(
  platform: Platform,
  req: Request,
  body: string,
  env: Env
): Promise<boolean> {
  try {
    if (platform === 'x') {
      const sig = req.headers.get('x-twitter-webhooks-signature') ?? ''
      const expected = 'sha256=' + (await hmacSha256(env.X_WEBHOOK_SECRET, body))
      return sig === expected
    }

    if (platform === 'instagram' || platform === 'facebook') {
      const sig = req.headers.get('x-hub-signature-256') ?? ''
      const secret = platform === 'instagram' ? env.INSTAGRAM_APP_SECRET : env.FACEBOOK_APP_SECRET
      const expected = 'sha256=' + (await hmacSha256(secret, body))
      return sig === expected
    }

    if (platform === 'linkedin') {
      // LinkedIn uses client secret for webhook validation
      const sig = req.headers.get('x-li-signature') ?? ''
      const expected = await hmacSha256(env.LINKEDIN_CLIENT_SECRET, body)
      return sig === expected
    }

    return false
  } catch {
    return false
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const platform = getPlatformFromPath(url.pathname)

    if (!platform) {
      return new Response('Not Found', { status: 404 })
    }

    // ----------------------------------------------------------------
    // Meta webhook verification (GET challenge-response handshake).
    // Meta sends a GET request to verify the endpoint before it will
    // deliver any events. We must echo back hub.challenge when the
    // verify token matches.
    // ----------------------------------------------------------------
    if (
      request.method === 'GET' &&
      (platform === 'instagram' || platform === 'facebook')
    ) {
      const mode = url.searchParams.get('hub.mode')
      const verifyToken = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      if (mode === 'subscribe' && verifyToken === env.WEBHOOK_VERIFY_TOKEN && challenge) {
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      return new Response('Forbidden', { status: 403 })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const body = await request.text()

    // Validate HMAC signature
    const valid = await validateSignature(platform, request, body, env)
    if (!valid) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Store raw event in KV with 300s TTL
    const kvKey = `webhook:${platform}:${Date.now()}`
    await env.WEBHOOK_KV.put(kvKey, body, { expirationTtl: 300 })

    // Fire-and-forget forward to Vercel API
    const forwardUrl = `${env.VERCEL_URL}/api/webhooks/${platform}`
    fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_SECRET,
      },
      body,
    }).catch((err) => console.error('[worker] Forward failed:', err))

    return new Response('OK', { status: 200 })
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Always-on autopilot tick: keeps the empire working even when dashboard is closed.
    const url = `${env.VERCEL_URL}/api/cron/autopilot`
    ctx.waitUntil(
      fetch(url, {
        headers: {
          'x-cron-secret': env.CRON_SECRET,
          'x-internal-secret': env.INTERNAL_SECRET,
        },
      }).catch(() => {})
    )
  },
}
