'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import AgentCharacter from './AgentCharacter'
import type { Office3DRoom, Office3DAgent } from './types'

interface Props {
  room: Office3DRoom
  onAgentClick: (agent: Office3DAgent) => void
  onRoomClick: (corp: string) => void
}

const ROOM_SIZE = 4
const WALL_H = 2.2

export default function Room3D({ room, onAgentClick, onRoomClick }: Props) {
  const glowRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta
    if (glowRef.current && room.isActive) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.05 + Math.sin(t.current * 2) * 0.03
    }
  })

  const [col, row] = room.gridPos
  const ox = (col - 1) * (ROOM_SIZE + 0.5)
  const oz = (row - 1) * (ROOM_SIZE + 0.5)
  const color = new THREE.Color(room.accentColor)

  return (
    <group position={[ox, 0, oz]} onClick={(e) => { e.stopPropagation(); onRoomClick(room.corp) }}>
      {/* Floor */}
      <mesh ref={glowRef} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[ROOM_SIZE, 0.05, ROOM_SIZE]} />
        <meshStandardMaterial
          color={room.accentColor}
          emissive={room.accentColor}
          emissiveIntensity={room.isActive ? 0.05 : 0.01}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Walls (back + sides, no front) */}
      {/* Back wall */}
      <mesh position={[0, WALL_H / 2, -ROOM_SIZE / 2]}>
        <boxGeometry args={[ROOM_SIZE, WALL_H, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-ROOM_SIZE / 2, WALL_H / 2, 0]}>
        <boxGeometry args={[0.05, WALL_H, ROOM_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      {/* Right wall */}
      <mesh position={[ROOM_SIZE / 2, WALL_H / 2, 0]}>
        <boxGeometry args={[0.05, WALL_H, ROOM_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>

      {/* Room label */}
      <Text
        position={[0, WALL_H + 0.2, -ROOM_SIZE / 2 + 0.1]}
        fontSize={0.18}
        color={room.accentColor}
        anchorX="center"
        anchorY="middle"
        font="/fonts/monospace.ttf"
      >
        {room.label.toUpperCase()}
      </Text>

      {/* Furniture based on theme */}
      <RoomFurniture theme={room.theme} accentColor={room.accentColor} />

      {/* Active glow ring */}
      {room.isActive && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ROOM_SIZE / 2 - 0.1, ROOM_SIZE / 2, 32]} />
          <meshStandardMaterial color={room.accentColor} emissive={room.accentColor} emissiveIntensity={0.5} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Agents */}
      {room.agents.map((agent) => (
        <AgentCharacter key={agent.name} agent={agent} onClick={onAgentClick} />
      ))}
    </group>
  )
}

function RoomFurniture({ theme, accentColor }: { theme: string; accentColor: string }) {
  const deskColor = '#2d2d4e'
  const screenColor = accentColor

  switch (theme) {
    case 'command_center':
      return (
        <>
          {/* Central command desk */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.1, 8]} />
            <meshStandardMaterial color={deskColor} />
          </mesh>
          {/* Multiple screens */}
          {[-0.6, 0, 0.6].map((x, i) => (
            <mesh key={i} position={[x, 1.2, -1.5]}>
              <boxGeometry args={[0.5, 0.35, 0.03]} />
              <meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={0.4} />
            </mesh>
          ))}
        </>
      )
    case 'war_room':
      return (
        <>
          {/* Long tactical table */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.5, 0.08, 1]} />
            <meshStandardMaterial color={deskColor} />
          </mesh>
          {/* Screen wall */}
          <mesh position={[0, 1.1, -1.7]}>
            <boxGeometry args={[3, 1.2, 0.05]} />
            <meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={0.3} />
          </mesh>
        </>
      )
    case 'studio':
      return (
        <>
          {/* Ring light */}
          <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.05, 8, 32]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
          </mesh>
          {/* Camera rig */}
          <mesh position={[0.5, 0.8, 0.5]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </>
      )
    case 'boardroom':
      return (
        <>
          {/* Long boardroom table */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[3, 0.08, 1.2]} />
            <meshStandardMaterial color="#1a3a5c" />
          </mesh>
          {/* Projector screen */}
          <mesh position={[0, 1.2, -1.7]}>
            <boxGeometry args={[2, 1, 0.03]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.1} />
          </mesh>
        </>
      )
    case 'server_room':
      return (
        <>
          {/* Server racks */}
          {[-1, 0, 1].map((x, i) => (
            <mesh key={i} position={[x, 0.9, -1.5]}>
              <boxGeometry args={[0.4, 1.8, 0.3]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
          {/* Blinking LEDs */}
          {[-1, 0, 1].map((x, i) => (
            <mesh key={`led-${i}`} position={[x + 0.15, 0.9, -1.34]}>
              <boxGeometry args={[0.05, 0.05, 0.02]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1} />
            </mesh>
          ))}
        </>
      )
    case 'finance_floor':
      return (
        <>
          {/* Trading desks */}
          {[-0.8, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 0.35, 0]}>
              <boxGeometry args={[1, 0.08, 0.6]} />
              <meshStandardMaterial color={deskColor} />
            </mesh>
          ))}
          {/* Ticker board */}
          <mesh position={[0, 1.3, -1.7]}>
            <boxGeometry args={[3, 0.4, 0.04]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} />
          </mesh>
        </>
      )
    default:
      return (
        <>
          {/* Generic desks */}
          {[-0.7, 0.7].map((x, i) => (
            <mesh key={i} position={[x, 0.35, 0.3]}>
              <boxGeometry args={[0.9, 0.08, 0.5]} />
              <meshStandardMaterial color={deskColor} />
            </mesh>
          ))}
        </>
      )
  }
}
