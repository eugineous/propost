'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Canvas must be client-only (no SSR)
const OfficeCanvas = dynamic(() => import('@/components/virtual-office/canvas'), { ssr: false })

interface AgentDetail {
  name: string
  status: string
  currentTask?: string
  lastActions?: Array<{ action_type: string; platform: string; timestamp: string; status: string }>
  recentMemory?: Array<{ context_summary: string; created_at: string }>
}

export default function OfficePage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleAgentClick = async (agentName: string) => {
    setSelectedAgent(agentName)
    setLoadingDetail(true)
    try {
      const [statusRes, memRes] = await Promise.all([
        fetch('/api/agents/status'),
        fetch(`/api/memory?agent=${agentName}`),
      ])
      const statusData = await statusRes.json()
      const memData = await memRes.json()

      const agentStatus = Array.isArray(statusData?.agents)
        ? statusData.agents.find((a: { name: string }) => a.name === agentName)
        : null

      setAgentDetail({
        name: agentName,
        status: agentStatus?.status ?? 'unknown',
        currentTask: agentStatus?.currentTask,
        recentMemory: Array.isArray(memData) ? memData.slice(0, 5) : [],
      })
    } catch {
      setAgentDetail({ name: agentName, status: 'unknown' })
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Virtual Office</h1>
        <span className="text-xs text-gray-500">Click any agent to inspect</span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Canvas */}
        <div className="col-span-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <OfficeCanvas onAgentClick={handleAgentClick} />
            <div className="mt-2 flex gap-4 text-xs text-gray-600">
              <span>🟢 Working</span>
              <span>💤 Idle</span>
              <span>🔴 Alert/Error</span>
              <span className="ml-auto">8fps pixel art rendering</span>
            </div>
          </div>
        </div>

        {/* Agent Detail Panel */}
        <div className="col-span-4">
          {selectedAgent ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-purple-400">{selectedAgent}</div>
                <button onClick={() => setSelectedAgent(null)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
              </div>

              {loadingDetail ? (
                <div className="text-xs text-gray-600">Loading...</div>
              ) : agentDetail ? (
                <>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">STATUS</div>
                    <div className={`text-xs font-bold ${
                      agentDetail.status === 'active' ? 'text-green-400' :
                      agentDetail.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>{agentDetail.status}</div>
                  </div>

                  {agentDetail.currentTask && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">CURRENT TASK</div>
                      <div className="text-xs text-gray-300">{agentDetail.currentTask}</div>
                    </div>
                  )}

                  {agentDetail.recentMemory && agentDetail.recentMemory.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">RECENT MEMORY</div>
                      <div className="space-y-2">
                        {agentDetail.recentMemory.map((m, i) => (
                          <div key={i} className="text-xs text-gray-400 bg-gray-800 rounded p-2 leading-relaxed">
                            {m.context_summary.slice(0, 120)}...
                            <div className="text-gray-600 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-800">
                    <Link
                      href={`/monitor?agent=${selectedAgent}`}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      View full agent logs →
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 text-center py-8">
                Click an agent in the office to inspect their status, tasks, and memory.
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-3">ROOMS</div>
            <div className="space-y-2">
              {[
                { room: 'War Room', company: 'XForce', color: '#1d9bf0' },
                { room: 'Boardroom', company: 'LinkedElite', color: '#0a66c2' },
                { room: 'Studio', company: 'GramGod', color: '#e1306c' },
                { room: 'Community Hall', company: 'PagePower', color: '#1877f2' },
                { room: 'Engine Room', company: 'WebBoss', color: '#22c55e' },
                { room: 'Situation Room', company: 'IntelCore', color: '#a855f7' },
              ].map((r) => (
                <div key={r.room} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: r.color }} />
                  <span className="text-xs text-gray-400">{r.room}</span>
                  <span className="text-xs text-gray-600 ml-auto">{r.company}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
