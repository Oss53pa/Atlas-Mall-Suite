import { Star, AlertTriangle, Lightbulb, Crown, Signpost, Zap } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import ScoreGauge from '../../shared/components/ScoreGauge'

export default function ParcoursSection() {
  const moments = useVol3Store((s) => s.moments)
  const pois = useVol3Store((s) => s.pois)
  const signageItems = useVol3Store((s) => s.signageItems)

  const totalPois = pois.length
  const totalSignage = signageItems.length
  const addressed = moments.filter((m) => m.signageItems.length > 0).length
  const experienceScore = Math.min(95, 45 + totalPois * 3 + moments.length * 4)

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Les 7 Moments Clés</h2>
          <p className="text-xs text-gray-500 mt-0.5">Parcours visiteur Cosmos Angré</p>
        </div>
        {moments.length === 0 && (
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors">
            <Zap className="w-3.5 h-3.5" />
            Générer avec Proph3t
          </button>
        )}
      </div>

      {/* Score + Stats */}
      <div className="flex items-center gap-6">
        <ScoreGauge value={experienceScore} max={100} size={70} />
        <div>
          <div className="text-xl font-bold text-white">
            {experienceScore}<span className="text-sm text-gray-500">/100</span>
          </div>
          <div className="text-xs text-gray-500">Score Expérience</div>
          <div className="text-[10px] text-emerald-400 mt-1">
            {addressed}/{moments.length} moments adressés
          </div>
        </div>
        <div className="flex-1" />
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">{totalPois}</div>
            <div className="text-[9px] text-gray-500">POI</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-amber-400">{totalSignage}</div>
            <div className="text-[9px] text-gray-500">Signal.</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-400">{moments.length}</div>
            <div className="text-[9px] text-gray-500">Moments</div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {moments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Signpost className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-sm text-gray-500">Aucun moment clé généré</p>
          <p className="text-xs text-gray-600 mt-1">Lancez Proph3t pour analyser le parcours visiteur</p>
        </div>
      )}

      {/* Moment Cards */}
      <div className="space-y-3">
        {[...moments].sort((a, b) => a.number - b.number).map((m) => {
          const colors = ['#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ec4899', '#a77d4c']
          const color = colors[(m.number - 1) % colors.length]
          return (
            <div
              key={m.id}
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)`, borderBottom: `1px solid ${color}30` }}
              >
                <span
                  className="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ backgroundColor: color }}
                >
                  M{m.number}
                </span>
                <span className="text-sm font-semibold text-white flex-1">{m.name}</span>
                {m.signageItems.length > 0 && (
                  <span className="text-[9px] text-amber-400 flex items-center gap-1">
                    <Signpost className="w-3 h-3" />
                    {m.signageItems.length}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 text-emerald-500 flex-none mt-0.5" />
                  <div>
                    <span className="text-gray-500">KPI : </span>
                    <span className="text-gray-300">{m.kpi}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-none mt-0.5" />
                  <div>
                    <span className="text-gray-500">Friction : </span>
                    <span className="text-amber-300/80">{m.friction}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-400 flex-none mt-0.5" />
                  <div>
                    <span className="text-gray-500">Recommandation : </span>
                    <span className="text-emerald-300/80">{m.recommendation}</span>
                  </div>
                </div>
                {m.cosmosClubAction && (
                  <div className="flex items-start gap-2 text-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-400 flex-none mt-0.5" />
                    <div>
                      <span className="text-gray-500">Cosmos Club : </span>
                      <span className="text-amber-300/80">{m.cosmosClubAction}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
