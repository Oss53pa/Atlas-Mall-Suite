import { useMemo } from 'react'
import { Signpost, Lightbulb, AlertTriangle, Zap } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import SignaleticsCalculator from '../../shared/components/SignaleticsCalculator'

export default function SignaleticsSection() {
  const signageItems = useVol3Store((s) => s.signageItems)
  const zones = useVol3Store((s) => s.zones)

  const stats = useMemo(() => {
    const luminous = signageItems.filter((s) => s.isLuminous).length
    const baes = signageItems.filter((s) => s.requiresBAES).length
    const capex = signageItems.reduce((s, i) => s + i.capexFcfa, 0)
    const byType: Record<string, number> = {}
    for (const s of signageItems) {
      byType[s.type] = (byType[s.type] ?? 0) + 1
    }
    return { luminous, baes, capex, byType, total: signageItems.length }
  }, [signageItems])

  const gaps = useMemo(() => {
    const result: { zone: string; recommendation: string }[] = []
    for (const zone of zones) {
      const zoneSignage = signageItems.filter(
        (s) => s.floorId === zone.floorId &&
          s.x >= zone.x && s.x <= zone.x + zone.w &&
          s.y >= zone.y && s.y <= zone.y + zone.h,
      )
      if (zoneSignage.length === 0 && zone.type !== 'technique' && zone.type !== 'backoffice') {
        result.push({
          zone: zone.label,
          recommendation: `Aucune signalétique dans "${zone.label}" — panneau directionnel recommandé.`,
        })
      }
      if ((zone.lux ?? 300) < 200 && !zoneSignage.some((s) => s.isLuminous)) {
        result.push({
          zone: zone.label,
          recommendation: `"${zone.label}" : luminosité < 200 lux — panneau lumineux requis (NF EN 1838).`,
        })
      }
    }
    return result
  }, [zones, signageItems])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Signpost className="w-5 h-5 text-emerald-400" />
          Signalétique
        </h2>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Auto-placement Proph3t
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-[10px] text-gray-500">Éléments</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.luminous}</div>
          <div className="text-[10px] text-gray-500">Lumineux</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.baes}</div>
          <div className="text-[10px] text-gray-500">BAES</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{stats.capex.toLocaleString('fr-FR')}</div>
          <div className="text-[10px] text-gray-500">CAPEX FCFA</div>
        </div>
      </div>

      {/* By type */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Par type</h3>
        <div className="space-y-1.5">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{type.replace(/_/g, ' ')}</span>
              <span className="text-white font-mono">{count}</span>
            </div>
          ))}
          {Object.keys(stats.byType).length === 0 && (
            <p className="text-xs text-gray-600">Aucun élément signalétique</p>
          )}
        </div>
      </div>

      {/* Gaps / visual breaks */}
      {gaps.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Ruptures de continuité visuelle ({gaps.length})
          </h3>
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li key={i} className="text-xs text-amber-300/80">{g.recommendation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Inventaire</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-center py-2 px-2">Hauteur</th>
                <th className="text-center py-2 px-2">Texte</th>
                <th className="text-center py-2 px-2">Lecture</th>
                <th className="text-center py-2 px-2">Lum.</th>
                <th className="text-left py-2 px-2">Norme</th>
                <th className="text-right py-2 px-2">FCFA</th>
              </tr>
            </thead>
            <tbody>
              {signageItems.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/40">
                  <td className="py-2 px-2 text-white">{s.type.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-2 text-center text-gray-400">{s.poseHeightM}m</td>
                  <td className="py-2 px-2 text-center text-gray-400">{s.textHeightMm}mm</td>
                  <td className="py-2 px-2 text-center text-gray-400">{s.maxReadingDistanceM}m</td>
                  <td className="py-2 px-2 text-center">
                    {s.isLuminous ? <Lightbulb className="w-3 h-3 text-amber-400 mx-auto" /> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-gray-500">{s.normRef}</td>
                  <td className="py-2 px-2 text-right text-cyan-400 font-mono">{s.capexFcfa.toLocaleString('fr-FR')}</td>
                </tr>
              ))}
              {signageItems.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-600">Aucun élément</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculator */}
      <SignaleticsCalculator />
    </div>
  )
}
