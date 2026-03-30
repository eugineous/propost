'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActivityEvent } from '@/lib/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const MAX_EVENTS = 100
const POLL_INTERVAL_MS = 5000

export function useActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const seenRef = useRef<Set<string>>(new Set())

  const poll = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const res = await fetch('/api/monitor/live', { cache: 'no-store' })
      const json = await res.json() as {
        ok: boolean
        recentActions?: Array<{
          id: string
          agentName: string
          company: string
          actionType: string
          outcome: string | null
          createdAt: string
          outputPreview: string
        }>
      }

      if (!json.ok || !json.recentActions) throw new Error('monitor not ok')

      setConnectionStatus('connected')

      const nextEvents: ActivityEvent[] = []
      for (const a of json.recentActions) {
        if (seenRef.current.has(a.id)) continue
        seenRef.current.add(a.id)
        nextEvents.push({
          type: 'agent_action',
          agentName: a.agentName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company: a.company as any,
          summary: `${a.actionType}: ${a.outputPreview}`,
          data: { outcome: a.outcome },
          timestamp: a.createdAt,
        })
      }

      if (nextEvents.length > 0) {
        setEvents((prev) => {
          const merged = [...prev, ...nextEvents]
          return merged.length > MAX_EVENTS ? merged.slice(merged.length - MAX_EVENTS) : merged
        })
      }
    } catch {
      if (!mountedRef.current) return
      setConnectionStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setConnectionStatus('connecting')
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [poll])

  return { events, connectionStatus, refresh: poll }
}
