import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { EvacuationResult, Floor } from '../../shared/proph3t/types'

const S = 4

interface EvacuationSimProps {
  floor: Floor
  evacResult: EvacuationResult | null
  isSimulating: boolean
  onStartSimulation: () => void
  onStopSimulation: () => void
}

export default function EvacuationSim({
  floor, evacResult, isSimulating, onStartSimulation, onStopSimulation,
}: EvacuationSimProps) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!isSimulating || !evacResult) return
    const totalFrames = evacResult.frames.length
    if (totalFrames === 0) return

    const tick = () => {
      setCurrentFrame((prev) => {
        if (prev >= totalFrames - 1) {
          onStopSimulation()
          return prev
        }
        return prev + 1
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animRef.current)
  }, [isSimulating, evacResult, onStopSimulation])

  const handleReset = useCallback(() => {
    setCurrentFrame(0)
    onStopSimulation()
  }, [onStopSimulation])

  const frame = evacResult?.frames[currentFrame]
  const totalTime = evacResult?.totalTimeSec ?? 0
  const conformNF = evacResult?.conformNFS61938 ?? false

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-red-400">Simulation Evacuation</h3>
        <div className="flex-1" />
        <button
          onClick={isSimulating ? onStopSimulation : onStartSimulation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-600/30 transition-colors"
        >
          {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isSimulating ? 'Pause' : 'Lancer'}
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Simulation Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          viewBox={`0 0 ${floor.widthM * S} ${floor.heightM * S}`}
          className="w-full h-full"
          style={{ minWidth: 400 }}
        >
          <rect width={floor.widthM * S} height={floor.heightM * S} fill="#0a0a0f" />

          {/* Agents */}
          {frame?.agents.map((agent) => (
            <circle
              key={agent.id}
              cx={agent.x * S}
              cy={agent.y * S}
              r={2}
              fill={agent.evacuated ? '#22c55e' : '#3b82f6'}
              opacity={agent.evacuated ? 0.4 : 0.8}
            >
              {!agent.evacuated && (
                <animate
                  attributeName="opacity"
                  values="0.8;0.4;0.8"
                  dur="1s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </svg>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Frame {currentFrame}/{evacResult?.frames.length ?? 0}</span>
        </div>
        {evacResult && (
          <>
            <div className="flex items-center gap-1.5">
              <span>Temps total:</span>
              <span className="font-semibold text-white">
                {Math.floor(totalTime / 60)}m {totalTime % 60}s
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Goulots:</span>
              <span className="font-semibold text-amber-400">{evacResult.bottlenecks.length}</span>
            </div>
            <div className="flex-1" />
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
              conformNF
                ? 'bg-green-900/30 text-green-400 border border-green-700/30'
                : 'bg-red-900/30 text-red-400 border border-red-700/30'
            }`}>
              {conformNF ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              NF S 61-938 {conformNF ? 'Conforme' : 'Non conforme'}
            </div>
          </>
        )}
      </div>

      {/* Bottlenecks & Recommendations */}
      {evacResult && (
        <div className="px-4 py-3 border-t border-gray-800 max-h-40 overflow-y-auto">
          {evacResult.bottlenecks.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-amber-500 font-mono mb-1">Goulots detectes</div>
              {evacResult.bottlenecks.map((bn) => (
                <div key={bn.id} className="text-xs text-gray-400 flex items-center gap-2 py-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{bn.entityType} — File {bn.queueLength} pers, attente {bn.waitTimeSec}s</span>
                </div>
              ))}
            </div>
          )}
          {evacResult.recommendations.length > 0 && (
            <div>
              <div className="text-[10px] text-blue-400 font-mono mb-1">Recommandations</div>
              {evacResult.recommendations.map((rec, i) => (
                <div key={i} className="text-xs text-gray-300 py-0.5">
                  {i + 1}. {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
