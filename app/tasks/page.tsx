'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  type: string
  company: string
  platform?: string
  assigned_agent?: string
  status: string
  priority: number
  content_pillar?: string
  created_at: string
  error?: string
}

const STATUS_COLS = ['queued', 'assigned', 'active', 'pending_approval', 'completed', 'failed']

const STATUS_COLOR: Record<string, string> = {
  queued: 'border-gray-600 text-gray-400',
  assigned: 'border-blue-600 text-blue-400',
  active: 'border-green-600 text-green-400',
  pending_approval: 'border-yellow-600 text-yellow-400',
  completed: 'border-emerald-600 text-emerald-400',
  failed: 'border-red-600 text-red-400',
}

const COMPANY_COLOR: Record<string, string> = {
  xforce: '#1d9bf0',
  linkedelite: '#0a66c2',
  gramgod: '#e1306c',
  pagepower: '#1877f2',
  webboss: '#22c55e',
  intelcore: '#a855f7',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTasks = () => {
    const params = new URLSearchParams()
    if (company) params.set('company', company)
    if (status) params.set('status', status)
    setLoading(true)
    fetch(`/api/tasks?${params}`).then((r) => r.json()).then((data) => {
      setTasks(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [company, status])

  // SSE for real-time updates
  useEffect(() => {
    const es = new EventSource('/api/activity')
    es.onmessage = () => fetchTasks()
    return () => es.close()
  }, [company, status])

  const byStatus = (s: string) => tasks.filter((t) => t.status === s)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Task Board</h1>
        <div className="ml-auto flex gap-2">
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
          >
            <option value="">All Companies</option>
            {['xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={fetchTasks} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:bg-gray-700">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-20">Loading tasks...</div>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {STATUS_COLS.map((s) => {
            const col = byStatus(s)
            return (
              <div key={s} className="space-y-2">
                <div className={`text-xs font-bold tracking-wider border-b pb-2 ${STATUS_COLOR[s]}`}>
                  {s.replace(/_/g, ' ').toUpperCase()} ({col.length})
                </div>
                {col.map((task) => (
                  <div key={task.id} className="bg-gray-900 border border-gray-800 rounded p-2 text-xs space-y-1">
                    <div className="font-bold text-gray-200 truncate">{task.type.replace(/_/g, ' ')}</div>
                    <div className="flex items-center gap-1">
                      <span
                        className="px-1 rounded text-xs font-bold"
                        style={{ color: COMPANY_COLOR[task.company] ?? '#888', backgroundColor: (COMPANY_COLOR[task.company] ?? '#888') + '22' }}
                      >
                        {task.company}
                      </span>
                    </div>
                    {task.platform && <div className="text-gray-500">{task.platform}</div>}
                    {task.assigned_agent && <div className="text-purple-400">{task.assigned_agent}</div>}
                    {task.content_pillar && <div className="text-gray-600">{task.content_pillar}</div>}
                    {task.error && <div className="text-red-400 truncate">{task.error}</div>}
                    <div className="text-gray-700">{new Date(task.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div className="text-xs text-gray-700 text-center py-4">empty</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
