'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ApprovalItem {
  id: string
  task_id?: string
  action_type: string
  platform?: string
  agent_name: string
  content?: string
  content_preview?: string
  risk_level: string
  risk_score?: number
  status: string
  created_at: string
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-green-400 border-green-800',
  medium: 'text-yellow-400 border-yellow-800',
  high: 'text-orange-400 border-orange-800',
  critical: 'text-red-400 border-red-800',
}

export default function InboxPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchItems = () => {
    setLoading(true)
    fetch('/api/approval-queue?status=pending')
      .then((r) => r.json())
      .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const approve = async (id: string, edited?: string) => {
    await fetch(`/api/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edited ? { editedContent: edited } : {}),
    })
    setEditId(null)
    fetchItems()
  }

  const reject = async (id: string, reason: string) => {
    await fetch(`/api/reject/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setRejectId(null)
    setRejectReason('')
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Approval Inbox</h1>
        <span className="ml-2 px-2 py-0.5 bg-yellow-900 text-yellow-400 rounded text-xs font-bold">{items.length} pending</span>
        <button onClick={fetchItems} className="ml-auto px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:bg-gray-700">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-20">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-600 py-20">No pending approvals. All clear.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-gray-900 border rounded-lg p-4 ${RISK_COLOR[item.risk_level] ?? 'border-gray-700'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-200">{item.action_type.replace(/_/g, ' ')}</span>
                    {item.platform && <span className="text-xs text-gray-500">{item.platform}</span>}
                    <span className="text-xs text-purple-400">{item.agent_name}</span>
                    <span className={`text-xs font-bold px-1 rounded border ${RISK_COLOR[item.risk_level]}`}>
                      {item.risk_level} risk {item.risk_score != null ? `(${item.risk_score})` : ''}
                    </span>
                  </div>

                  {editId === item.id ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none resize-none"
                    />
                  ) : (
                    <div className="text-xs text-gray-400 bg-gray-800 rounded p-3 leading-relaxed">
                      {item.content ?? item.content_preview ?? '(no content preview)'}
                    </div>
                  )}

                  {rejectId === item.id && (
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason..."
                      className="w-full bg-gray-800 border border-red-800 rounded px-3 py-1 text-xs text-gray-300 focus:outline-none"
                    />
                  )}

                  <div className="text-xs text-gray-600">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-fit">
                  {editId === item.id ? (
                    <>
                      <button onClick={() => approve(item.id, editContent)}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-bold">
                        Save & Approve
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                        Cancel
                      </button>
                    </>
                  ) : rejectId === item.id ? (
                    <>
                      <button onClick={() => reject(item.id, rejectReason || 'Rejected by Founder')}
                        className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs font-bold">
                        Confirm Reject
                      </button>
                      <button onClick={() => setRejectId(null)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => approve(item.id)}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-bold">
                        Approve
                      </button>
                      <button onClick={() => { setEditId(item.id); setEditContent(item.content ?? '') }}
                        className="px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded text-xs">
                        Edit & Approve
                      </button>
                      <button onClick={() => setRejectId(item.id)}
                        className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-xs">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
