'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AgentStatus {
  name: string
  status: string
  last_heartbeat?: string
  currentTask?: string
}

interface PlatformConn {
  platform: string
  status: string
  last_verified?: string
  error_message?: string
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'text-gray-400',
  active: 'text-green-400',
  paused: 'text-yellow-400',
  error: 'text-red-400',
  unresponsive: 'text-orange-400',
}

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  unresponsive: 'bg-orange-500',
}

export default function MonitorPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [connections, setConnections] = useState<PlatformConn[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const es = new EventSource('/api/agents/status')
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'initial' && Array.isArray(data.agents)) {
        setAgents(data.agents)
      } else if (data.type === 'update') {
        setAgents((prev) => {
          const idx = prev.findIndex((a) => a.name === data.agentName)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], status: data.status, currentTask: data.currentTask }
            return next
          }
          return [...prev, { name: data.agentName, status: data.status }]
        })
      }
    }
    return () => es.close()
  }, [])

  useEffect(() => {
    fetch('/api/connections')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => Array.isArray(data) ? setConnections(data) : setConnections([]))
      .catch(() => setConnections([]))
  }, [])

  const filtered = agents.filter((a) =>
    !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || a.status.includes(filter)
  )

  // Use useSearchParams hook instead of window.location (SSR-safe)
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCompanyFilter(params.get('company'))
  }, [])

  const displayed = companyFilter
    ? filtered.filter((a) => a.name.toLowerCase().includes(companyFilter.toLowerCase()))
    : filtered

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Agent Monitor</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Agent Roster */}
        <div className="col-span-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-gray-400 font-bold tracking-wider">AGENT ROSTER</div>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter agents..."
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-xs text-gray-300 focus:outline-none focus:border-purple-500 w-48"
              />
            </div>
            <div className="space-y-2">
              {displayed.length === 0 ? (
                <div className="text-xs text-gray-600 py-8 text-center">No agents connected yet</div>
              ) : (
                displayed.map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[agent.status] ?? 'bg-gray-600'} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                      <span className="text-sm font-bold text-gray-200">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {agent.currentTask && (
                        <span className="text-xs text-gray-500 max-w-xs truncate">{agent.currentTask}</span>
                      )}
                      <span className={`text-xs font-bold ${STATUS_COLOR[agent.status] ?? 'text-gray-500'}`}>
                        {agent.status}
                      </span>
                      {agent.last_heartbeat && (
                        <span className="text-xs text-gray-600">
                          {new Date(agent.last_heartbeat).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="col-span-4 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">PLATFORM CONNECTIONS</div>
            <div className="space-y-3">
              {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => {
                const conn = connections.find((c) => c.platform === p)
                const status = conn?.status ?? 'unknown'
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300 capitalize">{p}</span>
                      <span className={`text-xs font-bold ${
                        status === 'connected' ? 'text-green-400' :
                        status === 'expired' ? 'text-yellow-400' :
                        status === 'error' ? 'text-red-400' : 'text-gray-500'
                      }`}>{status}</span>
                    </div>
                    {conn?.error_message && (
                      <div className="text-xs text-red-400 truncate">{conn.error_message}</div>
                    )}
                    {conn?.last_verified && (
                      <div className="text-xs text-gray-600">
                        Checked: {new Date(conn.last_verified).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 font-bold tracking-wider">AGENT SUMMARY</div>
            {(['active', 'idle', 'paused', 'error', 'unresponsive'] as const).map((s) => {
              const count = agents.filter((a) => a.status === s).length
              return (
                <div key={s} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="text-xs text-gray-400 capitalize">{s}</span>
                  </div>
                  <span className={`text-xs font-bold ${STATUS_COLOR[s]}`}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
