'use client'

import { useState, useCallback } from 'react'
import type { CommandResponse, OverrideResponse, CharacterState } from '@/lib/types'

interface AgentStatusItem {
  name: string
  corp: string
  state: CharacterState
}

const ALL_AGENTS: AgentStatusItem[] = [
  // IntelCore
  { name: 'SOVEREIGN', corp: 'intelcore', state: 'idle' },
  { name: 'ORACLE', corp: 'intelcore', state: 'idle' },
  { name: 'MEMORY', corp: 'intelcore', state: 'idle' },
  { name: 'SENTRY', corp: 'intelcore', state: 'idle' },
  { name: 'SCRIBE', corp: 'intelcore', state: 'idle' },
  // XForce
  { name: 'ZARA', corp: 'xforce', state: 'idle' },
  { name: 'BLAZE', corp: 'xforce', state: 'idle' },
  { name: 'SCOUT', corp: 'xforce', state: 'idle' },
  { name: 'ECHO', corp: 'xforce', state: 'idle' },
  { name: 'HAWK', corp: 'xforce', state: 'idle' },
  { name: 'LUMEN', corp: 'xforce', state: 'idle' },
  { name: 'PIXEL', corp: 'xforce', state: 'idle' },
  // LinkedElite
  { name: 'NOVA', corp: 'linkedelite', state: 'idle' },
  { name: 'ORATOR', corp: 'linkedelite', state: 'idle' },
  { name: 'BRIDGE', corp: 'linkedelite', state: 'idle' },
  { name: 'ATLAS', corp: 'linkedelite', state: 'idle' },
  { name: 'DEAL_LI', corp: 'linkedelite', state: 'idle' },
  { name: 'GRAPH', corp: 'linkedelite', state: 'idle' },
  // GramGod
  { name: 'AURORA', corp: 'gramgod', state: 'idle' },
  { name: 'VIBE', corp: 'gramgod', state: 'idle' },
  { name: 'CHAT', corp: 'gramgod', state: 'idle' },
  { name: 'DEAL_IG', corp: 'gramgod', state: 'idle' },
  { name: 'LENS', corp: 'gramgod', state: 'idle' },
  // PagePower
  { name: 'CHIEF', corp: 'pagepower', state: 'idle' },
  { name: 'PULSE', corp: 'pagepower', state: 'idle' },
  { name: 'COMMUNITY', corp: 'pagepower', state: 'idle' },
  { name: 'REACH', corp: 'pagepower', state: 'idle' },
  // WebBoss
  { name: 'ROOT', corp: 'webboss', state: 'idle' },
  { name: 'CRAWL', corp: 'webboss', state: 'idle' },
  { name: 'BUILD', corp: 'webboss', state: 'idle' },
  { name: 'SHIELD', corp: 'webboss', state: 'idle' },
  { name: 'SPEED', corp: 'webboss', state: 'idle' },
]

const CORP_COLORS: Record<string, string> = {
  intelcore: '#FFD700',
  xforce: '#1DA1F2',
  linkedelite: '#0077B5',
  gramgod: '#E1306C',
  pagepower: '#1877F2',
  webboss: '#22C55E',
}

const STATE_DOT_COLORS: Record<CharacterState, string> = {
  idle: '#00F0FF',
  active: '#FFD700',
  blocked: '#EF4444',
  paused: '#64748B',
}

interface CommandPanelProps {
  agentStates?: Record<string, CharacterState>
}

export default function CommandPanel({ agentStates = {} }: CommandPanelProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResponse, setLastResponse] = useState<CommandResponse | null>(null)
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null)

  const submitCommand = useCallback(async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setOverrideMsg(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.trim() }),
      })
      if (res.ok) {
        const data: CommandResponse = await res.json()
        setLastResponse(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setInput('')
    }
  }, [input, loading])

  const sendOverride = useCallback(async (command: 'PAUSE' | 'RESUME' | 'STATUS') => {
    setOverrideMsg(null)
    try {
      const res = await fetch('/api/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, scope: 'all' }),
      })
      if (res.ok) {
        const data: OverrideResponse = await res.json()
        setOverrideMsg(data.message)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitCommand()
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto p-3">
      <h2 className="pixel-text text-pp-gold text-xs">COMMAND CENTER</h2>

      {/* Natural language input */}
      <div className="pixel-card p-2 flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Issue a command to your empire..."
          rows={3}
          className="w-full bg-transparent text-pp-text resize-none outline-none placeholder-pp-muted"
          style={{ fontSize: 10, fontFamily: 'monospace' }}
        />
        <button
          onClick={submitCommand}
          disabled={loading || !input.trim()}
          className="pixel-text text-pp-bg px-3 py-1 rounded disabled:opacity-50 transition-opacity"
          style={{ fontSize: 8, background: '#FFD700' }}
        >
          {loading ? 'ROUTING...' : '▶ EXECUTE'}
        </button>
      </div>

      {/* Last command response */}
      {lastResponse && (
        <div className="pixel-card p-2 space-y-1">
          <div className="pixel-text text-pp-accent" style={{ fontSize: 7 }}>LAST COMMAND</div>
          <div style={{ fontSize: 9 }}>
            <span className="text-pp-muted">Intent: </span>
            <span className="text-pp-text">{lastResponse.intent}</span>
          </div>
          <div style={{ fontSize: 9 }}>
            <span className="text-pp-muted">Routed to: </span>
            <span style={{ color: CORP_COLORS[lastResponse.routedTo.corp] ?? '#E2E8F0' }}>
              {lastResponse.routedTo.corp.toUpperCase()} / {lastResponse.routedTo.agent}
            </span>
          </div>
          <div style={{ fontSize: 9 }}>
            <span className="text-pp-muted">Status: </span>
            <span
              className={
                lastResponse.status === 'executing'
                  ? 'text-pp-gold'
                  : lastResponse.status === 'blocked_by_hawk'
                  ? 'text-pp-danger'
                  : 'text-pp-accent'
              }
            >
              {lastResponse.status.toUpperCase()}
            </span>
          </div>
          {lastResponse.preview && (
            <div className="text-pp-muted border-t border-pp-border pt-1 mt-1" style={{ fontSize: 8 }}>
              {lastResponse.preview}
            </div>
          )}
        </div>
      )}

      {/* Override buttons */}
      <div className="pixel-card p-2">
        <div className="pixel-text text-pp-muted mb-2" style={{ fontSize: 7 }}>QUICK OVERRIDES</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => sendOverride('PAUSE')}
            className="pixel-text px-2 py-1 rounded text-white"
            style={{ fontSize: 7, background: '#EF4444' }}
          >
            ⏸ PAUSE ALL
          </button>
          <button
            onClick={() => sendOverride('RESUME')}
            className="pixel-text px-2 py-1 rounded text-white"
            style={{ fontSize: 7, background: '#22C55E' }}
          >
            ▶ RESUME ALL
          </button>
          <button
            onClick={() => sendOverride('STATUS')}
            className="pixel-text px-2 py-1 rounded"
            style={{ fontSize: 7, background: '#1E1E3A', color: '#00F0FF' }}
          >
            📊 STATUS
          </button>
        </div>
        {overrideMsg && (
          <div className="text-pp-accent mt-2" style={{ fontSize: 9 }}>
            {overrideMsg}
          </div>
        )}
      </div>

      {/* Agent status grid */}
      <div className="pixel-card p-2 flex-1">
        <div className="pixel-text text-pp-muted mb-2" style={{ fontSize: 7 }}>
          AGENT STATUS ({ALL_AGENTS.length})
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {ALL_AGENTS.map((agent) => {
            const state: CharacterState = agentStates[agent.name] ?? 'idle'
            return (
              <div
                key={agent.name}
                className="flex items-center gap-1 px-1 py-0.5 rounded"
                style={{ background: '#0A0A14' }}
                title={`${agent.name} — ${state}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: STATE_DOT_COLORS[state] }}
                />
                <span
                  className="truncate"
                  style={{
                    fontSize: 7,
                    color: CORP_COLORS[agent.corp] ?? '#E2E8F0',
                    fontFamily: 'monospace',
                  }}
                >
                  {agent.name.length > 7 ? agent.name.slice(0, 7) : agent.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
