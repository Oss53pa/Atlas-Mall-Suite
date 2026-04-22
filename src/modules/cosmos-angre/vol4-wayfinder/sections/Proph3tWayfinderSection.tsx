// ═══ VOL.4 · Section PROPH3T Analytics ═══
//
// Produit les rapports PROPH3T :
//   • Rapport qualité du graphe
//   • Rapport d'usage hebdo (top paires, taux recalculs, zones jamais traversées)
//   • Alertes signalétique (arêtes à revoir)

import { useMemo } from 'react'
import { BarChart2, AlertTriangle, TrendingUp, MapPin, RefreshCw } from 'lucide-react'
import { useVol4Store } from '../store/vol4Store'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { buildWayfinderGraph } from '../engines/wayfinderBridge'
import { analyzeGraphQuality, buildUsageReport } from '../engines/proph3tWayfinder'

export default function Proph3tWayfinderSection() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const { routeHistory, catalogItems } = useVol4Store()

  const graph = useMemo(() => {
    if (!parsedPlan) return null
    return buildWayfinderGraph({ parsedPlan }).graph
  }, [parsedPlan])

  const qualityReport = useMemo(() => {
    if (!graph) return null
    return analyzeGraphQuality(graph)
  }, [graph])

  const usageReport = useMemo(() => {
    if (!graph) return null
    const allIds = catalogItems.map(i => i.id)
    return buildUsageReport(routeHistory, allIds)
  }, [graph, routeHistory, catalogItems])

  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <BarChart2 size={48} className="text-slate-600 mb-4" />
        <h3 className="text-slate-200 font-semibold mb-1">Aucun plan importé</h3>
        <p className="text-slate-500 text-sm max-w-md">
          Importez un plan pour activer l'analyse PROPH3T du graphe de navigation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6 gap-6">
      <div>
        <h2 className="text-white text-xl font-semibold flex items-center gap-2">
          <BarChart2 size={20} className="text-purple-400" />
          Analyse PROPH3T · Wayfinder
        </h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Rapports automatisés de qualité du graphe et d'usage réel. Recalibration hebdo.
        </p>
      </div>

      {/* Qualité du graphe */}
      {qualityReport && (
        <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              <MapPin size={14} className="text-emerald-400" />
              Qualité du graphe
            </h3>
            <span className="text-[10px] text-slate-500">Généré {new Date(qualityReport.generatedAt).toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Nœuds" value={qualityReport.totalNodes.toString()} color="#38bdf8" />
            <Stat label="Arêtes" value={qualityReport.totalEdges.toString()} color="#34d399" />
            <Stat label="Longueur totale" value={`${Math.round(qualityReport.totalLengthM)} m`} color="#fbbf24" />
            <Stat label="Composantes" value={qualityReport.disconnectedComponents.toString()}
              color={qualityReport.disconnectedComponents === 1 ? '#34d399' : '#f87171'} />
          </div>

          {qualityReport.orphanNodeIds.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-300 mb-2 flex items-start gap-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <div>
                <strong>{qualityReport.orphanNodeIds.length} nœud{qualityReport.orphanNodeIds.length > 1 ? 's' : ''} orphelin{qualityReport.orphanNodeIds.length > 1 ? 's' : ''}</strong>
                {' '}· non reliés au graphe, vérifier la topologie des couloirs
              </div>
            </div>
          )}

          {qualityReport.longEdgeIds.length > 0 && (
            <div className="rounded-lg bg-slate-950/30 border border-white/[0.04] px-3 py-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 mb-1.5">
                <strong className="text-slate-300">Arêtes trop longues (&gt; 20 m)</strong>
                <span className="text-slate-600">— ajouter un nœud intermédiaire</span>
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {qualityReport.longEdgeIds.slice(0, 10).map(e => (
                  <div key={e.id} className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-mono">{e.id}</span>
                    <span className="text-amber-400">{e.lengthM.toFixed(1)} m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rapport d'usage */}
      {usageReport && (
        <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-5">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-sky-400" />
            Usage réel
          </h3>

          {usageReport.totalRoutes === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4">
              Aucun itinéraire calculé encore — les données d'usage apparaîtront ici dès les premiers trajets.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Stat label="Itinéraires" value={usageReport.totalRoutes.toString()} color="#38bdf8" />
                <Stat label="Distance moy." value={`${Math.round(usageReport.avgDistanceM)} m`} color="#c084fc" />
                <Stat label="Durée moy." value={`${Math.round(usageReport.avgDurationS / 60)} min`} color="#fbbf24" />
                <Stat label="Taux recalcul"
                  value={`${(usageReport.recalculationRate * 100).toFixed(0)} %`}
                  color={usageReport.recalculationRate > 0.2 ? '#f87171' : '#34d399'} />
              </div>

              {/* Top destinations */}
              {usageReport.topDestinations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">Top destinations</h4>
                  <div className="space-y-1">
                    {usageReport.topDestinations.slice(0, 5).map((d, i) => (
                      <div key={d.refId} className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-600 w-4">{i + 1}.</span>
                        <span className="flex-1 text-slate-300 truncate">{
                          catalogItems.find(c => c.id === d.refId)?.label ?? d.refId
                        }</span>
                        <span className="text-sky-400">{d.count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertes signalétique */}
              {usageReport.signageAlerts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[11px] text-red-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Alertes signalétique
                  </h4>
                  <div className="space-y-1.5">
                    {usageReport.signageAlerts.map((a, i) => (
                      <div key={i} className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-200">
                        {a.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zones jamais traversées */}
              {usageReport.untouchedNodeIds.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-950/30 border border-white/[0.04] px-3 py-2 text-[11px] text-slate-400">
                  <strong className="text-slate-300">{usageReport.untouchedNodeIds.length}</strong> destination{usageReport.untouchedNodeIds.length > 1 ? 's' : ''}
                  {' '}jamais recherchée{usageReport.untouchedNodeIds.length > 1 ? 's' : ''}
                  {' '}· opportunité marketing / signalétique
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-4 py-3 text-[11px] text-purple-200 flex items-start gap-2">
        <RefreshCw size={14} className="shrink-0 mt-0.5" />
        <div>
          <strong>Recalibration hebdomadaire automatique.</strong> PROPH3T ajuste les poids du graphe
          chaque semaine à partir des données ABM (Vol.3) et du footfall réel (Vol.2).
          Les anomalies CUSUM sont détectées en temps réel.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-950/40 p-3 text-center">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}
