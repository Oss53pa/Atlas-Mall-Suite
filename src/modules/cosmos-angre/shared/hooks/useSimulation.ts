import { useState, useCallback, useRef } from 'react'
import type {
  MonteCarloResult,
  EvacuationResult,
  Camera,
  Door,
  Zone,
  Floor,
  TransitionNode,
  Bottleneck,
  EvacuationFrame,
  FloorEvacResult,
} from '../proph3t/types'

interface UseSimulationResult {
  isRunning: boolean
  progress: number
  monteCarloResult: MonteCarloResult | null
  evacuationResult: EvacuationResult | null
  runMonteCarlo: (scenario: string, cameras: Camera[], zones: Zone[]) => Promise<void>
  runEvacuation: (
    floors: Floor[],
    zones: Zone[],
    doors: Door[],
    transitions: TransitionNode[],
  ) => Promise<void>
  cancel: () => void
}

export function useSimulation(): UseSimulationResult {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null)
  const [evacuationResult, setEvacuationResult] = useState<EvacuationResult | null>(null)
  const cancelRef = useRef(false)

  const runMonteCarlo = useCallback(
    async (scenario: string, cameras: Camera[], zones: Zone[]) => {
      setIsRunning(true)
      setProgress(0)
      cancelRef.current = false

      const totalRuns = 1000
      const batchSize = 50
      let successes = 0
      let totalDetectionTime = 0
      const failureCounts: Record<string, number> = {}
      const heatmap: number[][] = Array.from({ length: 20 }, () => Array(20).fill(0) as number[])

      for (let batch = 0; batch < totalRuns / batchSize; batch++) {
        if (cancelRef.current) break

        for (let r = 0; r < batchSize; r++) {
          const targetZone = zones[Math.floor(Math.random() * zones.length)]
          const ix = targetZone.x + Math.random() * targetZone.w
          const iy = targetZone.y + Math.random() * targetZone.h

          let detected = false
          let minDetTime = Infinity

          for (const cam of cameras) {
            const dx = ix - cam.x
            const dy = iy - cam.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > cam.range * 1.5) continue

            const angle = (Math.atan2(dy, dx) * 180) / Math.PI
            const diff = Math.abs(((angle - cam.angle + 540) % 360) - 180)
            if (diff > cam.fov / 2) continue

            const prob = Math.exp(-(dist * dist) / (2 * cam.range * cam.range))
            if (Math.random() < prob) {
              detected = true
              const detTime = dist * 2 + Math.random() * 5
              minDetTime = Math.min(minDetTime, detTime)
            }
          }

          if (detected) {
            successes++
            totalDetectionTime += minDetTime
          } else {
            failureCounts[targetZone.id] = (failureCounts[targetZone.id] ?? 0) + 1
          }

          const hx = Math.min(19, Math.floor(ix * 20))
          const hy = Math.min(19, Math.floor(iy * 20))
          if (!detected) heatmap[hy][hx]++
        }

        setProgress(Math.round(((batch + 1) * batchSize * 100) / totalRuns))
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      const failureZones = Object.entries(failureCounts)
        .map(([zoneId, count]) => ({ zoneId, failureRate: count / totalRuns }))
        .sort((a, b) => b.failureRate - a.failureRate)

      setMonteCarloResult({
        scenario,
        runs: totalRuns,
        resilienceScore: Math.round((successes / totalRuns) * 100),
        avgDetectionTimeSec: successes > 0 ? Math.round(totalDetectionTime / successes) : 0,
        failureZones,
        heatmapData: heatmap,
      })
      setIsRunning(false)
      setProgress(100)
    },
    [],
  )

  const runEvacuation = useCallback(
    async (
      floors: Floor[],
      zones: Zone[],
      doors: Door[],
      transitions: TransitionNode[],
    ) => {
      setIsRunning(true)
      setProgress(0)
      cancelRef.current = false

      const exits = doors.filter((d) => d.isExit)
      const totalAgents = zones.reduce((s, z) => s + Math.round(z.w * z.h * 8000), 0)
      const agents: { id: string; floorId: string; x: number; y: number; evacuated: boolean }[] = []

      let agentIdx = 0
      for (const zone of zones) {
        const count = Math.round(zone.w * zone.h * 8000)
        for (let i = 0; i < count; i++) {
          agents.push({
            id: `a-${agentIdx++}`,
            floorId: zone.floorId,
            x: zone.x + Math.random() * zone.w,
            y: zone.y + Math.random() * zone.h,
            evacuated: false,
          })
        }
      }

      const frames: EvacuationFrame[] = []
      const bottlenecks: Bottleneck[] = []
      const maxFrames = 300
      let evacuatedCount = 0

      for (let frame = 0; frame < maxFrames; frame++) {
        if (cancelRef.current) break
        if (evacuatedCount >= agents.length) break

        for (const agent of agents) {
          if (agent.evacuated) continue

          let nearestExit: Door | undefined
          let nearestDist = Infinity
          for (const exit of exits) {
            if (exit.floorId !== agent.floorId) continue
            const d = Math.sqrt((exit.x - agent.x) ** 2 + (exit.y - agent.y) ** 2)
            if (d < nearestDist) {
              nearestDist = d
              nearestExit = exit
            }
          }

          if (nearestExit) {
            const speed = 0.008 + Math.random() * 0.004
            const dx = nearestExit.x - agent.x
            const dy = nearestExit.y - agent.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.015) {
              agent.evacuated = true
              evacuatedCount++
            } else {
              agent.x += (dx / dist) * speed
              agent.y += (dy / dist) * speed
            }
          } else {
            const tr = transitions.find(
              (t) => t.fromFloor === floors.find((f) => f.id === agent.floorId)?.level,
            )
            if (tr) {
              const targetFloor = floors.find((f) => f.level === tr.toFloor)
              if (targetFloor) {
                agent.floorId = targetFloor.id
                agent.x = tr.x + (Math.random() - 0.5) * 0.05
                agent.y = tr.y + (Math.random() - 0.5) * 0.05
              }
            }
          }
        }

        if (frame % 10 === 0) {
          frames.push({
            time: frame,
            agents: agents.map((a) => ({ ...a })),
          })
          setProgress(Math.round((frame / maxFrames) * 100))
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      const totalTimeSec = frames.length * 1

      const floorResults: FloorEvacResult[] = floors.map((f) => {
        const floorAgents = agents.filter((a) => a.floorId === f.id || agents.some((orig) => orig.id === a.id && orig.floorId === f.id))
        return {
          floorId: f.id,
          level: f.level,
          totalAgents: floorAgents.length,
          evacuatedCount: floorAgents.filter((a) => a.evacuated).length,
          timeSec: Math.round(totalTimeSec * 0.8),
          bottlenecks: [],
        }
      })

      setEvacuationResult({
        totalTimeSec,
        conformNFS61938: totalTimeSec <= 180,
        bottlenecks,
        frames,
        recommendations: totalTimeSec > 180
          ? ['Ajouter des sorties de secours supplémentaires', 'Élargir les couloirs d\'évacuation']
          : ['Évacuation conforme NF S 61-938'],
        floorResults,
      })
      setIsRunning(false)
      setProgress(100)
    },
    [],
  )

  const cancel = useCallback(() => {
    cancelRef.current = true
    setIsRunning(false)
  }, [])

  return {
    isRunning,
    progress,
    monteCarloResult,
    evacuationResult,
    runMonteCarlo,
    runEvacuation,
    cancel,
  }
}
