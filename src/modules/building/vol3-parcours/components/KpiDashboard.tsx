import { BarChart3, Accessibility, MapPin, Signpost, Route } from 'lucide-react'
import type { POI, SignageItem, MomentCle, NavigationGraph } from '../../shared/proph3t/types'
import ScoreGauge from '../../shared/components/ScoreGauge'

interface KpiDashboardProps {
  pois: POI[]
  signageItems: SignageItem[]
  moments: MomentCle[]
  navGraph: NavigationGraph | null
}

export default function KpiDashboard({ pois, signageItems, moments, navGraph }: KpiDashboardProps) {
  const pmrPois = pois.filter((p) => p.pmr)
  const pmrPct = pois.length > 0 ? Math.round((pmrPois.length / pois.length) * 100) : 0
  const addressedMoments = moments.filter((m) => m.signageItems.length > 0).length
  const experienceScore = Math.min(95, 45 + pois.length * 3 + moments.length * 4)

  const poiByType: Record<string, number> = {}
  pois.forEach((p) => { poiByType[p.type] = (poiByType[p.type] || 0) + 1 })

  return (
    <div className="bg-surface-1/50 border border-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-semibold text-gray-200">KPI Dashboard</h3>
      </div>

      {/* Experience Score */}
      <div className="flex items-center gap-4">
        <ScoreGauge value={experienceScore} max={100} size={60} />
        <div>
          <div className="text-lg font-bold text-white">{experienceScore}</div>
          <div className="text-[10px] text-gray-500">Score Experience</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
          <div className="text-sm font-bold text-white">{pois.length}</div>
          <div className="text-[9px] text-gray-500">POI Total</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <Accessibility className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
          <div className="text-sm font-bold text-cyan-400">{pmrPct}%</div>
          <div className="text-[9px] text-gray-500">PMR</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <Signpost className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
          <div className="text-sm font-bold text-white">{signageItems.length}</div>
          <div className="text-[9px] text-gray-500">Signaletique</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <Route className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
          <div className="text-sm font-bold text-white">{addressedMoments}/7</div>
          <div className="text-[9px] text-gray-500">Moments</div>
        </div>
      </div>

      {/* POI by Type */}
      <div>
        <div className="text-[10px] text-gray-500 font-mono mb-1.5">POI PAR TYPE</div>
        <div className="space-y-1">
          {Object.entries(poiByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400 flex-1">{type}</span>
              <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / pois.length) * 100}%` }} />
              </div>
              <span className="text-gray-300 w-4 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nav Graph */}
      {navGraph && (
        <div className="text-[10px] text-gray-500">
          Graphe: {navGraph.nodes.length} noeuds, {navGraph.edges.length} aretes, {navGraph.edges.filter(e => e.pmr).length} PMR
        </div>
      )}
    </div>
  )
}
