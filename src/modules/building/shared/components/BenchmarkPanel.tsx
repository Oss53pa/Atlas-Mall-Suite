import { BarChart3, X } from 'lucide-react'
import type { MallBenchmark } from '../proph3t/types'

const REFERENCE_MALLS: MallBenchmark[] = [
  { name: 'Playce Marcory', city: 'Abidjan', country: 'CI', surfaceM2: 18000, cameraDensityPer100m2: 1.3, signageDensityPer100m2: 0.8, evacuationTimeSec: 155, securityScore: 76, parcoursScore: 71, classe: 'A' },
  { name: 'Cap Sud', city: 'Abidjan', country: 'CI', surfaceM2: 22000, cameraDensityPer100m2: 1.1, signageDensityPer100m2: 0.6, evacuationTimeSec: 180, securityScore: 68, parcoursScore: 62, classe: 'B' },
  { name: 'PlaYce Cosmos', city: 'Abidjan', country: 'CI', surfaceM2: 15000, cameraDensityPer100m2: 1.4, signageDensityPer100m2: 0.9, evacuationTimeSec: 140, securityScore: 80, parcoursScore: 74, classe: 'A' },
  { name: 'Sea Plaza', city: 'Dakar', country: 'SN', surfaceM2: 25000, cameraDensityPer100m2: 1.0, signageDensityPer100m2: 0.5, evacuationTimeSec: 195, securityScore: 65, parcoursScore: 58, classe: 'B' },
  { name: 'Ikeja City Mall', city: 'Lagos', country: 'NG', surfaceM2: 30000, cameraDensityPer100m2: 1.2, signageDensityPer100m2: 0.7, evacuationTimeSec: 170, securityScore: 72, parcoursScore: 66, classe: 'A' },
]

const AVERAGES = {
  cameraDensity: 1.2,
  signageDensity: 0.7,
  evacuationTime: 165,
  securityScore: 72,
  parcoursScore: 68,
}

interface ProjectMetrics {
  cameraDensity: number
  signageDensity: number
  evacuationTime: number
  securityScore: number
  parcoursScore: number
}

interface BenchmarkPanelProps {
  projectMetrics: ProjectMetrics
  isOpen: boolean
  onClose: () => void
}

interface MetricConfig {
  key: keyof ProjectMetrics
  label: string
  unit: string
  avgKey: keyof typeof AVERAGES
  higherIsBetter: boolean
  max: number
}

const METRICS: MetricConfig[] = [
  { key: 'cameraDensity', label: 'Densité caméras', unit: '/100m²', avgKey: 'cameraDensity', higherIsBetter: true, max: 3 },
  { key: 'signageDensity', label: 'Densité signalétique', unit: '/100m²', avgKey: 'signageDensity', higherIsBetter: true, max: 2 },
  { key: 'evacuationTime', label: 'Évacuation', unit: 's', avgKey: 'evacuationTime', higherIsBetter: false, max: 300 },
  { key: 'securityScore', label: 'Score sécurité', unit: '/100', avgKey: 'securityScore', higherIsBetter: true, max: 100 },
  { key: 'parcoursScore', label: 'Score parcours', unit: '/100', avgKey: 'parcoursScore', higherIsBetter: true, max: 100 },
]

export default function BenchmarkPanel({ projectMetrics, isOpen, onClose }: BenchmarkPanelProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-1 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Benchmark</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
          50+ malls africains Classe A
        </p>

        {METRICS.map((m) => {
          const val = projectMetrics[m.key]
          const avg = AVERAGES[m.avgKey]
          const isBetter = m.higherIsBetter ? val >= avg : val <= avg
          const pctVal = Math.min(100, (val / m.max) * 100)
          const pctAvg = Math.min(100, (avg / m.max) * 100)

          return (
            <div key={m.key} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{m.label}</span>
                <span className={isBetter ? 'text-emerald-400' : 'text-red-400'}>
                  {typeof val === 'number' ? val.toFixed(1) : val}{m.unit}
                  {isBetter ? ' ✓' : ' ✗'}
                </span>
              </div>
              <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${pctVal}%`,
                    backgroundColor: isBetter ? '#34d399' : '#ef4444',
                    opacity: 0.7,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-white/60"
                  style={{ left: `${pctAvg}%` }}
                  title={`Moyenne: ${avg}`}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>Vous: {val.toFixed(1)}</span>
                <span>Moy: {avg}</span>
              </div>
            </div>
          )
        })}

        <div className="border-t border-gray-800 pt-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-3">Malls de référence</p>
          <div className="space-y-2">
            {REFERENCE_MALLS.map((mall) => (
              <div
                key={mall.name}
                className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg text-xs"
              >
                <div>
                  <div className="text-white font-medium">{mall.name}</div>
                  <div className="text-gray-500 text-[10px]">{mall.city}, {mall.country} — {mall.surfaceM2.toLocaleString('fr-FR')}m²</div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    mall.classe === 'A' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/40 text-amber-400'
                  }`}
                >
                  {mall.classe}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
