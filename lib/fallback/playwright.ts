// Playwright automation wrapper — fallback for platform API failures
// Simulates human-like behavior: random keystroke delays, mouse movement, pauses
// Requires saved session cookies at lib/fallback/sessions/{platform}.json
// If Playwright is not installed or session doesn't exist, returns { success: false }

import type { Platform } from '../types'
import * as fs from 'fs'
import * as path from 'path'

export interface PlaywrightTask {
  platform: Platform
  action: 'post' | 'reply'
  content: string
  targetUrl?: string
}

// Use `any` for Playwright types since it's an optional dev dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PwPage = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PwBrowser = any

const SESSIONS_DIR = path.join(process.cwd(), 'lib', 'fallback', 'sessions')

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sessionPath(platform: Platform): string {
  return path.join(SESSIONS_DIR, `${platform}.json`)
}

function loadSession(platform: Platform): unknown[] | null {
  const p = sessionPath(platform)
  if (!fs.existsSync(p)) return null
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSession(platform: Platform, cookies: unknown[]): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
  fs.writeFileSync(sessionPath(platform), JSON.stringify(cookies, null, 2))
}

export async function executeWithPlaywright(
  task: PlaywrightTask
): Promise<{ success: boolean; postId?: string }> {
  // Check if Playwright is available (it's an optional dev dependency)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any
  try {
    // Use Function constructor to avoid static import analysis on optional dep
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const pw = await new Function('m', 'return import(m)')('playwright').catch(() => null)
    if (!pw) {
      console.warn('[playwright] Playwright not installed — returning { success: false }')
      return { success: false }
    }
    chromium = pw.chromium
  } catch {
    console.warn('[playwright] Playwright not installed — returning { success: false }')
    return { success: false }
  }

  // Check if session exists
  const cookies = loadSession(task.platform)
  if (!cookies) {
    console.warn(`[playwright] No session found for ${task.platform} — manual setup required`)
    return { success: false }
  }

  let browser: PwBrowser = null
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()

    // Load saved session cookies
    await context.addCookies(cookies)

    const page: PwPage = await context.newPage()

    // Navigate to platform
    const platformUrls: Partial<Record<Platform, string>> = {
      x: 'https://x.com/compose/tweet',
      instagram: 'https://www.instagram.com/',
      facebook: 'https://www.facebook.com/',
      linkedin: 'https://www.linkedin.com/feed/',
    }

    const url = task.targetUrl ?? platformUrls[task.platform]
    if (!url) return { success: false }

    await page.goto(url, { waitUntil: 'networkidle' })

    // Random pause after navigation (500ms–2000ms)
    await sleep(randomBetween(500, 2000))

    // Random mouse movement before clicking
    await page.mouse.move(
      randomBetween(100, 800),
      randomBetween(100, 600)
    )
    await sleep(randomBetween(200, 500))

    // Platform-specific posting logic
    let postId: string | undefined

    if (task.platform === 'x') {
      postId = await postToX(page, task.content)
    } else if (task.platform === 'instagram') {
      postId = await postToInstagram(page, task.content)
    } else if (task.platform === 'facebook') {
      postId = await postToFacebook(page, task.content)
    } else if (task.platform === 'linkedin') {
      postId = await postToLinkedIn(page, task.content)
    }

    // Save updated cookies
    const updatedCookies = await context.cookies()
    saveSession(task.platform, updatedCookies)

    await browser.close()
    return { success: true, postId }
  } catch (err) {
    console.error('[playwright] Automation failed:', err)
    if (browser) await browser.close().catch(() => {})
    return { success: false }
  }
}

async function typeHumanLike(
  page: PwPage,
  selector: string,
  text: string
): Promise<void> {
  await page.click(selector)
  for (const char of text) {
    await page.keyboard.type(char)
    await sleep(randomBetween(50, 150))
  }
}

async function postToX(page: PwPage, content: string): Promise<string | undefined> {
  const composeSelector = '[data-testid="tweetTextarea_0"]'
  await page.waitForSelector(composeSelector, { timeout: 10000 })
  await typeHumanLike(page, composeSelector, content)

  await sleep(randomBetween(500, 1500))

  const tweetBtn = '[data-testid="tweetButtonInline"]'
  await page.waitForSelector(tweetBtn)
  await page.mouse.move(randomBetween(100, 400), randomBetween(100, 400))
  await sleep(randomBetween(200, 600))
  await page.click(tweetBtn)

  await sleep(randomBetween(1000, 2000))

  const currentUrl = page.url()
  const match = currentUrl.match(/status\/(\d+)/)
  return match?.[1]
}

async function postToInstagram(page: PwPage, content: string): Promise<string | undefined> {
  await page.waitForSelector('svg[aria-label="New post"]', { timeout: 10000 })
  await page.click('svg[aria-label="New post"]')
  await sleep(randomBetween(500, 1500))

  const captionSelector = 'textarea[aria-label="Write a caption..."]'
  try {
    await page.waitForSelector(captionSelector, { timeout: 5000 })
    await typeHumanLike(page, captionSelector, content)
  } catch {
    return undefined
  }

  return undefined
}

async function postToFacebook(page: PwPage, content: string): Promise<string | undefined> {
  const composeSelector = '[data-testid="status-attachment-mentions-input"]'
  try {
    await page.waitForSelector(composeSelector, { timeout: 10000 })
    await typeHumanLike(page, composeSelector, content)
    await sleep(randomBetween(500, 1500))

    const postBtn = '[data-testid="react-composer-post-button"]'
    await page.click(postBtn)
    await sleep(randomBetween(1000, 2000))
  } catch {
    return undefined
  }
  return undefined
}

async function postToLinkedIn(page: PwPage, content: string): Promise<string | undefined> {
  const startPostBtn = 'button.share-box-feed-entry__trigger'
  try {
    await page.waitForSelector(startPostBtn, { timeout: 10000 })
    await page.click(startPostBtn)
    await sleep(randomBetween(500, 1500))

    const editorSelector = '.ql-editor'
    await page.waitForSelector(editorSelector, { timeout: 5000 })
    await typeHumanLike(page, editorSelector, content)
    await sleep(randomBetween(500, 1500))

    const postBtn = 'button.share-actions__primary-action'
    await page.click(postBtn)
    await sleep(randomBetween(1000, 2000))
  } catch {
    return undefined
  }
  return undefined
}
