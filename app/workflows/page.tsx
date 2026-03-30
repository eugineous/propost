'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface WorkflowStep {
  id: string
  name: string
  action: string
  params?: Record<string, unknown>
  durationEstimateMs?: number
}

interface WorkflowPhase {
  id: string
  name: string
  steps: WorkflowStep[]
  repeatIntervalMs?: number | null
}

interface WorkflowDef {
  phases: WorkflowPhase[]
  name: string
  description?: string
}

interface WorkflowRow {
  id: string
  agentName: string
  corp: string
  name: string
  definition: WorkflowDef
  execution: {
    status: string
    currentPhaseIndex: number
    currentStepIndex: number
    nextRunAt: string
    errorCount: number
    lastError?: string
  } | null
}

const CORP_COLORS: Record<string, string> = {
  intelcore: '#FFD700', xforce: '#1DA1F2', linkedelite: '#0077B5',
  gramgod: '#E1306C', pagepower: '#1877F2', webboss: '#22C55E',
  hrforce: '#F97316', legalshield: '#EF4444', financedesk: '#10B981',
}

const CORPS = ['intelcore', 'xforce', 'gramgod', 'linkedelite', 'pagepower', 'webboss', 'hrforce', 'legalshield', 'financedesk']

function formatMs(ms?: number | null): string {
  if (!ms) return '—'
  if (ms < 60000) return `${ms / 1000}s`
  if (ms < 3600000) return `${ms / 60000}m`
  return `${ms / 3600000}h`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return `in ${Math.round(-diff / 60000)}m`
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  return `${Math.round(diff / 3600000)}h ago`
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<WorkflowRow | null>(null)
  const [corpFilter, setCorpFilter] = useState<string>('all')
  const [editMode, setEditMode] = useState(false)
  const [editJson, setEditJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows')
      const data = await res.json() as { ok: boolean; workflows?: WorkflowRow[] }
      if (data.ok && data.workflows) {
        setWorkflows(data.workflows.sort((a, b) => {
          if (a.corp !== b.corp) return a.corp.localeCompare(b.corp)
          return a.agentName.localeCompare(b.agentName)
        }))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openEditor = (wf: WorkflowRow) => {
    setSelectedAgent(wf)
    setEditMode(false)
    setEditJson(JSON.stringify(wf.definition, null, 2))
    setSaveResult(null)
  }

  const saveWorkflow = async () => {
    if (!selectedAgent) return
    setSaving(true)
    setSaveResult(null)
    try {
      const definition = JSON.parse(editJson) as WorkflowDef
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: selectedAgent.agentName, definition }),
      })
      const data = await res.json() as { ok: boolean; error?: string; workflowId?: string }
      if (data.ok) {
        setSaveResult(`✅ Workflow saved — ID: ${data.workflowId?.slice(0, 8)}`)
        setEditMode(false)
        await load()
      } else {
        setSaveResult(`❌ ${data.error ?? 'Save failed'}`)
      }
    } catch (err) {
      setSaveResult(`❌ ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const filtered = corpFilter === 'all' ? workflows : workflows.filter(w => w.corp === corpFilter)
  const counts = { total: workflows.length, active: workflows.filter(w => w.execution?.status === 'active').length, error: workflows.filter(w => w.execution?.status === 'error').length }

  return (
    <div style={{ background: '#0A0A14', color: '#E2E8F0', minHeight: '100vh', fontFamily: 'monospace' }}>
      {/* Nav */}
      <nav style={{ background: '#12121F', borderBottom: '1px solid #1E1E3A', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ fontSize: 9, color: '#FFD700', textDecoration: 'none' }}>← EMPIRE</Link>
        <span style={{ fontSize: 11, color: '#FFD700' }}>⚙️ WORKFLOW EDITOR</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 8 }}>
          <span style={{ color: '#22C55E' }}>{counts.active} active</span>
          <span style={{ color: '#EF4444' }}>{counts.error} errors</span>
          <span style={{ color: '#64748B' }}>{counts.total} total</span>
        </div>
        <button onClick={load} style={{ fontSize: 8, background: '#1E1E3A', border: '1px solid #2a2a4a', color: '#94A3B8', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 420px' : '1fr', height: 'calc(100vh - 45px)' }}>
        {/* Agent list */}
        <div style={{ overflowY: 'auto', padding: 12 }}>
          {/* Corp filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {['all', ...CORPS].map(c => (
              <button key={c} onClick={() => setCorpFilter(c)}
                style={{ fontSize: 7, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace',
                  background: corpFilter === c ? (CORP_COLORS[c] ?? '#FFD700') + '22' : '#12121F',
                  border: `1px solid ${corpFilter === c ? (CORP_COLORS[c] ?? '#FFD700') + '88' : '#1E1E3A'}`,
                  color: corpFilter === c ? (CORP_COLORS[c] ?? '#FFD700') : '#64748B' }}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: '#555', fontSize: 9, padding: 20, textAlign: 'center' }}>Loading workflows...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {filtered.map(wf => {
                const color = CORP_COLORS[wf.corp] ?? '#888'
                const status = wf.execution?.status ?? 'no-workflow'
                const statusColor = status === 'active' ? '#22C55E' : status === 'error' ? '#EF4444' : status === 'paused' ? '#F59E0B' : '#64748B'
                const phase = wf.definition?.phases?.[wf.execution?.currentPhaseIndex ?? 0]
                const step = phase?.steps?.[wf.execution?.currentStepIndex ?? 0]

                return (
                  <div key={wf.agentName} onClick={() => openEditor(wf)}
                    style={{ background: selectedAgent?.agentName === wf.agentName ? '#1a1a2e' : '#12121F',
                      border: `1px solid ${selectedAgent?.agentName === wf.agentName ? color + '88' : '#1E1E3A'}`,
                      borderRadius: 6, padding: '8px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color, fontWeight: 'bold' }}>{wf.agentName.toUpperCase()}</span>
                      <span style={{ fontSize: 7, color: '#64748B', marginLeft: 'auto' }}>{wf.corp}</span>
                    </div>
                    <div style={{ fontSize: 8, color: '#E2E8F0', marginBottom: 2 }}>{wf.name}</div>
                    {step && (
                      <div style={{ fontSize: 7, color: '#64748B' }}>→ {step.name.slice(0, 35)}</div>
                    )}
                    {wf.execution?.errorCount ? (
                      <div style={{ fontSize: 7, color: '#EF4444', marginTop: 2 }}>⚠ {wf.execution.errorCount} errors</div>
                    ) : null}
                    {wf.execution?.nextRunAt && (
                      <div style={{ fontSize: 7, color: '#64748B', marginTop: 2 }}>{relativeTime(wf.execution.nextRunAt)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Workflow detail panel */}
        {selectedAgent && (
          <div style={{ background: '#12121F', borderLeft: '1px solid #1E1E3A', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1E1E3A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: CORP_COLORS[selectedAgent.corp] ?? '#FFD700', fontWeight: 'bold' }}>
                {selectedAgent.agentName.toUpperCase()}
              </span>
              <span style={{ fontSize: 8, color: '#64748B' }}>{selectedAgent.corp}</span>
              <button onClick={() => setSelectedAgent(null)} style={{ marginLeft: 'auto', fontSize: 9, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Execution status */}
            {selectedAgent.execution && (
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #1E1E3A', background: '#0d0d1a' }}>
                <div style={{ fontSize: 7, color: '#64748B', marginBottom: 4 }}>EXECUTION STATUS</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, color: selectedAgent.execution.status === 'active' ? '#22C55E' : selectedAgent.execution.status === 'error' ? '#EF4444' : '#F59E0B' }}>
                    ● {selectedAgent.execution.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 8, color: '#64748B' }}>
                    Phase {(selectedAgent.execution.currentPhaseIndex ?? 0) + 1} Step {(selectedAgent.execution.currentStepIndex ?? 0) + 1}
                  </span>
                  <span style={{ fontSize: 8, color: '#64748B' }}>
                    Next: {relativeTime(selectedAgent.execution.nextRunAt)}
                  </span>
                </div>
                {selectedAgent.execution.lastError && (
                  <div style={{ fontSize: 7, color: '#EF4444', marginTop: 4, wordBreak: 'break-all' }}>
                    {selectedAgent.execution.lastError.slice(0, 150)}
                  </div>
                )}
              </div>
            )}

            {/* Workflow phases */}
            {!editMode && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
                <div style={{ fontSize: 7, color: '#64748B', marginBottom: 8 }}>WORKFLOW PHASES</div>
                {selectedAgent.definition?.phases?.map((phase, pi) => (
                  <div key={phase.id} style={{ marginBottom: 10, padding: '8px 10px', background: '#0d0d1a', borderRadius: 4, border: `1px solid ${pi === (selectedAgent.execution?.currentPhaseIndex ?? 0) ? '#FFD70044' : '#1E1E3A'}` }}>
                    <div style={{ fontSize: 8, color: '#FFD700', marginBottom: 6 }}>
                      {pi === (selectedAgent.execution?.currentPhaseIndex ?? 0) ? '▶ ' : ''}{phase.name}
                      {phase.repeatIntervalMs ? <span style={{ color: '#64748B', fontSize: 7 }}> (repeats every {formatMs(phase.repeatIntervalMs)})</span> : null}
                    </div>
                    {phase.steps.map((step, si) => (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', marginBottom: 2, borderRadius: 3,
                        background: pi === (selectedAgent.execution?.currentPhaseIndex ?? 0) && si === (selectedAgent.execution?.currentStepIndex ?? 0) ? '#FFD70011' : 'transparent' }}>
                        <span style={{ fontSize: 6, color: '#64748B', width: 12 }}>{si + 1}.</span>
                        <span style={{ fontSize: 8, color: '#94A3B8', flex: 1 }}>{step.name}</span>
                        <span style={{ fontSize: 7, color: '#555', fontFamily: 'monospace' }}>{step.action}</span>
                        {step.durationEstimateMs && <span style={{ fontSize: 6, color: '#444' }}>{formatMs(step.durationEstimateMs)}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* JSON editor */}
            {editMode && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14 }}>
                <div style={{ fontSize: 7, color: '#64748B', marginBottom: 6 }}>
                  EDIT WORKFLOW JSON (phases array only)
                </div>
                <textarea
                  value={editJson}
                  onChange={e => setEditJson(e.target.value)}
                  style={{ flex: 1, background: '#0d0d1a', border: '1px solid #1E1E3A', color: '#E2E8F0', borderRadius: 4, padding: 8, fontSize: 10, fontFamily: 'monospace', resize: 'none', outline: 'none', minHeight: 200 }}
                />
                {saveResult && (
                  <div style={{ fontSize: 8, color: saveResult.startsWith('✅') ? '#22C55E' : '#EF4444', marginTop: 6 }}>
                    {saveResult}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #1E1E3A', display: 'flex', gap: 6 }}>
              {!editMode ? (
                <button onClick={() => setEditMode(true)}
                  style={{ flex: 1, background: '#FFD70015', border: '1px solid #FFD70044', color: '#FFD700', borderRadius: 4, padding: '6px 0', fontSize: 8, cursor: 'pointer', fontFamily: 'monospace' }}>
                  ✏️ Edit Workflow
                </button>
              ) : (
                <>
                  <button onClick={saveWorkflow} disabled={saving}
                    style={{ flex: 1, background: '#22C55E15', border: '1px solid #22C55E44', color: '#22C55E', borderRadius: 4, padding: '6px 0', fontSize: 8, cursor: 'pointer', fontFamily: 'monospace', opacity: saving ? 0.5 : 1 }}>
                    {saving ? '⏳ Saving...' : '✅ Save & Deploy'}
                  </button>
                  <button onClick={() => { setEditMode(false); setSaveResult(null) }}
                    style={{ background: '#EF444415', border: '1px solid #EF444444', color: '#EF4444', borderRadius: 4, padding: '6px 10px', fontSize: 8, cursor: 'pointer', fontFamily: 'monospace' }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
