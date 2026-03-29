// ============================================================
// ProPost Empire — Retry Helper with Exponential Backoff
// ============================================================

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  const delays = [1000, 2000, 4000]
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delays[attempt] ?? 4000))
      }
    }
  }

  throw lastError
}
