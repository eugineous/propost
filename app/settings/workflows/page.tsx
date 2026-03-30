'use client'

import { useState, useEffect, useCallback } from 'react'
import { ALL_AGENT_NAMES } from '@/lib/agentState'
import { AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'

interface WorkflowStep {
  id: string
  name: string
  action: string
  params?: Record<string, unknown>
  durationEstimateMs?: number
  retryOnError?: boolean
}

interface WorkflowPhase {
  id: string
  name: string
  steps: WorkflowStep[]
  repeatIntervalMs?: number | null
}

interface AgentWorkflowState {
  workflowId?: string
  workflowName?: string
  currentPhase?: string
  currentStep?: string
  status?: string
  progress?: number
  lastRunAt?: string
  nextRunAt?: string
}

const CORPS = [
  'intelcore', 'xforce', 'linkedelite', 'gramgod',
  'pagepower', 'webboss', 'hrforce', 'legalshield', 'financedesk',
]

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    error: 'bg-red-500',
    paused: 'bg-yellow-500',
    idle: 'bg-gray-500',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs text-white font-mono ${colors[status ?? 'idle'] ?? 'bg-gray-500'}`}>
      {status ?? 'idle'}
    </span>
  )
}

export default function WorkflowsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [agentState, setAgentState] = useState<AgentWorkflowState | null>(null)
  const [phases, setPhases] = useState<WorkflowPhase[]>([])
  const [workflowName, setWorkflowName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [allStates, setAllStates] = useState<Record<string, AgentWorkflowState>>({})

  // Group agents by corp
  const agentsByCorps = CORPS.map((corp) => ({
    corp,
    agents: ALL_AGENT_NAMES.filter((a) => AGENT_CORP_LOOKUP[a] === corp),
  }))

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadAgentState = useCallback(async (agent: string) => {
    const res = await fetch(`/api/workflows/${agent}`)
    const data = await res.json()
    setAgentState(data.state)
  }, [])

  const loadAllStates = useCallback(async () => {
    const res = await fetch('/api/monitor/live')
    const data = await res.json()
    if (data.ok) setAllStates(data.agents)
  }, [])

  useEffect(() => { loadAllStates() }, [loadAllStates])

  useEffect(() => {
    if (selectedAgent) loadAgentState(selectedAgent)
  }, [selectedAgent, loadAgentState])

  const addPhase = () => {
    setPhases((p) => [...p, { id: genId(), name: `Phase ${p.length + 1}`, steps: [], repeatIntervalMs: null }])
  }

  const removePhase = (phaseId: string) => {
    setPhases((p) => p.filter((ph) => ph.id !== phaseId))
  }

  const updatePhase = (phaseId: string, patch: Partial<WorkflowPhase>) => {
    setPhases((p) => p.map((ph) => ph.id === phaseId ? { ...ph, ...patch } : ph))
  }

  const addStep = (phaseId: string) => {
    setPhases((p) => p.map((ph) => ph.id === phaseId
      ? { ...ph, steps: [...ph.steps, { id: genId(), name: 'New Step', action: '', durationEstimateMs: 60000 }] }
      : ph
    ))
  }

  const removeStep = (phaseId: string, stepId: string) => {
    setPhases((p) => p.map((ph) => ph.id === phaseId
      ? { ...ph, steps: ph.steps.filter((s) => s.id !== stepId) }
      : ph
    ))
  }

  const updateStep = (phaseId: string, stepId: string, patch: Partial<WorkflowStep>) => {
    setPhases((p) => p.map((ph) => ph.id === phaseId
      ? { ...ph, steps: ph.steps.map((s) => s.id === stepId ? { ...s, ...patch } : s) }
      : ph
    ))
  }

  const handleAssign = async () => {
    if (!selectedAgent || !workflowName || phases.length === 0) {
      showToast('Select an agent, add a name, and at least one phase', false)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: selectedAgent,
          definition: {
            agentName: selectedAgent,
            corp: AGENT_CORP_LOOKUP[selectedAgent],
            name: workflowName,
            phases,
          },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(`Workflow assigned to ${selectedAgent}`, true)
        loadAgentState(selectedAgent)
        loadAllStates()
      } else {
        showToast(data.error ?? 'Failed to assign workflow', false)
      }
    } catch {
      showToast('Network error', false)
    } finally {
      setSaving(false)
    }
  }

  const handleManualRun = async () => {
    if (!selectedAgent) return
    const res = await fetch(`/api/workflows/${selectedAgent}/execute`, { method: 'POST' })
    const data = await res.json()
    showToast(data.ok ? `Step executed: ${data.preview ?? 'done'}` : `Error: ${data.error}`, data.ok)
    loadAgentState(selectedAgent)
    loadAllStates()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-sm font-mono ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6 font-mono">⚙️ Workflow Editor</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent selector + current state */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-sm font-mono text-gray-400 mb-3">SELECT AGENT</h2>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">-- choose agent --</option>
              {agentsByCorps.map(({ corp, agents }) => (
                <optgroup key={corp} label={corp.toUpperCase()}>
                  {agents.map((a) => (
                    <option key={a} value={a}>
                      {a} {allStates[a]?.status ? `(${allStates[a].status})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedAgent && agentState && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              <h2 className="text-sm font-mono text-gray-400">CURRENT STATE</h2>
              <div className="flex items-center gap-2">
                <StatusBadge status={agentState.status} />
                <span className="text-xs font-mono text-gray-300">{agentState.workflowName ?? 'No workflow'}</span>
              </div>
              {agentState.currentPhase && (
                <p className="text-xs text-gray-400 font-mono">Phase: {agentState.currentPhase}</p>
              )}
              {agentState.currentStep && (
                <p className="text-xs text-gray-400 font-mono">Step: {agentState.currentStep}</p>
              )}
              {agentState.progress !== undefined && (
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${agentState.progress}%` }} />
                </div>
              )}
              {agentState.nextRunAt && (
                <p className="text-xs text-gray-500 font-mono">Next: {new Date(agentState.nextRunAt).toLocaleTimeString()}</p>
              )}
              <button
                onClick={handleManualRun}
                className="w-full mt-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-mono py-1.5 rounded"
              >
                ▶ Run Next Step Now
              </button>
            </div>
          )}

          {/* All agents status */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-sm font-mono text-gray-400 mb-3">ALL AGENTS</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {ALL_AGENT_NAMES.map((a) => (
                <div key={a} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-300">{a}</span>
                  <StatusBadge status={allStates[a]?.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Workflow builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-sm font-mono text-gray-400 mb-3">BUILD WORKFLOW</h2>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono mb-4"
              placeholder="Workflow name..."
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />

            {phases.map((phase, pi) => (
              <div key={phase.id} className="border border-gray-700 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono"
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                    placeholder="Phase name"
                  />
                  <input
                    className="w-32 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono"
                    type="number"
                    placeholder="Repeat ms"
                    value={phase.repeatIntervalMs ?? ''}
                    onChange={(e) => updatePhase(phase.id, { repeatIntervalMs: e.target.value ? Number(e.target.value) : null })}
                  />
                  <button onClick={() => removePhase(phase.id)} className="text-red-400 text-xs hover:text-red-300">✕</button>
                </div>

                {phase.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 mb-1 pl-3">
                    <input
                      className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono"
                      value={step.name}
                      onChange={(e) => updateStep(phase.id, step.id, { name: e.target.value })}
                      placeholder="Step name"
                    />
                    <input
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono"
                      value={step.action}
                      onChange={(e) => updateStep(phase.id, step.id, { action: e.target.value })}
                      placeholder="action_string"
                    />
                    <input
                      className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono"
                      type="number"
                      value={step.durationEstimateMs ?? 60000}
                      onChange={(e) => updateStep(phase.id, step.id, { durationEstimateMs: Number(e.target.value) })}
                      placeholder="ms"
                    />
                    <button onClick={() => removeStep(phase.id, step.id)} className="text-red-400 text-xs hover:text-red-300">✕</button>
                  </div>
                ))}

                <button
                  onClick={() => addStep(phase.id)}
                  className="ml-3 mt-1 text-xs text-blue-400 hover:text-blue-300 font-mono"
                >
                  + add step
                </button>
              </div>
            ))}

            <button
              onClick={addPhase}
              className="w-full border border-dashed border-gray-600 rounded py-2 text-xs text-gray-400 hover:text-gray-200 font-mono"
            >
              + Add Phase
            </button>
          </div>

          <button
            onClick={handleAssign}
            disabled={saving || !selectedAgent}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-mono py-3 rounded-lg text-sm"
          >
            {saving ? 'Assigning...' : `⚡ Assign Workflow to ${selectedAgent || 'Agent'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
