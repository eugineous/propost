/**
 * ProPost Empire — X Browser Poster
 * Posts to X/Twitter using Cloudflare Browser Rendering (Playwright)
 * No API key needed — logs in as Eugine and posts like a human
 *
 * Endpoints:
 *   POST /login   — save X session to KV (run once, lasts 30 days)
 *   POST /post    — post a tweet using saved session
 *   GET  /status  — check if session is valid
 */

import { launch } from '@cloudflare/playwright'

const COMPOSE_URL = 'https://x.com/compose/post'
const SESSION_KEY = 'x:browser:session'

export default {
  async fetch(request, env) {
    // Simple auth — require internal secret
    const secret = request.headers.get('x-internal-secret')
    if (secret !== env.INTERNAL_SECRET) {
      return json({ ok: false, error: 'Unauthorized' }, 401)
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/login') return handleLogin(request, env)
    if (request.method === 'POST' && url.pathname === '/post')  return handlePost(request, env)
    if (request.method === 'GET'  && url.pathname === '/status') return handleStatus(env)

    return json({
      ok: true,
      worker: 'ProPost X Browser Poster',
      endpoints: ['POST /login', 'POST /post', 'GET /status'],
    })
  },
}

// ── Login ─────────────────────────────────────────────────────
async function handleLogin(request, env) {
  const body = await request.json()
  const username = body.username || env.X_USERNAME
  const password = body.password || env.X_PASSWORD

  if (!username || !password) {
    return json({ ok: false, error: 'username and password required (or set X_USERNAME/X_PASSWORD secrets)' }, 400)
  }

  const browser = await launch(env.BROWSER)
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    await page.goto('https://x.com/login', { waitUntil: 'networkidle', timeout: 30000 })

    // Step 1: username
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    await page.fill('input[autocomplete="username"]', username)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2000)

    // Step 1b: X sometimes asks for phone/email as extra verification
    const extraVerify = await page.$('input[data-testid="ocfEnterTextTextInput"]')
    if (extraVerify) {
      await extraVerify.fill(username)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }

    // Step 2: password
    await page.waitForSelector('input[name="password"]', { timeout: 10000 })
    await page.fill('input[name="password"]', password)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(4000)

    // Verify logged in
    const currentUrl = page.url()
    if (!currentUrl.includes('/home') && !currentUrl.includes('x.com')) {
      throw new Error(`Login may have failed. Current URL: ${currentUrl}`)
    }

    // Save session state to KV (30 days)
    const storageState = await context.storageState()
    await env.KV.put(SESSION_KEY, JSON.stringify(storageState), { expirationTtl: 86400 * 30 })

    await browser.close()
    return json({ ok: true, message: 'Logged in. Session saved for 30 days.', url: currentUrl })

  } catch (err) {
    try { await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}

// ── Post ──────────────────────────────────────────────────────
async function handlePost(request, env) {
  const { content } = await request.json()

  if (!content) return json({ ok: false, error: 'content required' }, 400)
  if (content.length > 280) return json({ ok: false, error: `Too long: ${content.length} chars (max 280)` }, 400)

  const sessionRaw = await env.KV.get(SESSION_KEY)
  if (!sessionRaw) {
    return json({ ok: false, error: 'No session. Call POST /login first.' }, 401)
  }

  const storageState = JSON.parse(sessionRaw)
  const browser = await launch(env.BROWSER)
  const context = await browser.newContext({
    storageState,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    // Navigate to compose
    await page.goto(COMPOSE_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // If redirected to login, session expired
    if (page.url().includes('/login')) {
      await browser.close()
      await env.KV.delete(SESSION_KEY)
      return json({ ok: false, error: 'Session expired. Call POST /login again.' }, 401)
    }

    // Wait for compose textarea
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 })
    await page.click('[data-testid="tweetTextarea_0"]')
    await page.waitForTimeout(500)

    // Type content naturally (human-like delay)
    await page.keyboard.type(content, { delay: 25 })
    await page.waitForTimeout(1000)

    // Verify character count is ok (look for the counter)
    const charCount = await page.$('[data-testid="tweetButton"] [role="progressbar"]')
    if (charCount) {
      const ariaVal = await charCount.getAttribute('aria-valuenow')
      if (ariaVal && parseInt(ariaVal) < 0) {
        await browser.close()
        return json({ ok: false, error: 'Tweet too long after rendering' }, 400)
      }
    }

    // Click Post button
    await page.click('[data-testid="tweetButtonInline"]')
    await page.waitForTimeout(3000)

    // Check result
    const finalUrl = page.url()
    const success = !finalUrl.includes('/compose')

    // Refresh session TTL
    const newState = await context.storageState()
    await env.KV.put(SESSION_KEY, JSON.stringify(newState), { expirationTtl: 86400 * 30 })

    await browser.close()

    if (success) {
      return json({ ok: true, method: 'browser_automation', preview: content.slice(0, 80) })
    }
    return json({ ok: false, error: 'Post button clicked but still on compose page', url: finalUrl }, 500)

  } catch (err) {
    try { await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}

// ── Status ────────────────────────────────────────────────────
async function handleStatus(env) {
  const session = await env.KV.get(SESSION_KEY)
  return json({
    ok: true,
    hasSession: !!session,
    message: session ? 'Session active — ready to post' : 'No session — call POST /login',
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
