// ============================================================
// ProPost Empire — X/Twitter Playwright Fallback
// Used only when all API retries fail
// ============================================================

export async function postToXWithPlaywright(
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Dynamic import to avoid bundling playwright in main bundle
    // playwright is an optional peer dependency used only in fallback scenarios
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { chromium } = await (Function('return import("playwright")')() as Promise<any>)

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      storageState: './auth/x-session.json',
    })
    const page = await context.newPage()

    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle' })

    // Type tweet content
    const editor = page.locator('[data-testid="tweetTextarea_0"]')
    await editor.waitFor({ timeout: 10000 })
    await editor.fill(content)

    // Submit
    const submitBtn = page.locator('[data-testid="tweetButtonInline"]')
    await submitBtn.click()

    // Wait for confirmation
    await page.waitForTimeout(3000)

    await browser.close()
    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[x-playwright] Failed to post:', error)
    return { success: false, error }
  }
}
