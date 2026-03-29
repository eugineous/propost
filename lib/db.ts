import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    // Return a stub during build time — real calls only happen at runtime
    return null as unknown as ReturnType<typeof drizzle>
  }
  const sql = neon(url)
  return drizzle(sql, { schema })
}

// Lazy singleton — only initialized when first used at runtime
let _db: ReturnType<typeof drizzle> | null = null

export function getDatabase() {
  if (!_db) {
    _db = getDb()
  }
  return _db
}

// Convenience export — use this in API routes
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const database = getDatabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (database as any)[prop]
  },
})
