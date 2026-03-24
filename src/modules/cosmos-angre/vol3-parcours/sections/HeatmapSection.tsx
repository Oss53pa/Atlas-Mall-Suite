import React, { useState, useMemo } from 'react'
import { Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'

const SCENARIOS = [
  { id: 'journee_normale', label: 'Journée normale', multiplier: 1.0 },
  { id: 'tabaski', label: 'Tabaski', multiplier: 1.8 },
  { id: 'noel', label: 'Noël', multiplier: 2.2 },
  { id: 'rentree', label: 'Rentrée scolaire', multiplier: 1.5 },
  { id: 'evenement', label: 'Événement', multiplier: 2.5 },
] as const

function zoneHeatColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#eab308'
  if (score >= 20) return '#22c55e'
  return '#3b82f6'
}

export default function HeatmapSection() {
  const zones = useVol3Store((s) => s.zones)
  const floors = useVol3Store((s) => s.floors)
  const activeFloorId = useVol3Store((s) => s.activeFloorId)
  const pois = useVol3Store((s) => s.pois)

  const [activeScenario, setActiveScenario] = useState('journee_normale')

  const scenario = SCENARIOS.find((s) => s.id === activeScenario) ?? SCENARIOS[0]

  const heatData = useMemo(() => {
    const floorZones = zones.filter((z) => z.floorId === activeFloorId)
    return floorZones.map((z) => {
      const baseScore: Record<string, number> = {
        commerce: 65,
        restauration: 75,
        circulation: 50,
        parking: 30,
        loisirs: 70,
        services: 45,
        sortie_secours: 15,
        technique: 5,
        backoffice: 10,
        financier: 20,
        hotel: 40,
        bureaux: 25,
        exterieur: 35,
      }
      const raw = (baseScore[z.type] ?? 40) * scenario.multiplier
      const score = Math.min(100, Math.round(raw + (Math.random() - 0.5) * 15))
      const poiCount = pois.filter(
        (p) => p.floorId === z.floorId && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h,
      ).length
      const dwellMin = Math.round(score * 0.3 + poiCount * 2 + Math.random() * 5)
      return { zone: z, score, dwellMin }
    }).sort((a, b) => b.score - a.score)
  }, [zones, activeFloorId, pois, scenario])

  const activeFloor = floors.find((f) => f.id === activeFloorId)
  const hottest = heatData.slice(0, 3)
  const coldest = [...heatData].sort((a, b) => a.score - b.score).slice(0, 3)
  const avgDwell = heatData.length > 0 ? Math.round(heatData.reduce((s, d) => s + d.dwellMin, 0) / heatData.length) : 0

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-400" />
        Heatmap Fréquentation
      </h2>

      {/* Scenario tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setActiveScenario(sc.id)}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeScenario === sc.id
                ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Scénario : {scenario.label} — multiplicateur ×{scenario.multiplier} — Étage {activeFloor?.level}
      </p>

      {/* Visual heatmap */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-4" style={{ minHeight: 300 }}>
        <svg viewBox="0 0 400 280" className="w-full h-auto">
          {heatData.map((d) => (
            <g key={d.zone.id}>
              <rect
                x={d.zone.x * 400}
                y={d.zone.y * 280}
                width={d.zone.w * 400}
                height={d.zone.h * 280}
                fill={zoneHeatColor(d.score)}
                fillOpacity={0.15 + (d.score / 100) * 0.5}
                stroke={zoneHeatColor(d.score)}
                strokeOpacity={0.4}
                strokeWidth={1}
                rx={3}
              />
              <text
                x={d.zone.x * 400 + (d.zone.w * 400) / 2}
                y={d.zone.y * 280 + (d.zone.h * 280) / 2 - 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={9}
                fontFamily="system-ui"
              >
                {d.zone.label}
              </text>
              <text
                x={d.zone.x * 400 + (d.zone.w * 400) / 2}
                y={d.zone.y * 280 + (d.zone.h * 280) / 2 + 10}
                textAnchor="middle"
                fill={zoneHeatColor(d.score)}
                fontSize={12}
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {d.score}%
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{avgDwell} min</div>
          <div className="text-[10px] text-gray-500">Dwell time moyen</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{heatData.length}</div>
          <div className="text-[10px] text-gray-500">Zones analysées</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">×{scenario.multiplier}</div>
          <div className="text-[10px] text-gray-500">Multiplicateur</div>
        </div>
      </div>

      {/* Hot / Cold zones */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Zones chaudes
          </h3>
          {hottest.map((d) => (
            <div key={d.zone.id} className="flex justify-between text-xs py-1">
              <span className="text-red-300/80">{d.zone.label}</span>
              <span className="text-red-400 font-mono">{d.score}% — {d.dwellMin}min</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4" />
            Zones froides
          </h3>
          {coldest.map((d) => (
            <div key={d.zone.id} className="flex justify-between text-xs py-1">
              <span className="text-blue-300/80">{d.zone.label}</span>
              <span className="text-blue-400 font-mono">{d.score}% — {d.dwellMin}min</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
