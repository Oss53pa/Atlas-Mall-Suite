// ═══ ABM SIMULATION PANEL ═══
// Panneau latéral : lance la simulation ABM Social Force pour les 3 tranches
// horaires (ouverture / mi-journée / fermeture), affiche stats + heatmap.
// La heatmap est rendue en SVG superposé sur le plan (par AbmHeatmapOverlay).

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Activity, Play, Users, Flame, AlertTriangle, Loader2, Clock,
} from 'lucide-react'
import {
  runAbmSimulation,
  TIME_SLOT_META,
  type TimeSlot,
  type AbmResult,
  type AbmObstacle,
} from '../engines/plan-analysis/abmSocialForceEngine'
import type { FlowAnalysisResult } from '../engines/plan-analysis/flowPathEngine'

interface Props {
  flowResult: FlowAnalysisResult
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>
  spacePolygons: Array<[number, number][]>
  /** Résultats ABM déjà calculés (par tranche). */
  abmResults: Partial<Record<TimeSlot, AbmResult>>
  onResultsChange: (results: Partial<Record<TimeSlot, AbmResult>>) => void
  activeSlot: TimeSlot | null
  onActiveSlotChange: (slot: TimeSlot | null) => void
  onClose: () => void
}

export function AbmSimulationPanel({
  flowResult, walls, spacePolygons, abmResults, onResultsChange,
  activeSlot, onActiveSlotChange, onClose,
}: Props) {
  const [running, setRunning] = useState<TimeSlot | null>(null)
  const [nAgents, setNAgents] = useState(200)

  const buildObstacles = (): AbmObstacle[] => {
    const obs: AbmObstacle[] = walls.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))
    for (const poly of spacePolygons) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]; const b = poly[(i + 1) % poly.length]
        obs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
      }
    }
    return obs
  }

  const handleRun = async (slot: TimeSlot) => {
    if (running) return
    setRunning(slot)
    // Laisser le temps au render de refléter le loading
    await new Promise(r => setTimeout(r, 30))
    try {
      const obstacles = buildObstacles()
      const result = runAbmSimulation({
        paths: flowResult.paths,
        obstacles,
        nAgents,
        timeSlot: slot,
        heatmapCellM: 2,
        seed: 42,
      })
      onResultsChange({ ...abmResults, [slot]: result })
      onActiveSlotChange(slot)
       
      console.log(`[ABM] ${slot}: ${result.stats.agentsSimulated} agents, max density ${result.stats.maxDensity.toFixed(2)} pers/m²`, result)
    } catch (err) {
       
      console.error('[ABM] failed:', err)
    } finally {
      setRunning(null)
    }
  }

  const handleRunAll = async () => {
    for (const slot of ['opening', 'midday', 'closing'] as TimeSlot[]) {
      await handleRun(slot)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-end bg-surface-0/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[560px] max-w-[95vw] h-full bg-surface-1 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Simulation ABM — Flux clients</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 py-3 border-b border-white/5 bg-surface-0/40 text-[11px] text-slate-400 leading-relaxed">
          <p className="m-0">
            Simulation <strong>Social Force Model</strong> (Helbing 1995) sur les chemins calculés.
            Agents à 1,2 m/s, rayon d'interaction 2 m, pas de temps 0,1 s. Densité critique 4 pers/m².
          </p>
        </div>

        {/* Paramètres */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Nombre d'agents
            </label>
            <span className="text-lg font-bold text-white tabular-nums">{nAgents}</span>
          </div>
          <input
            type="range"
            min={50} max={1000} step={50}
            value={nAgents}
            onChange={(e) => setNAgents(Number(e.target.value))}
            className="w-full accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>50</span><span>500</span><span>1000</span>
          </div>
        </div>

        {/* Tranches horaires */}
        <div className="p-3 space-y-2">
          {(['opening', 'midday', 'closing'] as TimeSlot[]).map(slot => {
            const meta = TIME_SLOT_META[slot]
            const result = abmResults[slot]
            const isActive = activeSlot === slot
            const isRunning = running === slot
            return (
              <div
                key={slot}
                className={`rounded-lg border transition-all ${
                  isActive
                    ? 'border-rose-500 bg-rose-950/20'
                    : 'border-white/10 bg-surface-0/40'
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-white">{meta.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{meta.hour}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 m-0">{meta.flowBias}</p>
                    </div>
                    <button
                      onClick={() => handleRun(slot)}
                      disabled={!!running}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-semibold ${
                        isRunning
                          ? 'bg-rose-500 text-white'
                          : result
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-rose-600 text-white hover:bg-rose-500'
                      } disabled:opacity-50`}
                    >
                      {isRunning
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Play className="w-3.5 h-3.5" />
                      }
                      {result ? 'Relancer' : 'Simuler'}
                    </button>
                  </div>

                  {result && (
                    <>
                      <div className="grid grid-cols-4 gap-2 text-[10px] mb-2">
                        <StatMini
                          icon={<Users className="w-3 h-3" />}
                          label="Agents"
                          value={result.stats.agentsSimulated}
                          color="text-blue-400"
                        />
                        <StatMini
                          icon={null}
                          label="Arrivés"
                          value={`${result.stats.arrived}/${result.stats.agentsSimulated}`}
                          color="text-emerald-400"
                        />
                        <StatMini
                          icon={<Flame className="w-3 h-3" />}
                          label="Pic densité"
                          value={`${result.stats.maxDensity.toFixed(1)}p/m²`}
                          color={result.stats.maxDensity > 4 ? 'text-red-400' : 'text-amber-400'}
                        />
                        <StatMini
                          icon={null}
                          label="Durée sim."
                          value={`${result.stats.durationS}s`}
                          color="text-slate-300"
                        />
                      </div>
                      <button
                        onClick={() => onActiveSlotChange(isActive ? null : slot)}
                        className={`w-full py-1.5 rounded text-[10px] font-medium ${
                          isActive
                            ? 'bg-rose-700 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isActive ? 'Masquer heatmap' : 'Afficher heatmap'}
                      </button>
                      {result.stats.maxDensity > 4 && (
                        <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded bg-red-950/40 border border-red-900/40 text-[10px] text-red-300">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            Densité critique dépassée ({result.stats.maxDensity.toFixed(1)} pers/m²).
                            Risque de congestion bloquante — envisager élargir le couloir ou décaler un flux.
                          </span>
                        </div>
                      )}
                      {result.stats.congestionSpots.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                            Top 3 spots de congestion
                          </div>
                          <ul className="space-y-0.5 text-[10px]">
                            {result.stats.congestionSpots.slice(0, 3).map((s, i) => (
                              <li key={i} className="flex items-center justify-between text-slate-400">
                                <span>Point ({s.x.toFixed(0)}, {s.y.toFixed(0)})</span>
                                <span className="tabular-nums text-amber-400">
                                  {s.peakDensity.toFixed(2)} p/m²
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Run all */}
        <div className="mt-auto p-3 border-t border-white/10">
          <button
            onClick={handleRunAll}
            disabled={!!running}
            className="w-full py-2 rounded text-[11px] font-semibold bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:opacity-90 disabled:opacity-50"
          >
            {running
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> Simulation {running}…</>
              : 'Simuler les 3 tranches successivement'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function StatMini({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-surface-0/60 rounded px-1.5 py-1">
      <div className="flex items-center gap-1 text-slate-600 text-[8px] uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={`font-bold text-[11px] tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
