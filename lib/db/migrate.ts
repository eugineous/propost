// Auto-run migrations using raw SQL via @neondatabase/serverless
// Idempotent: safe to run on every cold start (uses CREATE TABLE IF NOT EXISTS)

import { neon } from '@neondatabase/serverless'
import { ALL_MIGRATIONS } from './schema'

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('[migrate] DATABASE_URL is not set — skipping migrations')
    return
  }

  const sql = neon(databaseUrl)

  console.log('[migrate] Running schema migrations...')

  for (const statement of ALL_MIGRATIONS) {
    try {
      await sql.query(statement)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[migrate] Failed to execute migration:\n${statement}\nError: ${msg}`)
      throw err
    }
  }

  console.log(`[migrate] All ${ALL_MIGRATIONS.length} migrations applied successfully`)
}
