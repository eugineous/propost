/**
 * ProPost Empire — X Browser Poster
 * Posts to X/Twitter using Cloudflare Browser Rendering
 * No API key needed — logs in as Eugine and posts like a human
 *
 * Endpoints:
 *   POST /login   — save X session to KV (run once, lasts 30 days)
 *   POST /post    — post a tweet using saved session
 *   GET  /status  — check if session is valid
 */

import puppeteer from '@cloudflare/puppeteer'

const COMPOSE_URL = 'https://x.com/compose/post'
const SESSION_KEY = 'x:browser:session'

export default {
  async fetch(request, env) {
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
      worker: 'ProPost X Browser Poster v2',
      endpoints: ['POST /login', 'POST /post', 'GET /status'],
    })
  },
}

// ── Login ─────────────────────────────────────────────────────
async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}))
  const username = body.username || env.X_USERNAME
  const password = body.password || env.X_PASSWORD

  if (!username || !password) {
    return json({ ok: false, error: 'username and password required' }, 400)
  }

  let browser
  try {
    browser = await puppeteer.launch(env.BROWSER)
    const page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // Set viewport to look like a real browser
    await page.setViewport({ width: 1280, height: 800 })

    // Navigate to X login
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(4000)

    // Handle cookie consent if present
    try {
      const acceptBtn = await page.$('[data-testid="confirmationSheetConfirm"]')
      if (acceptBtn) { await acceptBtn.click(); await sleep(1000) }
    } catch {}

    // Wait for any text input to appear
    await page.waitForSelector('input', { timeout: 15000 })
    await sleep(1000)

    // Find the username/email input
    const inputs = await page.$$('input')
    let usernameInput = null
    for (const input of inputs) {
      const type = await page.evaluate(el => el.type, input)
      const autocomplete = await page.evaluate(el => el.getAttribute('autocomplete'), input)
      const name = await page.evaluate(el => el.name, input)
      if (type === 'text' || autocomplete === 'username' || name === 'text') {
        usernameInput = input
        break
      }
    }

    if (!usernameInput) {
      const url = page.url()
      await browser.close()
      return json({ ok: false, error: `Could not find username input. URL: ${url}` }, 500)
    }

    await usernameInput.type(username, { delay: 80 })
    await sleep(500)

    // Click Next
    await page.keyboard.press('Enter')
    await sleep(3000)

    // Step 1b: X sometimes asks for phone/email as extra verification
    const extraInput = await page.$('input[data-testid="ocfEnterTextTextInput"]')
    if (extraInput) {
      await extraInput.type(username, { delay: 80 })
      await sleep(500)
      const nextBtns2 = await page.$$('[role="button"]')
      for (const btn of nextBtns2) {
        const text = await page.evaluate(el => el.textContent, btn)
        if (text && text.trim().toLowerCase() === 'next') {
          await btn.click()
          break
        }
      }
      await sleep(3000)
    }

    // Step 2: Enter password — try multiple selectors
    const pwSelectors = ['input[name="password"]', 'input[type="password"]', 'input[autocomplete="current-password"]']
    let pwField = null
    for (const sel of pwSelectors) {
      pwField = await page.$(sel)
      if (pwField) break
    }

    if (!pwField) {
      // Take a screenshot to debug
      const screenshot = await page.screenshot({ encoding: 'base64' })
      const currentUrl = page.url()
      await browser.close()
      return json({
        ok: false,
        error: `Password field not found. Current URL: ${currentUrl}. X may be showing a CAPTCHA or unusual flow.`,
        debug: { url: currentUrl, screenshotBase64: screenshot.slice(0, 200) + '...' }
      }, 500)
    }

    await pwField.type(password, { delay: 80 })
    await sleep(500)

    // Click Log in button
    const loginBtns = await page.$$('[role="button"]')
    for (const btn of loginBtns) {
      const text = await page.evaluate(el => el.textContent, btn)
      if (text && (text.trim().toLowerCase() === 'log in' || text.trim().toLowerCase() === 'login')) {
        await btn.click()
        break
      }
    }
    await sleep(5000)

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      const screenshot = await page.screenshot({ encoding: 'base64' })
      await browser.close()
      return json({
        ok: false,
        error: `Login failed — still on login page. Check credentials or X may require 2FA.`,
        url: currentUrl,
        debug: { screenshotBase64: screenshot.slice(0, 200) + '...' }
      }, 500)
    }

    // Save cookies to KV
    const cookies = await page.cookies()
    await env.KV.put(SESSION_KEY, JSON.stringify(cookies), { expirationTtl: 86400 * 30 })

    await browser.close()
    return json({ ok: true, message: 'Logged in. Session saved for 30 days.', url: currentUrl })

  } catch (err) {
    try { if (browser) await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}

// ── Post ──────────────────────────────────────────────────────
async function handlePost(request, env) {
  const body = await request.json().catch(() => ({}))
  const { content } = body

  if (!content) return json({ ok: false, error: 'content required' }, 400)
  if (content.length > 280) return json({ ok: false, error: `Too long: ${content.length} chars (max 280)` }, 400)

  const cookiesRaw = await env.KV.get(SESSION_KEY)
  if (!cookiesRaw) {
    return json({ ok: false, error: 'No session. Call POST /login first.' }, 401)
  }

  let browser
  try {
    const cookies = JSON.parse(cookiesRaw)
    browser = await puppeteer.launch(env.BROWSER)
    const page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setCookie(...cookies)

    await page.goto(COMPOSE_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // Session expired check
    if (page.url().includes('/login')) {
      await browser.close()
      await env.KV.delete(SESSION_KEY)
      return json({ ok: false, error: 'Session expired. Call POST /login again.' }, 401)
    }

    // Wait for compose textarea
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 })
    await page.click('[data-testid="tweetTextarea_0"]')
    await sleep(500)

    // Type content with human-like delay
    await page.keyboard.type(content, { delay: 30 })
    await sleep(1000)

    // Click Post button
    await page.click('[data-testid="tweetButtonInline"]')
    await sleep(3000)

    const finalUrl = page.url()
    const success = !finalUrl.includes('/compose')

    // Refresh session cookies
    const newCookies = await page.cookies()
    await env.KV.put(SESSION_KEY, JSON.stringify(newCookies), { expirationTtl: 86400 * 30 })

    await browser.close()

    if (success) {
      return json({ ok: true, method: 'browser_automation', preview: content.slice(0, 80) })
    }
    return json({ ok: false, error: 'Still on compose page after clicking post', url: finalUrl }, 500)

  } catch (err) {
    try { if (browser) await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}

// ── Status ────────────────────────────────────────────────────
async function handleStatus(env) {
  const session = await env.KV.get(SESSION_KEY)
  return json({
    ok: true,
    hasSession: !!session,
    browserEnabled: true,
    message: session ? 'Session active — ready to post' : 'No session — call POST /login',
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
