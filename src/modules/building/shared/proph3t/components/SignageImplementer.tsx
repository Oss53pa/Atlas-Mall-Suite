// ═══ SIGNAGE IMPLEMENTER — Bouton "Implémenter" + rapport détaillé ═══
//
// Lit les propositions signalétique pushées par Proph3tVolumePanel
// (analyzeParcours), permet de les matérialiser sur le plan en un clic
// (signagePlacementStore persisté par projet), et affiche un rapport
// détaillé avec coverage, breakdown par type, table position/cibles/raison.

import { useState, useMemo } from 'react'
import { Signpost, CheckCircle2, FileText, X, Trash2, Sparkles } from 'lucide-react'
import { useSignageProposalsStore } from '../../stores/signageProposalsStore'
import { useSignagePlacementStore } from '../../stores/signagePlacementStore'
import { useActiveProjectId } from '../../../../../hooks/useActiveProject'

const KIND_META = {
  'direction':     { label: 'Directionnel',   color: '#0891b2', icon: '➜', desc: 'Indique la direction d\'un POI proche' },
  'you-are-here':  { label: 'Vous êtes ici',  color: '#7c3aed', icon: '◉', desc: 'Plan d\'orientation au nœud central' },
  'zone-entrance': { label: 'Entrée de zone', color: '#ea580c', icon: '★', desc: 'Marque l\'accès à un commerce ancre' },
} as const

interface Props {
  /** Position du panneau flottant. */
  position?: 'bottom-left' | 'bottom-right'
}

export function SignageImplementer({ position = 'bottom-left' }: Props) {
  const projectId = useActiveProjectId()
  const proposals = useSignageProposalsStore(s => s.proposals)
  const coveragePct = useSignageProposalsStore(s => s.coveragePct)
  const circulationSqm = useSignageProposalsStore(s => s.circulationSqm)
  const poiLabels = useSignageProposalsStore(s => s.poiLabels)
  const generatedAt = useSignageProposalsStore(s => s.generatedAt)

  const allPlaced = useSignagePlacementStore(s => s.signs)
  const placedForProject = useMemo(
    () => allPlaced.filter(s => s.projectId === projectId),
    [allPlaced, projectId],
  )
  const addMany = useSignagePlacementStore(s => s.addMany)
  const clearForProject = useSignagePlacementStore(s => s.clearForProject)

  const [reportOpen, setReportOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (proposals.length === 0 && placedForProject.length === 0) return null

  const handleImplement = () => {
    if (proposals.length === 0) return
    // Remplace les signs auto précédents pour ce projet, garde les manuels
    const manuals = placedForProject.filter(s => s.source === 'manual')
    clearForProject(projectId)
    if (manuals.length > 0) {
      addMany(projectId, manuals.map(m => ({
        x: m.x, y: m.y, kind: m.kind, targets: m.targets,
        label: m.label, reason: m.reason, source: 'manual', floorId: m.floorId,
      })))
    }
    addMany(projectId, proposals.map(p => ({
      x: p.x, y: p.y, kind: p.kind, targets: p.targets,
      label: p.targets.map(id => poiLabels[id]).filter(Boolean).slice(0, 2).join(' / '),
      reason: p.reason,
      source: 'proph3t-auto' as const,
    })))
    setFeedback(`✅ ${proposals.length} panneaux placés sur le plan`)
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleClearAuto = () => {
    if (!confirm('Retirer toute la signalétique auto-placée du plan ?')) return
    const manuals = placedForProject.filter(s => s.source === 'manual')
    clearForProject(projectId)
    if (manuals.length > 0) {
      addMany(projectId, manuals.map(m => ({
        x: m.x, y: m.y, kind: m.kind, targets: m.targets,
        label: m.label, reason: m.reason, source: 'manual', floorId: m.floorId,
      })))
    }
    setFeedback('🗑️ Signalétique auto retirée')
    setTimeout(() => setFeedback(null), 2500)
  }

  const breakdown = {
    direction: proposals.filter(p => p.kind === 'direction').length,
    'you-are-here': proposals.filter(p => p.kind === 'you-are-here').length,
    'zone-entrance': proposals.filter(p => p.kind === 'zone-entrance').length,
  }
  const coveredSqm = (circulationSqm * coveragePct) / 100
  const placedAuto = placedForProject.filter(s => s.source === 'proph3t-auto').length

  const positionClass = position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'

  return (
    <>
      <div className={`fixed ${positionClass} z-30 bg-surface-0/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md`}>
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2">
          <Signpost size={14} className="text-cyan-300" />
          <div className="flex-1">
            <div className="text-[12px] font-bold text-white">Signalétique optimisée</div>
            <div className="text-[9px] text-slate-500">
              {proposals.length} proposés · {placedAuto} placés · couverture {coveragePct.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2 min-w-[280px]">
          <button
            onClick={handleImplement}
            disabled={proposals.length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={14} />
            Implémenter signalétique optimisée
          </button>

          <button
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-surface-1 hover:bg-slate-800 text-slate-200 text-[11px] font-medium border border-white/10"
          >
            <FileText size={12} />
            Rapport détaillé signalétique
          </button>

          {placedAuto > 0 && (
            <button
              onClick={handleClearAuto}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-[10px] text-rose-300 hover:bg-rose-950/30 border border-rose-500/20"
            >
              <Trash2 size={10} />
              Retirer la signalétique auto
            </button>
          )}

          {feedback && (
            <div className="px-2 py-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[10px] text-center">
              {feedback}
            </div>
          )}

          {proposals.length === 0 && placedForProject.length > 0 && (
            <div className="text-[10px] text-slate-500 italic text-center">
              Lance « Suggérer signalétique » dans Proph3t pour de nouvelles propositions
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL RAPPORT DÉTAILLÉ ═══ */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="bg-surface-1 border border-cyan-500/30 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface-1 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="text-cyan-300" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-white">Rapport signalétique optimisée</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Algorithme : <span className="font-mono text-cyan-300">optimizeSignage</span> ·
                    Heuristique géométrique sur nœuds de décision ·
                    {generatedAt && <> Généré : <span className="font-mono">{new Date(generatedAt).toLocaleString('fr-FR')}</span></>}
                  </p>
                </div>
              </div>
              <button onClick={() => setReportOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats top */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Panneaux proposés" value={proposals.length} unit="" color="cyan" />
                <StatCard label="Couverture" value={coveragePct.toFixed(0)} unit="%" color={coveragePct >= 70 ? 'emerald' : 'amber'} />
                <StatCard label="Circulation totale" value={circulationSqm.toFixed(0)} unit="m²" color="slate" />
                <StatCard label="Placés sur le plan" value={placedAuto} unit="" color="violet" />
              </div>

              {/* Breakdown par type */}
              <section>
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">Répartition par type</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(breakdown) as Array<[keyof typeof KIND_META, number]>).map(([kind, count]) => {
                    const meta = KIND_META[kind]
                    return (
                      <div key={kind} className="rounded-lg border border-white/10 bg-surface-0 p-3"
                        style={{ borderLeft: `3px solid ${meta.color}` }}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[11px] font-semibold text-white">{meta.label}</span>
                          <span className="text-2xl font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{meta.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Table détaillée */}
              <section>
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">
                  Détail des panneaux ({proposals.length})
                </h3>
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface-0 border-b border-white/10">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">#</th>
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">Type</th>
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">Position (m)</th>
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">POIs ciblés</th>
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p, i) => {
                        const meta = KIND_META[p.kind] ?? KIND_META['direction']
                        const targetLabels = p.targets.map(id => poiLabels[id] ?? id).slice(0, 3)
                        return (
                          <tr key={p.id} className={i % 2 === 0 ? 'bg-surface-0/30' : ''}>
                            <td className="px-3 py-2 text-slate-500 font-mono">{i + 1}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                                style={{ background: `${meta.color}30`, color: meta.color, border: `1px solid ${meta.color}60` }}>
                                <span>{meta.icon}</span> {meta.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-300 font-mono text-[10px]">
                              ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {targetLabels.length > 0 ? (
                                <span className="text-cyan-200">{targetLabels.join(' · ')}</span>
                              ) : (
                                <span className="text-slate-500 italic">aucun (plan général)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-400 text-[10px]">{p.reason}</td>
                          </tr>
                        )
                      })}
                      {proposals.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500 italic">
                          Aucune proposition — relance « Suggérer » dans le panneau Proph3t
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Méthodologie */}
              <section className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4">
                <h3 className="text-[12px] font-bold text-cyan-200 uppercase tracking-wider mb-2">Méthodologie</h3>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-5">
                  <li><strong>Détection des nœuds</strong> : centroïdes des espaces de circulation + points médians des 2 plus longs côtés (entrées probables).</li>
                  <li><strong>Filtre proximité</strong> : élimine les candidats à moins de 7,5 m l'un de l'autre (rayon visibilité / 2).</li>
                  <li><strong>Score</strong> : nombre de POIs accessibles dans un rayon de 60 m, pondéré par priorité (ancre = 3, secondaire = 1).</li>
                  <li><strong>Type assigné</strong> : <span className="text-orange-300">★ entrée de zone</span> si POI ancre proche · <span className="text-violet-300">◉ vous êtes ici</span> si nœud isolé · <span className="text-cyan-300">➜ direction</span> sinon.</li>
                  <li><strong>Couverture</strong> : grille 2×2 m sur les circulations, % de cellules dans rayon visibilité 15 m d'un panneau placé.</li>
                  <li><strong>Densité cible</strong> : 1 panneau / 100 m² de circulation (norme indicative ERP).</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number | string; unit: string; color: 'cyan' | 'emerald' | 'amber' | 'slate' | 'violet' }) {
  const colorMap = {
    cyan: 'text-cyan-300 border-cyan-500/30 bg-cyan-950/20',
    emerald: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20',
    amber: 'text-amber-300 border-amber-500/30 bg-amber-950/20',
    slate: 'text-slate-300 border-slate-500/30 bg-surface-0',
    violet: 'text-violet-300 border-violet-500/30 bg-violet-950/20',
  }
  return (
    <div className={`rounded-lg border ${colorMap[color]} p-3`}>
      <div className="text-[9px] uppercase text-slate-500 tracking-widest">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}<span className="text-sm text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  )
}
