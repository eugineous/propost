'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import type { Office3DAgent } from './types'

interface Props {
  agent: Office3DAgent
  onClick: (agent: Office3DAgent) => void
}

export default function AgentCharacter({ agent, onClick }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const t = useRef(Math.random() * Math.PI * 2)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    t.current += delta

    switch (agent.animationState) {
      case 'typing':
        // Subtle bob while typing
        groupRef.current.position.y = agent.position[1] + Math.sin(t.current * 8) * 0.02
        break
      case 'celebrating':
        // Jump animation
        groupRef.current.position.y = agent.position[1] + Math.abs(Math.sin(t.current * 6)) * 0.3
        groupRef.current.rotation.y = t.current * 3
        break
      case 'walking':
        // Sway while walking
        groupRef.current.rotation.z = Math.sin(t.current * 4) * 0.1
        break
      case 'error':
        // Shake
        groupRef.current.position.x = agent.position[0] + Math.sin(t.current * 15) * 0.05
        break
      case 'sleeping':
        // Slow nod
        groupRef.current.rotation.x = Math.sin(t.current * 0.5) * 0.15
        break
      default:
        // Idle: gentle breathing
        groupRef.current.position.y = agent.position[1] + Math.sin(t.current * 1.5) * 0.01
        groupRef.current.rotation.y = agent.rotation
    }
  })

  const color = new THREE.Color(agent.color)
  const isWorking = agent.animationState === 'typing'
  const isError = agent.animationState === 'error'

  return (
    <group
      ref={groupRef}
      position={agent.position}
      rotation={[0, agent.rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(agent) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.18, 0.3, 0.12]} />
        <meshStandardMaterial color={color} emissive={isWorking ? color : '#000'} emissiveIntensity={isWorking ? 0.3 : 0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.035, 0.54, 0.09]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color={isError ? '#FF0000' : '#FFFFFF'} />
      </mesh>
      <mesh position={[0.035, 0.54, 0.09]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color={isError ? '#FF0000' : '#FFFFFF'} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.13, 0.28, 0]} rotation={[0, 0, agent.animationState === 'typing' ? Math.sin(Date.now() * 0.01) * 0.3 : 0.3]}>
        <boxGeometry args={[0.06, 0.2, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right arm */}
      <mesh position={[0.13, 0.28, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.06, 0.2, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.055, 0.0, 0]}>
        <boxGeometry args={[0.07, 0.2, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.055, 0.0, 0]}>
        <boxGeometry args={[0.07, 0.2, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Error indicator */}
      {isError && (
        <mesh position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={1} />
        </mesh>
      )}

      {/* Hover glow */}
      {hovered && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color={agent.color} transparent opacity={0.15} />
        </mesh>
      )}

      {/* Name tag + speech bubble */}
      <Billboard position={[0, 0.85, 0]}>
        <Html center distanceFactor={4}>
          <div style={{ textAlign: 'center', pointerEvents: 'none', userSelect: 'none' }}>
            {isWorking && agent.workflowStep && (
              <div style={{
                background: 'rgba(0,0,0,0.85)',
                border: `1px solid ${agent.color}`,
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 9,
                color: agent.color,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 2,
              }}>
                💬 {agent.workflowStep}
              </div>
            )}
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 3,
              padding: '1px 4px',
              fontSize: 8,
              color: '#fff',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}>
              {agent.name.toUpperCase()}
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  )
}
