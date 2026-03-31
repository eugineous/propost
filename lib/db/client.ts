// Neon serverless DB client with retry wrapper and in-memory write queue
// Emits 'db:critical' on global EventEmitter after all retries exhausted

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { EventEmitter } from 'events'

// Global EventEmitter for critical DB failure notifications
export const dbEvents = new EventEmitter()

// Singleton Neon client — lazily initialized
let _db: NeonQueryFunction<false, false> | null = null

export function getDb(): NeonQueryFunction<false, false> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _db = neon(url)
  }
  return _db
}

// Convenience export — use this in most places
export const db = new Proxy({} as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    return (getDb() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Exponential backoff delays: 1s, 2s, 4s
const RETRY_DELAYS_MS = [1000, 2000, 4000]

/**
 * Retry a DB operation up to 3 times with exponential backoff.
 * On final failure emits 'db:critical' and re-throws.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt]
        console.warn(`[db] Write failed (attempt ${attempt + 1}), retrying in ${delay}ms...`, err)
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  console.error('[db] All retry attempts exhausted — emitting db:critical', lastError)
  dbEvents.emit('db:critical', lastError)
  throw lastError
}

// In-memory write queue for when DB is temporarily unavailable
type WriteJob = () => Promise<void>
const writeQueue: WriteJob[] = []

/**
 * Queue a write operation for later execution when DB becomes available.
 */
export function queueWrite(fn: () => Promise<void>): void {
  writeQueue.push(fn)
  console.warn(`[db] Write queued (queue size: ${writeQueue.length})`)
}

/**
 * Flush all queued writes in order. Failed writes are re-queued at the front.
 */
export async function flushWriteQueue(): Promise<void> {
  if (writeQueue.length === 0) return

  console.log(`[db] Flushing ${writeQueue.length} queued writes...`)
  const jobs = writeQueue.splice(0, writeQueue.length)

  for (const job of jobs) {
    try {
      await withRetry(job)
    } catch (err) {
      console.error('[db] Queued write failed after retries — re-queuing', err)
      writeQueue.unshift(job)
      break // stop flushing if a write fails; try again later
    }
  }

  if (writeQueue.length === 0) {
    console.log('[db] Write queue flushed successfully')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
