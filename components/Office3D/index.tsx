'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Room3D from './Room3D'
import { ROOM_CONFIG, AGENT_COLORS, type Office3DRoom, type Office3DAgent, type AgentAnimState, type Corp } from './types'
import { AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'
import { ALL_AGENT_NAMES } from '@/lib/agentState'

interface AgentWorkflowKV {
  workflowId?: string
  workflowName?: string
  currentPhase?: string
  currentStep?: string
  status?: string
  lastRunAt?: string
  nextRunAt?: string
  progress?: number
}

function statusToAnim(status?: string): AgentAnimState {
  switch (status) {
    case 'active': return 'typing'
    case 'error': return 'error'
    case 'completed': return 'idle'
    case 'paused': return 'sleeping'
    default: return 'idle'
  }
}

function buildRooms(agentStates: Record<string, AgentWorkflowKV | null>): Office3DRoom[] {
  const rooms: Office3DRoom[] = []

  for (const [corp, config] of Object.entries(ROOM_CONFIG)) {
    const corpAgents = ALL_AGENT_NAMES.filter((a) => AGENT_CORP_LOOKUP[a] === corp)
    const agents: Office3DAgent[] = corpAgents.map((name, i) => {
      const state = agentStates[name]
      const cols = 3
      const col = i % cols
      const row = Math.floor(i / cols)
      return {
        name,
        position: [-1.2 + col * 0.9, 0.1, -1.2 + row * 0.9] as [number, number, number],
        rotation: Math.PI,
        animationState: statusToAnim(state?.status),
        workflowStep: state?.currentStep,
        color: AGENT_COLORS[name] ?? '#888',
        corp: corp as Corp,
      }
    })

    const isActive = agents.some((a) => a.animationState === 'typing')

    rooms.push({
      corp: corp as Corp,
      label: config.label,
      theme: config.theme,
      agents,
      gridPos: config.gridPos,
      isActive,
      accentColor: config.accentColor,
    })
  }

  return rooms
}

function CameraController({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree()
  const animating = useRef(false)

  useEffect(() => {
    if (!target) return
    animating.current = true
    const start = camera.position.clone()
    const end = new THREE.Vector3(target.x, target.y + 4, target.z + 5)
    let t = 0
    const animate = () => {
      t += 0.03
      if (t >= 1) { camera.position.copy(end); animating.current = false; return }
      camera.position.lerpVectors(start, end, t)
      camera.lookAt(target)
      requestAnimationFrame(animate)
    }
    animate()
  }, [target, camera])

  return null
}

interface AgentPanelProps {
  agent: Office3DAgent
  state: AgentWorkflowKV | null
  onClose: () => void
}

function AgentPanel({ agent, state, onClose }: AgentPanelProps) {
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, width: 280,
      background: 'rgba(10,10,20,0.95)', border: `1px solid ${agent.color}`,
      borderRadius: 8, padding: 16, zIndex: 100, fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: agent.color, fontWeight: 'bold', fontSize: 13 }}>
          {agent.name.toUpperCase()}
        </div>
        <button onClick={onClose} style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.8 }}>
        <div><span style={{ color: '#666' }}>Corp:</span> {agent.corp}</div>
        <div><span style={{ color: '#666' }}>Status:</span> <span style={{ color: agent.color }}>{state?.status ?? 'idle'}</span></div>
        {state?.workflowName && <div><span style={{ color: '#666' }}>Workflow:</span> {state.workflowName}</div>}
        {state?.currentPhase && <div><span style={{ color: '#666' }}>Phase:</span> {state.currentPhase}</div>}
        {state?.currentStep && <div><span style={{ color: '#666' }}>Step:</span> {state.currentStep}</div>}
        {state?.progress !== undefined && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: '#666', marginBottom: 4 }}>Progress: {state.progress}%</div>
            <div style={{ background: '#222', borderRadius: 4, height: 6 }}>
              <div style={{ background: agent.color, width: `${state.progress}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
        {state?.lastRunAt && <div style={{ marginTop: 8 }}><span style={{ color: '#666' }}>Last run:</span> {new Date(state.lastRunAt).toLocaleTimeString()}</div>}
        {state?.nextRunAt && <div><span style={{ color: '#666' }}>Next run:</span> {new Date(state.nextRunAt).toLocaleTimeString()}</div>}
      </div>
    </div>
  )
}

export default function Office3D() {
  const [agentStates, setAgentStates] = useState<Record<string, AgentWorkflowKV | null>>({})
  const [selectedAgent, setSelectedAgent] = useState<Office3DAgent | null>(null)
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null)
  const rooms = buildRooms(agentStates)

  const fetchStates = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/live')
      const data = await res.json()
      if (data.ok) setAgentStates(data.agents)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchStates()
    const interval = setInterval(fetchStates, 5000)
    return () => clearInterval(interval)
  }, [fetchStates])

  const handleAgentClick = (agent: Office3DAgent) => {
    setSelectedAgent(agent)
    const [col, row] = ROOM_CONFIG[agent.corp].gridPos
    const ox = (col - 1) * 4.5
    const oz = (row - 1) * 4.5
    setCameraTarget(new THREE.Vector3(ox + agent.position[0], 0, oz + agent.position[2]))
  }

  const handleRoomClick = (corp: string) => {
    const config = ROOM_CONFIG[corp as Corp]
    if (!config) return
    const [col, row] = config.gridPos
    setCameraTarget(new THREE.Vector3((col - 1) * 4.5, 0, (row - 1) * 4.5))
  }

  const activeCount = Object.values(agentStates).filter((s) => (s as AgentWorkflowKV | null)?.status === 'active').length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500 }}>
      {/* HUD */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 50,
        background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '6px 12px',
        fontFamily: 'monospace', fontSize: 11, color: '#aaa',
        border: '1px solid #333',
      }}>
        🟢 {activeCount} agents working · {rooms.filter((r) => r.isActive).length} rooms active
      </div>

      {/* Agent side panel */}
      {selectedAgent && (
        <AgentPanel
          agent={selectedAgent}
          state={agentStates[selectedAgent.name] ?? null}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      <Canvas
        shadows
        camera={{ position: [0, 12, 14], fov: 50 }}
        style={{ background: '#050510' }}
      >
        <Suspense fallback={null}>
          <CameraController target={cameraTarget} />

          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
          <pointLight position={[0, 8, 0]} intensity={0.5} color="#4444ff" />

          {/* Stars background */}
          <Stars radius={80} depth={50} count={3000} factor={3} fade />

          {/* Rooms */}
          {rooms.map((room) => (
            <Room3D
              key={room.corp}
              room={room}
              onAgentClick={handleAgentClick}
              onRoomClick={handleRoomClick}
            />
          ))}

          {/* Ground plane */}
          <mesh position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#080818" />
          </mesh>

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={4}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
