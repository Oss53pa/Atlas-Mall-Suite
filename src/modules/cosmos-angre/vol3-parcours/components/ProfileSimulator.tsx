import React, { useState, useEffect, useRef } from 'react'
import type { VisitorProfile, POI } from '../../shared/proph3t/types'

interface ProfileSimulatorProps {
  profiles: VisitorProfile[]
  pois: POI[]
  isPlaying: boolean
  scale: number
}

interface AgentState {
  profileId: string
  x: number
  y: number
  targetIdx: number
  color: string
  name: string
}

export default function ProfileSimulator({ profiles, pois, isPlaying, scale }: ProfileSimulatorProps) {
  const [agents, setAgents] = useState<AgentState[]>([])
  const frameRef = useRef<number>(0)

  // Initialize agents
  useEffect(() => {
    if (profiles.length === 0 || pois.length === 0) return
    const initial: AgentState[] = profiles.map((p) => {
      const attractorPois = pois.filter((poi) => p.attractors.includes(poi.type))
      const startPoi = attractorPois.length > 0 ? attractorPois[0] : pois[0]
      return {
        profileId: p.id,
        x: startPoi.x,
        y: startPoi.y,
        targetIdx: 0,
        color: p.color || '#fff',
        name: p.name,
      }
    })
    setAgents(initial)
  }, [profiles, pois])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || agents.length === 0 || pois.length === 0) return

    let animFrame: number
    const animate = () => {
      setAgents((prev) =>
        prev.map((agent) => {
          const profile = profiles.find((p) => p.id === agent.profileId)
          if (!profile) return agent

          const attractorPois = pois.filter((poi) => profile.attractors.includes(poi.type))
          const targets = attractorPois.length > 0 ? attractorPois : pois
          const target = targets[agent.targetIdx % targets.length]
          if (!target) return agent

          const dx = target.x - agent.x
          const dy = target.y - agent.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const speed = (profile.speed || 1.2) * 0.001

          if (dist < 0.02) {
            return {
              ...agent,
              targetIdx: (agent.targetIdx + 1) % targets.length,
            }
          }

          return {
            ...agent,
            x: agent.x + (dx / dist) * speed,
            y: agent.y + (dy / dist) * speed,
          }
        }),
      )
      animFrame = requestAnimationFrame(animate)
    }

    animFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrame)
  }, [isPlaying, agents.length, profiles, pois])

  return (
    <>
      {agents.map((agent) => (
        <g key={agent.profileId}>
          {/* Trail */}
          <circle
            cx={agent.x * scale}
            cy={agent.y * scale}
            r={8}
            fill={agent.color}
            fillOpacity={0.1}
          />
          {/* Dot */}
          <circle
            cx={agent.x * scale}
            cy={agent.y * scale}
            r={4}
            fill={agent.color}
            stroke="#fff"
            strokeWidth={0.8}
          />
          {/* Label */}
          <text
            x={agent.x * scale + 7}
            y={agent.y * scale + 3}
            fill={agent.color}
            fontSize={6}
            fontFamily="system-ui"
            fontWeight={500}
          >
            {agent.name}
          </text>
        </g>
      ))}
    </>
  )
}
