// Next.js instrumentation hook — runs once at server startup
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on the Node.js server runtime (not edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartup } = await import('../lib/startup')
    const { runMigrations } = await import('../lib/db/migrate')

    // Validate credentials first
    const report = await validateStartup()

    console.log('[instrumentation] Startup report:', {
      healthy: report.healthy,
      database: report.database,
      aiProviders: report.aiProviders,
      disabledPlatforms: report.disabled,
      missingVarCount: report.missing.length,
    })

    // Run DB migrations if database is available
    if (report.database) {
      try {
        await runMigrations()
      } catch (err) {
        console.error('[instrumentation] Migration failed:', err)
      }
    } else {
      console.warn('[instrumentation] Skipping migrations — DATABASE_URL not set')
    }
  }
}
