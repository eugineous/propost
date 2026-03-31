/**
 * ProPost Empire — Universal Browser Poster v3
 * Handles browser-based login and posting for ALL platforms
 * Uses Cloudflare Browser Rendering (Puppeteer) — paid plan required
 *
 * Endpoints:
 *   GET  /status/:platform        — check session status
 *   POST /login/:platform         — log in and save session to KV
 *   POST /post/:platform          — post content using saved session
 *   POST /logout/:platform        — clear saved session
 *   GET  /health                  — worker health check
 *
 * Session keys in KV: browser:session:{platform}
 */

import puppeteer from '@cloudflare/puppeteer'

// ─── Platform login configs ───────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  x: {
    loginUrl: 'https://x.com/login',
    homeIndicator: '/home',
    composeUrl: 'https://x.com/compose/post',
    usernameSelector: 'input[autocomplete="username"], input[name="text"]',
    passwordSelector: 'input[name="password"], input[type="password"]',
    postButtonSelector: '[data-testid="tweetButtonInline"]',
    textareaSelector: '[data-testid="tweetTextarea_0"]',
  },
  instagram: {
    loginUrl: 'https://www.instagram.com/accounts/login/',
    homeIndicator: '/instagram.com',
    usernameSelector: 'input[name="username"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: 'button[type="submit"]',
  },
  facebook: {
    loginUrl: 'https://www.facebook.com/login',
    homeIndicator: 'facebook.com/home',
    usernameSelector: '#email',
    passwordSelector: '#pass',
    submitSelector: 'button[name="login"]',
  },
  linkedin: {
    loginUrl: 'https://www.linkedin.com/login',
    homeIndicator: 'linkedin.com/feed',
    usernameSelector: '#username',
    passwordSelector: '#password',
    submitSelector: 'button[type="submit"]',
  },
  tiktok: {
    loginUrl: 'https://www.tiktok.com/login/phone-or-email/email',
    homeIndicator: 'tiktok.com/foryou',
    usernameSelector: 'input[name="username"], input[placeholder*="email"], input[type="text"]',
    passwordSelector: 'input[type="password"]',
    submitSelector: 'button[type="submit"]',
  },
  youtube: {
    loginUrl: 'https://accounts.google.com/signin/v2/identifier?service=youtube',
    homeIndicator: 'youtube.com',
    usernameSelector: 'input[type="email"]',
    passwordSelector: 'input[type="password"]',
    submitSelector: '#identifierNext, #passwordNext',
  },
  reddit: {
    loginUrl: 'https://www.reddit.com/login/',
    homeIndicator: 'reddit.com',
    usernameSelector: '#loginUsername, input[name="username"]',
    passwordSelector: '#loginPassword, input[name="password"]',
    submitSelector: 'button[type="submit"]',
  },
  mastodon: {
    loginUrl: 'https://mastodon.social/auth/sign_in',
    homeIndicator: 'mastodon.social/home',
    usernameSelector: '#user_email',
    passwordSelector: '#user_password',
    submitSelector: 'button[type="submit"]',
  },
  truthsocial: {
    loginUrl: 'https://truthsocial.com/login',
    homeIndicator: 'truthsocial.com/home',
    usernameSelector: 'input[name="username"], input[type="text"]',
    passwordSelector: 'input[name="password"], input[type="password"]',
    submitSelector: 'button[type="submit"]',
  },
}

const SESSION_KEY = (platform) => `browser:session:${platform}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getCredentials(platform, env) {
  // Each platform has its own username/password stored as CF secrets
  // Naming convention: {PLATFORM}_USERNAME, {PLATFORM}_PASSWORD
  const prefix = platform.toUpperCase()
  return {
    username: env[`${prefix}_USERNAME`] || env.X_USERNAME || '',
    password: env[`${prefix}_PASSWORD`] || env.X_PASSWORD || '',
  }
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const secret = request.headers.get('x-internal-secret')
    if (secret !== env.INTERNAL_SECRET) {
      return json({ ok: false, error: 'Unauthorized' }, 401)
    }

    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)
    const action = parts[0]
    const platform = parts[1]

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return json({
        ok: true,
        worker: 'ProPost Universal Browser Poster v3',
        platforms: Object.keys(PLATFORM_CONFIG),
        browserEnabled: !!env.BROWSER,
      })
    }

    // Status check
    if (request.method === 'GET' && action === 'status') {
      if (!platform) {
        // Return all statuses
        const statuses = {}
        for (const p of Object.keys(PLATFORM_CONFIG)) {
          const session = await env.KV.get(SESSION_KEY(p))
          statuses[p] = { hasSession: !!session }
        }
        return json(statuses)
      }
      const session = await env.KV.get(SESSION_KEY(platform))
      return json({ ok: true, platform, hasSession: !!session, browserEnabled: !!env.BROWSER })
    }

    // Login
    if (request.method === 'POST' && action === 'login' && platform) {
      return handleLogin(platform, request, env)
    }

    // Post content
    if (request.method === 'POST' && action === 'post' && platform) {
      return handlePost(platform, request, env)
    }

    // Logout / clear session
    if (request.method === 'POST' && action === 'logout' && platform) {
      await env.KV.delete(SESSION_KEY(platform))
      return json({ ok: true, message: `${platform} session cleared` })
    }

    return json({ ok: false, error: 'Not found' }, 404)
  },
}

// ─── Login handler ────────────────────────────────────────────────────────────

async function handleLogin(platform, request, env) {
  const config = PLATFORM_CONFIG[platform]
  if (!config) return json({ ok: false, error: `Unknown platform: ${platform}` }, 400)

  if (!env.BROWSER) {
    return json({ ok: false, error: 'Browser Rendering API not enabled on this worker' }, 503)
  }

  const body = await request.json().catch(() => ({}))
  const creds = getCredentials(platform, env)
  const username = body.username || creds.username
  const password = body.password || creds.password

  if (!username || !password) {
    return json({
      ok: false,
      error: `No credentials for ${platform}. Set ${platform.toUpperCase()}_USERNAME and ${platform.toUpperCase()}_PASSWORD as worker secrets.`,
    }, 400)
  }

  let browser
  try {
    browser = await puppeteer.launch(env.BROWSER)
    const page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1280, height: 800 })

    // Navigate to login page
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(3000)

    // Handle cookie consent banners (common on EU-facing sites)
    for (const selector of ['[data-testid="cookie-policy-manage-dialog-accept-button"]', 'button[id*="accept"]', 'button[class*="accept"]']) {
      try {
        const btn = await page.$(selector)
        if (btn) { await btn.click(); await sleep(1000); break }
      } catch {}
    }

    // Find and fill username
    await page.waitForSelector(config.usernameSelector, { timeout: 15000 })
    await sleep(500)
    const usernameField = await page.$(config.usernameSelector)
    if (!usernameField) throw new Error(`Username field not found on ${platform} login page`)

    await usernameField.click()
    await sleep(300)
    await usernameField.type(username, { delay: 60 + Math.random() * 40 })
    await sleep(800)

    // For platforms that need "Next" before password (X, Google)
    if (platform === 'x' || platform === 'youtube') {
      await page.keyboard.press('Enter')
      await sleep(3000)

      // X: handle extra verification step
      if (platform === 'x') {
        const extraInput = await page.$('input[data-testid="ocfEnterTextTextInput"]')
        if (extraInput) {
          await extraInput.type(username, { delay: 60 })
          await page.keyboard.press('Enter')
          await sleep(2000)
        }
      }
    }

    // Find and fill password
    const pwSelectors = config.passwordSelector.split(', ')
    let pwField = null
    for (const sel of pwSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 })
        pwField = await page.$(sel)
        if (pwField) break
      } catch {}
    }

    if (!pwField) {
      const currentUrl = page.url()
      await browser.close()
      return json({
        ok: false,
        error: `Password field not found on ${platform}. Current URL: ${currentUrl}. Platform may require 2FA or CAPTCHA.`,
      }, 500)
    }

    await pwField.click()
    await sleep(300)
    await pwField.type(password, { delay: 60 + Math.random() * 40 })
    await sleep(800)

    // Submit
    if (config.submitSelector) {
      const submitSelectors = config.submitSelector.split(', ')
      for (const sel of submitSelectors) {
        try {
          const btn = await page.$(sel)
          if (btn) { await btn.click(); break }
        } catch {}
      }
    } else {
      await page.keyboard.press('Enter')
    }

    await sleep(5000)

    const finalUrl = page.url()

    // Check if still on login page
    if (finalUrl.includes('/login') || finalUrl.includes('signin') || finalUrl.includes('accounts.google.com')) {
      await browser.close()
      return json({
        ok: false,
        error: `Login failed for ${platform} — still on login page. Check credentials or platform may require 2FA. URL: ${finalUrl}`,
      }, 500)
    }

    // Save cookies to KV (30 days)
    const cookies = await page.cookies()
    await env.KV.put(SESSION_KEY(platform), JSON.stringify(cookies), { expirationTtl: 86400 * 30 })

    await browser.close()
    return json({
      ok: true,
      platform,
      message: `✅ ${platform} logged in. Session saved for 30 days.`,
      url: finalUrl,
    })

  } catch (err) {
    try { if (browser) await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}

// ─── Post handler ─────────────────────────────────────────────────────────────

async function handlePost(platform, request, env) {
  const config = PLATFORM_CONFIG[platform]
  if (!config) return json({ ok: false, error: `Unknown platform: ${platform}` }, 400)

  const body = await request.json().catch(() => ({}))
  const { content } = body
  if (!content) return json({ ok: false, error: 'content required' }, 400)

  const cookiesRaw = await env.KV.get(SESSION_KEY(platform))
  if (!cookiesRaw) {
    return json({ ok: false, error: `No session for ${platform}. Call POST /login/${platform} first.` }, 401)
  }

  // Currently only X has full post automation implemented
  // Other platforms: queue for approval or use API
  if (platform !== 'x') {
    return json({
      ok: false,
      error: `Browser posting for ${platform} not yet implemented. Content queued for approval.`,
      queued: true,
    }, 501)
  }

  let browser
  try {
    const cookies = JSON.parse(cookiesRaw)
    browser = await puppeteer.launch(env.BROWSER)
    const page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    await page.setCookie(...cookies)
    await page.goto(config.composeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(3000)

    if (page.url().includes('/login')) {
      await browser.close()
      await env.KV.delete(SESSION_KEY(platform))
      return json({ ok: false, error: 'Session expired. Re-login required.' }, 401)
    }

    await page.waitForSelector(config.textareaSelector, { timeout: 15000 })
    await page.click(config.textareaSelector)
    await sleep(500)
    await page.keyboard.type(content.slice(0, 280), { delay: 30 })
    await sleep(1000)
    await page.click(config.postButtonSelector)
    await sleep(3000)

    const finalUrl = page.url()
    const success = !finalUrl.includes('/compose')

    // Refresh session
    const newCookies = await page.cookies()
    await env.KV.put(SESSION_KEY(platform), JSON.stringify(newCookies), { expirationTtl: 86400 * 30 })

    await browser.close()

    if (success) return json({ ok: true, method: 'browser', platform, preview: content.slice(0, 80) })
    return json({ ok: false, error: 'Post button clicked but still on compose page' }, 500)

  } catch (err) {
    try { if (browser) await browser.close() } catch {}
    return json({ ok: false, error: String(err) }, 500)
  }
}
