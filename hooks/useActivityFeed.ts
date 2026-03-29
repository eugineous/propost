'use client'

import { useEffect, useRef, useState } from 'react'
import type { ActivityEvent } from '@/lib/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const MAX_EVENTS = 100
const RECONNECT_DELAY_MS = 5000

export function useActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = () => {
    if (!mountedRef.current) return

    setConnectionStatus('connecting')

    const es = new EventSource('/api/feed')
    esRef.current = es

    es.onopen = () => {
      if (mountedRef.current) setConnectionStatus('connected')
    }

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const event: ActivityEvent = JSON.parse(e.data)
        setEvents((prev) => {
          const next = [...prev, event]
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
        })
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      setConnectionStatus('disconnected')
      es.close()
      esRef.current = null
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      esRef.current?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { events, connectionStatus }
}
