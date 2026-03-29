'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { CharacterState } from '@/lib/types'

const CORP_COLORS: Record<string, string> = {
  intelcore: '#FFD700', xforce: '#1DA1F2', linkedelite: '#0077B5',
  gramgod: '#E1306C', pagepower: '#1877F2', webboss: '#22C55E',
}

const ALL_AGENTS = [
  { name: 'SOVEREIGN', corp: 'intelcore' }, { name: 'ORACLE', corp: 'intelcore' },
  { name: 'MEMORY', corp: 'intelcore' }, { name: 'SENTRY', corp: 'intelcore' },
  { name: 'SCRIBE', corp: 'intelcore' }, { name: 'ZARA', corp: 'xforce' },
  { name: 'BLAZE', corp: 'xforce' }, { name: 'SCOUT', corp: 'xforce' },
  { name: 'ECHO', corp: 'xforce' }, { name: 'HAWK', corp: 'xforce' },
  { name: 'LUMEN', corp: 'xforce' }, { name: 'PIXEL', corp: 'xforce' },
  { name: 'NOVA', corp: 'linkedelite' }, { name: 'ORATOR', corp: 'linkedelite' },
  { name: 'BRIDGE', corp: 'linkedelite' }, { name: 'ATLAS', corp: 'linkedelite' },
  { name: 'DEAL_LI', corp: 'linkedelite' }, { name: 'GRAPH', corp: 'linkedelite' },
  { name: 'AURORA', corp: 'gramgod' }, { name: 'VIBE', corp: 'gramgod' },
  { name: 'CHAT', corp: 'gramgod' }, { name: 'DEAL_IG', corp: 'gramgod' },
  { name: 'LENS', corp: 'gramgod' }, { name: 'CHIEF', corp: 'pagepower' },
  { name: 'PULSE', corp: 'pagepower' }, { name: 'COMMUNITY', corp: 'pagepower' },
  { name: 'REACH', corp: 'pagepower' }, { name: 'ROOT', corp: 'webboss' },
  { name: 'CRAWL', corp: 'webboss' }, { name: 'BUILD', corp: 'webboss' },
  { name: 'SHIELD', corp: 'webboss' }, { name: 'SPEED', corp: 'webboss' },
]

const QUICK_COMMANDS = [
  { label: '📸 Clear IG DMs', cmd: 'Reply to all unreplied Instagram DMs' },
  { label: '📈 Find trends', cmd: 'Scout trending topics in Kenya right now' },
  { label: '✍️ Write tweet', cmd: 'Write a viral tweet about Kenyan media' },
  { label: '📊 Daily briefing', cmd: 'Generate today\'s situation report' },
  { label: '🧠 Learn patterns', cmd: 'Analyze post performance and extract learnings' },
  { label: '🛡️ Crisis check', cmd: 'Check all platforms for crisis signals' },
]

interface CommandPanelProps {
  agentStates?: Record<string, CharacterState>
}

export default function CommandPanel({ agentStates = {} }: CommandPanelProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recogRef = useRef<SpeechRecognition | null>(null)

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    return Boolean(SR)
  }, [])

  useEffect(() => {
    if (!speechSupported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recog: SpeechRecognition = new SR()
    recog.continuous = false
    recog.interimResults = true
    recog.lang = 'en-KE'
    recog.onresult = (evt) => {
      let text = ''
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        text += evt.results[i]?.[0]?.transcript ?? ''
      }
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text))
    }
    recog.onend = () => setIsListening(false)
    recog.onerror = () => setIsListening(false)
    recogRef.current = recog
    return () => {
      try { recog.stop() } catch { /* ignore */ }
      recogRef.current = null
    }
  }, [speechSupported])

  const execute = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json() as { error?: string; intent?: string; routedTo?: { corp: string; agent: string }; status?: string; preview?: string }
      if (!res.ok) {
        setResult({ type: 'error', message: data.error ?? 'Command failed' })
      } else {
        const corp = data.routedTo?.corp ?? ''
        const agent = data.routedTo?.agent ?? ''
        setResult({
          type: 'success',
          message: `✅ Routed to ${corp.toUpperCase()} / ${agent} — ${data.status}`,
          detail: data.preview,
        })
      }
    } catch {
      setResult({ type: 'error', message: 'Network error — check connection' })
    } finally {
      setLoading(false)
      setInput('')
    }
  }, [loading])

  const toggleListening = useCallback(() => {
    if (!speechSupported || loading) return
    const recog = recogRef.current
    if (!recog) return
    if (isListening) {
      try { recog.stop() } catch { /* ignore */ }
      setIsListening(false)
      return
    }
    setIsListening(true)
    try { recog.start() } catch { setIsListening(false) }
  }, [speechSupported, isListening, loading])

  const sendOverride = useCallback(async (command: string) => {
    try {
      const res = await fetch('/api/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, scope: 'all' }),
      })
      const data = await res.json() as { message?: string }
      setResult({ type: 'success', message: data.message ?? `${command} sent` })
    } catch {
      setResult({ type: 'error', message: 'Override failed' })
    }
  }, [])

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto p-3">
      <h2 className="pixel-text text-pp-gold" style={{ fontSize: 8 }}>COMMAND CENTER</h2>

      {/* Command input */}
      <div className="rounded p-2 flex flex-col gap-2" style={{ background: '#12121F', border: '1px solid #1E1E3A' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="pixel-text text-pp-muted" style={{ fontSize: 7 }}>
            {speechSupported ? 'VOICE READY' : 'VOICE UNAVAILABLE'}
          </div>
          <button
            onClick={toggleListening}
            disabled={!speechSupported || loading}
            className="rounded px-2 py-1 disabled:opacity-40"
            style={{
              background: isListening ? 'rgba(0,240,255,0.14)' : 'rgba(148,163,184,0.10)',
              border: `1px solid ${isListening ? '#00F0FF55' : '#1E1E3A'}`,
              color: isListening ? '#00F0FF' : '#94A3B8',
              fontSize: 8,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
            title="Voice to text (Web Speech API)"
          >
            {isListening ? '🎙️ LISTENING…' : '🎤 VOICE'}
          </button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); execute(input) } }}
          placeholder="Tell your empire what to do..."
          rows={3}
          className="w-full bg-transparent text-pp-text resize-none outline-none placeholder-pp-muted"
          style={{ fontSize: 10, fontFamily: 'monospace' }}
        />
        <button
          onClick={() => execute(input)}
          disabled={loading || !input.trim()}
          className="pixel-text px-3 py-1 rounded disabled:opacity-40"
          style={{ fontSize: 8, background: '#FFD700', color: '#0A0A14' }}
        >
          {loading ? '⚙️ ROUTING...' : '▶ EXECUTE'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded p-2" style={{
          background: result.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.type === 'success' ? '#22C55E44' : '#EF444444'}`,
        }}>
          <div style={{ fontSize: 9, color: result.type === 'success' ? '#22C55E' : '#EF4444' }}>{result.message}</div>
          {result.detail && <div style={{ fontSize: 8, color: '#94A3B8', marginTop: 4 }}>{result.detail}</div>}
        </div>
      )}

      {/* Quick commands */}
      <div className="rounded p-2" style={{ background: '#12121F', border: '1px solid #1E1E3A' }}>
        <div className="pixel-text text-pp-muted mb-2" style={{ fontSize: 7 }}>QUICK COMMANDS</div>
        <div className="grid grid-cols-2 gap-1">
          {QUICK_COMMANDS.map(qc => (
            <button
              key={qc.cmd}
              onClick={() => execute(qc.cmd)}
              disabled={loading}
              className="rounded px-1 py-1 text-left disabled:opacity-40"
              style={{ background: '#0A0A14', border: '1px solid #1E1E3A', color: '#94A3B8', fontSize: 7, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              {qc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overrides */}
      <div className="rounded p-2" style={{ background: '#12121F', border: '1px solid #1E1E3A' }}>
        <div className="pixel-text text-pp-muted mb-2" style={{ fontSize: 7 }}>QUICK OVERRIDES</div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => sendOverride('PAUSE')} className="rounded px-2 py-1" style={{ background: '#EF444422', border: '1px solid #EF444444', color: '#EF4444', fontSize: 7, fontFamily: 'monospace', cursor: 'pointer' }}>⏸ PAUSE ALL</button>
          <button onClick={() => sendOverride('RESUME')} className="rounded px-2 py-1" style={{ background: '#22C55E22', border: '1px solid #22C55E44', color: '#22C55E', fontSize: 7, fontFamily: 'monospace', cursor: 'pointer' }}>▶ RESUME ALL</button>
          <button onClick={() => sendOverride('STATUS')} className="rounded px-2 py-1" style={{ background: '#00F0FF11', border: '1px solid #00F0FF33', color: '#00F0FF', fontSize: 7, fontFamily: 'monospace', cursor: 'pointer' }}>📊 STATUS</button>
        </div>
      </div>

      {/* Agent grid */}
      <div className="rounded p-2 flex-1" style={{ background: '#12121F', border: '1px solid #1E1E3A' }}>
        <div className="pixel-text text-pp-muted mb-2" style={{ fontSize: 7 }}>AGENT STATUS ({ALL_AGENTS.length})</div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {ALL_AGENTS.map(a => {
            const state: CharacterState = agentStates[a.name] ?? 'idle'
            const dotColor = state === 'active' ? '#FFD700' : state === 'blocked' ? '#EF4444' : state === 'paused' ? '#64748B' : '#00F0FF'
            return (
              <div key={a.name} className="flex items-center gap-1 px-1 py-0.5 rounded" style={{ background: '#0A0A14' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 7, color: CORP_COLORS[a.corp] ?? '#E2E8F0', fontFamily: 'monospace' }} className="truncate">
                  {a.name.length > 7 ? a.name.slice(0, 7) : a.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
