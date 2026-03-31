// Next.js instrumentation hook — runs once at server startup
// Wrapped in try/catch so startup failures never crash the app

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { validateStartup } = await import('../lib/startup')
    const report = await validateStartup()
    console.log('[startup]', {
      healthy: report.healthy,
      database: report.database,
      ai: report.aiProviders,
      disabled: report.disabled,
    })

    if (report.database) {
      try {
        const { runMigrations } = await import('../lib/db/migrate')
        await runMigrations()
      } catch (err) {
        // Migration failure is non-fatal — app still works, just without DB
        console.error('[startup] Migration failed (non-fatal):', err instanceof Error ? err.message : err)
      }
    }
  } catch (err) {
    // Startup validation failure is non-fatal
    console.error('[startup] Startup check failed (non-fatal):', err instanceof Error ? err.message : err)
  }
}
