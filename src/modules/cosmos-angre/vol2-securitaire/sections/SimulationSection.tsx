import { useState, useCallback } from 'react'
import { Zap, Target, Flame, Users, AlertTriangle, Shield } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'
import { useSimulation } from '../../shared/hooks/useSimulation'
import SimulationPlayer from '../../shared/components/SimulationPlayer'

const SCENARIOS = [
  { id: 'vol_etalage', name: 'Vol à l\'étalage', icon: Target, color: '#f59e0b', desc: 'Simulation de vols dans les zones commerce' },
  { id: 'intrusion_nocturne', name: 'Intrusion nocturne', icon: Shield, color: '#ef4444', desc: 'Tentatives d\'intrusion hors horaires' },
  { id: 'incendie', name: 'Incendie', icon: Flame, color: '#dc2626', desc: 'Départ de feu avec évacuation' },
  { id: 'mouvement_foule', name: 'Mouvement de foule', icon: Users, color: '#8b5cf6', desc: 'Densité critique aux heures de pointe' },
  { id: 'pickpocket', name: 'Pickpocket', icon: AlertTriangle, color: '#f97316', desc: 'Analyse de vulnérabilité aux zones denses' },
] as const

export default function SimulationSection() {
  const cameras = useVol2Store((s) => s.cameras)
  const zones = useVol2Store((s) => s.zones)

  const { isRunning, progress, monteCarloResult, runMonteCarlo, cancel } = useSimulation()

  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [simTime, setSimTime] = useState(0)
  const [simSpeed, setSimSpeed] = useState(1)
  const [simPlaying, setSimPlaying] = useState(false)

  const handleLaunch = useCallback(async (scenarioId: string) => {
    setActiveScenario(scenarioId)
    await runMonteCarlo(scenarioId, cameras, zones)
  }, [cameras, zones, runMonteCarlo])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Simulation Monte Carlo
        </h2>
        {isRunning && (
          <div className="flex items-center gap-3">
            <div className="h-2 w-32 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-400">{progress}%</span>
            <button onClick={cancel} className="text-xs text-red-400 hover:text-red-300">Annuler</button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">1 000 simulations par scénario — analyse probabiliste de la résilience du dispositif</p>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SCENARIOS.map((sc) => (
          <div
            key={sc.id}
            className={`bg-gray-800/60 border rounded-xl p-4 transition-colors ${
              activeScenario === sc.id ? 'border-amber-500/50' : 'border-gray-700/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <sc.icon className="w-4 h-4" style={{ color: sc.color }} />
              <span className="text-sm font-medium text-white">{sc.name}</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-3">{sc.desc}</p>
            <button
              onClick={() => handleLaunch(sc.id)}
              disabled={isRunning}
              className="w-full py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
            >
              {isRunning && activeScenario === sc.id ? 'En cours...' : 'Lancer'}
            </button>
          </div>
        ))}
      </div>

      {/* Results */}
      {monteCarloResult && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Résultats — {SCENARIOS.find((s) => s.id === monteCarloResult.scenario)?.name}</h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${monteCarloResult.resilienceScore >= 80 ? 'text-emerald-400' : monteCarloResult.resilienceScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {monteCarloResult.resilienceScore}%
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Score résilience</div>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{monteCarloResult.avgDetectionTimeSec}s</div>
              <div className="text-[10px] text-gray-500 mt-1">Temps détection moyen</div>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{monteCarloResult.runs}</div>
              <div className="text-[10px] text-gray-500 mt-1">Simulations</div>
            </div>
          </div>

          {/* Failure zones */}
          {monteCarloResult.failureZones.length > 0 && (
            <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-red-400 mb-2">Zones de vulnérabilité</h4>
              <div className="space-y-1.5">
                {monteCarloResult.failureZones.slice(0, 5).map((fz) => {
                  const zone = zones.find((z) => z.id === fz.zoneId)
                  return (
                    <div key={fz.zoneId} className="flex items-center justify-between">
                      <span className="text-xs text-red-300/80">{zone?.label ?? fz.zoneId}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${fz.failureRate * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-red-400 font-mono w-10 text-right">
                          {Math.round(fz.failureRate * 100)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Heatmap grid */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-white mb-2">Heatmap échecs détection</h4>
            <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(20, 1fr)` }}>
              {monteCarloResult.heatmapData.flat().map((val, i) => {
                const maxVal = Math.max(1, ...monteCarloResult.heatmapData.flat())
                const intensity = val / maxVal
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: intensity > 0 ? `rgba(239, 68, 68, ${0.1 + intensity * 0.8})` : 'rgba(255,255,255,0.03)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player */}
      {monteCarloResult && (
        <SimulationPlayer
          isPlaying={simPlaying}
          onPlay={() => setSimPlaying(true)}
          onPause={() => setSimPlaying(false)}
          onStop={() => { setSimPlaying(false); setSimTime(0) }}
          currentTime={simTime}
          totalTime={monteCarloResult.runs / 10}
          speed={simSpeed}
          onSpeedChange={setSimSpeed}
          onSeek={setSimTime}
          label="Monte Carlo"
        />
      )}
    </div>
  )
}
