// MemoryStore — persists and retrieves agent memory entries from `memory_entries` table

import { getDb, withRetry } from '../db/client'
import type { MemoryEntry, Platform } from '../types'
import type { MemoryEntryRow } from '../db/schema'

export interface MemoryFilters {
  platform?: Platform
  dateFrom?: Date
  dateTo?: Date
  keyword?: string
  tags?: string[]
}

function rowToEntry(row: MemoryEntryRow): MemoryEntry {
  return {
    id: row.id,
    agentName: row.agent_name,
    contextSummary: row.context_summary,
    relatedActionIds: row.related_action_ids ?? undefined,
    platform: row.platform as Platform | undefined,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
  }
}

export class MemoryStore {
  /** Store a new memory entry; returns the generated entry ID */
  async store(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<string> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        INSERT INTO memory_entries (
          agent_name,
          context_summary,
          related_action_ids,
          platform,
          tags
        ) VALUES (
          ${entry.agentName},
          ${entry.contextSummary},
          ${entry.relatedActionIds ? `{${entry.relatedActionIds.join(',')}}` : null},
          ${entry.platform ?? null},
          ${entry.tags ? `{${entry.tags.map((t) => `"${t}"`).join(',')}}` : null}
        )
        RETURNING id
      `
    })

    const id = (rows as Array<{ id: string }>)[0]?.id
    if (!id) throw new Error('[MemoryStore] INSERT returned no ID')
    return id
  }

  /** Retrieve memory entries for an agent with optional filters */
  async retrieve(agentName: string, filters?: MemoryFilters): Promise<MemoryEntry[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      // Build dynamic query using tagged template — Neon supports parameterised queries
      return db`
        SELECT * FROM memory_entries
        WHERE agent_name = ${agentName}
          ${filters?.platform ? db`AND platform = ${filters.platform}` : db``}
          ${filters?.dateFrom ? db`AND created_at >= ${filters.dateFrom}` : db``}
          ${filters?.dateTo ? db`AND created_at <= ${filters.dateTo}` : db``}
          ${filters?.keyword ? db`AND context_summary ILIKE ${'%' + filters.keyword + '%'}` : db``}
          ${
            filters?.tags && filters.tags.length > 0
              ? db`AND tags && ${`{${filters.tags.map((t) => `"${t}"`).join(',')}}`}::text[]`
              : db``
          }
        ORDER BY created_at DESC
      `
    })

    return (rows as MemoryEntryRow[]).map(rowToEntry)
  }

  /** Full-text search across context_summary; optionally scoped to an agent */
  async search(query: string, agentName?: string): Promise<MemoryEntry[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        SELECT * FROM memory_entries
        WHERE context_summary ILIKE ${'%' + query + '%'}
          ${agentName ? db`AND agent_name = ${agentName}` : db``}
        ORDER BY created_at DESC
        LIMIT 100
      `
    })

    return (rows as MemoryEntryRow[]).map(rowToEntry)
  }

  /** Export all memory entries for an agent within a date range */
  async export(
    agentName: string,
    dateRange: { from: Date; to: Date }
  ): Promise<MemoryEntry[]> {
    const rows = await withRetry(async () => {
      const db = getDb()
      return db`
        SELECT * FROM memory_entries
        WHERE agent_name = ${agentName}
          AND created_at >= ${dateRange.from}
          AND created_at <= ${dateRange.to}
        ORDER BY created_at ASC
      `
    })

    return (rows as MemoryEntryRow[]).map(rowToEntry)
  }
}

export const memoryStore = new MemoryStore()
