// Next.js instrumentation hook — runs once at server startup
// Runs migrations, seeds agents, and initializes the system

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { runMigrations } = await import('../lib/db/migrate')
    const { runAllSeeds } = await import('../lib/db/seed')
    const { getDb, withRetry } = await import('../lib/db/client')

    await runMigrations()
    await runAllSeeds()

    // Mark all agents as idle on fresh start
    const db = getDb()
    await withRetry(() => db`UPDATE agents SET status = 'idle', last_heartbeat = NOW()`)

    console.log('[instrumentation] ProPost Empire initialized — all agents ready')
  } catch (err) {
    // Non-fatal — app still works, agents just won't have DB persistence
    console.error('[instrumentation] Startup failed (non-fatal):', err instanceof Error ? err.message : err)
  }
}
