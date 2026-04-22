// ═══ VISIT REPLAY — Animated visitor journey playback on floor plan ═══

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Play, Pause, RotateCcw, Users, Clock, BarChart3 } from 'lucide-react'

export interface VisitStep {
  zoneId: string
  zoneName: string
  zoneColor: string
  x: number
  y: number
  enteredAt: number   // seconds from start
  exitedAt: number    // seconds from start
}

export interface VisitPath {
  id: string
  profileName: string
  profileColor: string
  steps: VisitStep[]
  totalDuration: number  // seconds
}

interface VisitReplayProps {
  paths: VisitPath[]
  scale: number
  activePaths?: string[]  // IDs of paths to show (all if undefined)
}

const SPEED_OPTIONS = [1, 2, 5, 10]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VisitReplay({ paths, scale, activePaths }: VisitReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const rafRef = useRef(0)
  const lastTickRef = useRef(0)

  const visiblePaths = useMemo(() => {
    if (!activePaths) return paths
    return paths.filter(p => activePaths.includes(p.id))
  }, [paths, activePaths])

  const maxDuration = useMemo(
    () => Math.max(...visiblePaths.map(p => p.totalDuration), 1),
    [visiblePaths]
  )

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    lastTickRef.current = performance.now()
    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setCurrentTime(prev => {
        const next = prev + delta * speed
        if (next >= maxDuration) {
          setIsPlaying(false)
          return maxDuration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, speed, maxDuration])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  // Compute current position for each path
  const pathPositions = useMemo(() => {
    return visiblePaths.map(path => {
      // Find current step
      const currentStep = path.steps.find(
        s => currentTime >= s.enteredAt && currentTime < s.exitedAt
      )
      if (!currentStep) {
        // Either before first step or after last
        const lastStep = path.steps[path.steps.length - 1]
        return {
          path,
          x: lastStep?.x ?? 0,
          y: lastStep?.y ?? 0,
          currentZone: lastStep?.zoneName ?? '',
          progress: currentTime / path.totalDuration,
          isActive: currentTime < path.totalDuration,
        }
      }

      return {
        path,
        x: currentStep.x,
        y: currentStep.y,
        currentZone: currentStep.zoneName,
        progress: currentTime / path.totalDuration,
        isActive: true,
      }
    })
  }, [visiblePaths, currentTime])

  // Analytics: zone dwell time ranking
  const analytics = useMemo(() => {
    const zoneDwell = new Map<string, { name: string; totalTime: number; visits: number }>()
    for (const path of visiblePaths) {
      for (const step of path.steps) {
        const existing = zoneDwell.get(step.zoneId) ?? { name: step.zoneName, totalTime: 0, visits: 0 }
        existing.totalTime += step.exitedAt - step.enteredAt
        existing.visits += 1
        zoneDwell.set(step.zoneId, existing)
      }
    }

    const ranked = Array.from(zoneDwell.entries())
      .map(([id, data]) => ({ zoneId: id, ...data }))
      .sort((a, b) => b.totalTime - a.totalTime)

    const totalZones = ranked.length
    const avgDwell = totalZones > 0
      ? Math.round(ranked.reduce((s, z) => s + z.totalTime, 0) / totalZones)
      : 0

    // Score: zones visited coverage + low avg friction + conversion
    const zonesVisitedRatio = Math.min(totalZones / 12, 1) // assume 12 zones is max
    const score = Math.round(zonesVisitedRatio * 40 + (1 - Math.min(avgDwell / 600, 1)) * 35 + 25)

    return { ranked, avgDwell, score, totalZones }
  }, [visiblePaths])

  return (
    <g>
      {/* Zone highlight: show which zone is currently active */}
      {pathPositions.filter(p => p.isActive).map(pos => {
        const step = pos.path.steps.find(
          s => currentTime >= s.enteredAt && currentTime < s.exitedAt
        )
        if (!step) return null
        return (
          <rect
            key={`highlight-${pos.path.id}`}
            x={step.x * scale - step.x * 0.1}
            y={step.y * scale - step.y * 0.1}
            width={12}
            height={12}
            fill={pos.path.profileColor}
            fillOpacity={0.08}
            stroke={pos.path.profileColor}
            strokeOpacity={0.3}
            strokeWidth={1}
            rx={2}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* Trail: show path taken so far */}
      {pathPositions.map(pos => {
        const passedSteps = pos.path.steps.filter(s => s.enteredAt <= currentTime)
        if (passedSteps.length < 2) return null

        const points = passedSteps.map(s => `${s.x * scale},${s.y * scale}`).join(' ')
        return (
          <polyline
            key={`trail-${pos.path.id}`}
            points={points}
            fill="none"
            stroke={pos.path.profileColor}
            strokeWidth={1.5}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* Current position dots */}
      {pathPositions.filter(p => p.isActive).map(pos => (
        <g key={`pos-${pos.path.id}`} style={{ pointerEvents: 'none' }}>
          {/* Pulse ring */}
          <circle
            cx={pos.x * scale}
            cy={pos.y * scale}
            r={6}
            fill="none"
            stroke={pos.path.profileColor}
            strokeWidth={1}
            strokeOpacity={0.3}
          >
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Position dot */}
          <circle
            cx={pos.x * scale}
            cy={pos.y * scale}
            r={4}
            fill={pos.path.profileColor}
            stroke="#fff"
            strokeWidth={1}
          />

          {/* Profile label */}
          <text
            x={pos.x * scale}
            y={pos.y * scale - 8}
            textAnchor="middle"
            fill={pos.path.profileColor}
            fontSize={6}
            fontWeight="bold"
            fontFamily="system-ui"
          >
            {pos.path.profileName}
          </text>
        </g>
      ))}

      {/* Controls overlay (bottom-center) */}
      <foreignObject x={0} y={0} width="100%" height="100%" style={{ pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
          {/* Playback controls */}
          <div
            style={{ pointerEvents: 'auto', position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
            className="bg-surface-1/90 border border-gray-700 rounded-xl px-4 py-3 backdrop-blur-sm flex items-center gap-3"
          >
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center transition-colors"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 text-white" />
                : <Play className="w-4 h-4 text-white ml-0.5" />
              }
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Timeline */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.round(maxDuration)}
                value={Math.round(currentTime)}
                onChange={e => setCurrentTime(Number(e.target.value))}
                className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[10px] font-mono text-gray-500 w-10">
                {formatTime(maxDuration)}
              </span>
            </div>

            {/* Speed */}
            <div className="flex gap-0.5">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                    speed === s
                      ? 'bg-emerald-600/30 text-emerald-300'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Profiles legend */}
            <div className="border-l border-gray-700 pl-3 flex items-center gap-2">
              <Users className="w-3 h-3 text-gray-500" />
              {visiblePaths.map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.profileColor }} />
                  <span className="text-[9px] text-gray-400">{p.profileName}</span>
                </div>
              ))}
            </div>

            {/* Analytics toggle */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-1.5 rounded transition-colors ${
                showAnalytics ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Analytics panel */}
          {showAnalytics && (
            <div
              style={{ pointerEvents: 'auto', position: 'absolute', top: 12, right: 12 }}
              className="bg-surface-1/90 border border-gray-700 rounded-xl p-4 backdrop-blur-sm w-64 space-y-3"
            >
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                Analytics
              </h3>

              {/* Score */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Score experience</span>
                <span className={`text-sm font-bold ${
                  analytics.score >= 70 ? 'text-emerald-400' : analytics.score >= 40 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {analytics.score}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-white">{analytics.totalZones}</div>
                  <div className="text-[9px] text-gray-500">Zones visitees</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-white flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {Math.round(analytics.avgDwell / 60)}min
                  </div>
                  <div className="text-[9px] text-gray-500">Dwell moyen</div>
                </div>
              </div>

              {/* Zone ranking */}
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Zones les plus visitees</p>
                <div className="space-y-1">
                  {analytics.ranked.slice(0, 5).map((z, i) => {
                    const maxTime = analytics.ranked[0]?.totalTime ?? 1
                    const barWidth = (z.totalTime / maxTime) * 100
                    return (
                      <div key={z.zoneId} className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-500 w-3 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-300 truncate">{z.name}</span>
                            <span className="text-gray-500 font-mono shrink-0 ml-1">{Math.round(z.totalTime / 60)}min</span>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full mt-0.5">
                            <div
                              className="h-full bg-blue-500/60 rounded-full"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  )
}
