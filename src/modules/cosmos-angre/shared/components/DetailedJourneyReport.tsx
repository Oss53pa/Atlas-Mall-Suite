// ═══ DETAILED FLOW & SIGNAGE REPORT ═══
// Rapport écrit TRÈS détaillé : flux d'entrées → sorties + signalétique recommandée.
// Modale plein-écran, styles print-friendly (bouton Imprimer/PDF).
//
// Sections :
//   1. Résumé exécutif (chiffres clés)
//   2. Inventaire des points de flux (entrées / sorties / transits)
//   3. Description détaillée de chaque chemin principal
//   4. Plan de signalétique recommandé (par priorité, avec contenu suggéré)
//   5. Inventaire des espaces (catégories, dimensions, corrections)
//   6. Recommandations stratégiques
//   7. Méthodologie

import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Printer, FileText, TrendingUp, MapPin, AlertTriangle, Lightbulb, Users,
  Navigation, BookOpen, Signpost, ArrowRight,
} from 'lucide-react'
import type {
  FlowAnalysisResult, FlowPath, SignageRecommendation, SignageType,
} from '../engines/plan-analysis/flowPathEngine'
import {
  resolveSpaceCategory,
  resolveSpaceLabel,
} from '../engines/plan-analysis/detailedJourneyEngine'
import {
  CATEGORY_META,
  useSpaceCorrectionsStore,
  type SpaceCategory,
} from '../stores/spaceCorrectionsStore'
import type { EditableSpace } from './SpaceLabelEditor'

interface Props {
  flowResult: FlowAnalysisResult
  spaces: EditableSpace[]
  planWidth: number
  planHeight: number
  projectName?: string
  floorId?: string | null
  onClose: () => void
}

const SIGNAGE_META: Record<SignageType, { color: string; icon: string; label: string }> = {
  welcome:        { color: '#10b981', icon: 'ⓘ', label: 'Accueil + plan' },
  directional:    { color: '#f59e0b', icon: '↗', label: 'Directionnel' },
  'you-are-here': { color: '#6366f1', icon: '◉', label: 'Vous êtes ici' },
  information:    { color: '#8b5cf6', icon: 'i',  label: 'Information' },
  exit:           { color: '#ef4444', icon: '⎋', label: 'Sortie' },
}

const PRIORITY_META = {
  critical: { label: 'Critique', color: 'bg-red-100 border-red-300 text-red-900' },
  high:     { label: 'Élevée',   color: 'bg-amber-100 border-amber-300 text-amber-900' },
  medium:   { label: 'Moyenne',  color: 'bg-blue-100 border-blue-300 text-blue-900' },
  low:      { label: 'Faible',   color: 'bg-slate-100 border-slate-300 text-slate-700' },
}

export function DetailedJourneyReport({
  flowResult, spaces, planWidth, planHeight, projectName = 'Projet', floorId, onClose,
}: Props) {
  // Force re-render sur corrections
  const corrVersion = useSpaceCorrectionsStore(s => s.version)
  const corrStats = useMemo(
    () => useSpaceCorrectionsStore.getState().getStats(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corrVersion],
  )

  const analysis = useMemo(() => {
    const floorSpaces = floorId
      ? spaces.filter(s => !s.floorId || s.floorId === floorId)
      : spaces

    const spaceCat = new Map<string, SpaceCategory>()
    for (const s of floorSpaces) spaceCat.set(s.id, resolveSpaceCategory(s) as SpaceCategory)

    const breakdown: Record<SpaceCategory, { count: number; area: number }> = {} as any
    const allCats: SpaceCategory[] = [
      'mode', 'restauration', 'services', 'loisirs',
      'alimentaire', 'beaute', 'enfants',
      'circulation', 'service-tech', 'other',
    ]
    for (const c of allCats) breakdown[c] = { count: 0, area: 0 }
    for (const s of floorSpaces) {
      const c = spaceCat.get(s.id) ?? 'other'
      breakdown[c].count++
      breakdown[c].area += s.areaSqm
    }

    const signByType: Record<SignageType, SignageRecommendation[]> = {
      welcome: [], directional: [], 'you-are-here': [], information: [], exit: [],
    }
    for (const s of flowResult.signage) signByType[s.type].push(s)

    const signByPriority: Record<'critical' | 'high' | 'medium' | 'low', SignageRecommendation[]> = {
      critical: [], high: [], medium: [], low: [],
    }
    for (const s of flowResult.signage) signByPriority[s.priority].push(s)

    // Longueur totale plan accessible (surface)
    const totalWalkable = floorSpaces
      .filter(s => {
        const c = resolveSpaceCategory(s)
        return c !== 'service-tech'
      })
      .reduce((sum, s) => sum + s.areaSqm, 0)

    return { floorSpaces, spaceCat, breakdown, signByType, signByPriority, totalWalkable }
  }, [flowResult, spaces, floorId, corrVersion])

  const handlePrint = () => window.print()

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/85 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[960px] max-w-[95vw] bg-white text-slate-900 rounded-lg shadow-2xl print:w-full print:max-w-none print:shadow-none print:rounded-none" id="journey-report">
        {/* Top bar (non-print) */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 text-white rounded-t-lg print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Rapport détaillé — Flux & signalétique</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <article className="px-10 py-8 prose prose-slate max-w-none print:px-8 print:py-6">
          {/* ═══ HEADER ═══ */}
          <header className="border-b border-slate-200 pb-5 mb-8">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              PROPH3T · Rapport d'analyse de flux et plan de signalétique
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Analyse flux & signalétique — {projectName}
            </h1>
            <div className="mt-3 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>📅 Généré le {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>🏢 Étage : {floorId ?? 'tous'}</span>
              <span>📐 Plan : {planWidth.toFixed(0)} × {planHeight.toFixed(0)} m</span>
              <span>🚶 {flowResult.paths.length} chemins · {flowResult.signage.length} panneaux recommandés</span>
            </div>
          </header>

          {/* ═══ 1. RÉSUMÉ EXÉCUTIF ═══ */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              1. Résumé exécutif
            </h2>
            <div className="grid grid-cols-5 gap-2 mb-4">
              <KpiCard label="Entrées" value={flowResult.summary.entrancesCount.toString()} color="emerald" />
              <KpiCard label="Sorties" value={flowResult.summary.exitsCount.toString()} color="red" />
              <KpiCard label="Chemins tracés" value={flowResult.summary.pathsCount.toString()} color="blue" />
              <KpiCard label="Distance moy." value={`${flowResult.summary.avgDistanceM.toFixed(0)} m`} color="purple" />
              <KpiCard label="Panneaux" value={`${flowResult.summary.signageCount}`} color="amber" />
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              PROPH3T a tracé <strong>{flowResult.paths.length} chemins principaux</strong> entre
              les <strong>{flowResult.entrances.length} entrée{flowResult.entrances.length > 1 ? 's' : ''}</strong> et
              les <strong>{flowResult.exits.length} sortie{flowResult.exits.length > 1 ? 's' : ''}</strong> détectées sur
              le plan. La distance moyenne à parcourir est de <strong>{flowResult.summary.avgDistanceM.toFixed(0)} mètres</strong>,
              soit environ <strong>{(flowResult.summary.avgDistanceM / (1.3 * 60)).toFixed(1)} minutes</strong> de marche.
              L'analyse des points de décision a mis en évidence <strong>{flowResult.signage.length} emplacements</strong>
              où déployer de la signalétique, dont{' '}
              <strong className="text-red-600">{flowResult.summary.criticalSignageCount} panneaux critiques</strong> à
              positionner en priorité.
            </p>
            {flowResult.summary.unreachablePairs > 0 && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-amber-900 m-0">
                  <strong>{flowResult.summary.unreachablePairs} paire{flowResult.summary.unreachablePairs > 1 ? 's' : ''} entrée/sortie non connectée{flowResult.summary.unreachablePairs > 1 ? 's' : ''}</strong>.
                  Causes probables : zones de circulation mal labellisées, escaliers non identifiés, ou plan incomplet.
                  Corriger la labellisation via le bouton « Corriger labels » puis relancer l'analyse.
                </p>
              </div>
            )}
            {corrStats.total > 0 && (
              <div className="mt-2 text-[11px] text-slate-500 italic">
                Note : {corrStats.total} correction{corrStats.total > 1 ? 's' : ''} manuelle{corrStats.total > 1 ? 's' : ''} appliquée{corrStats.total > 1 ? 's' : ''}
                {' '}({corrStats.recategorized} recatégorisations, {corrStats.relabeled} renommages, {corrStats.excluded} exclusions).
              </div>
            )}
          </section>

          {/* ═══ 2. INVENTAIRE DES POINTS DE FLUX ═══ */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              2. Inventaire des points de flux
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <FlowPointsTable
                title="Entrées"
                icon="▲"
                color="emerald"
                points={flowResult.entrances}
              />
              <FlowPointsTable
                title="Sorties"
                icon="▼"
                color="red"
                points={flowResult.exits}
              />
              <FlowPointsTable
                title="Transits (escalators / ascenseurs)"
                icon="◆"
                color="blue"
                points={flowResult.transits}
              />
            </div>
          </section>

          {/* ═══ 3. CHEMINS PRINCIPAUX ═══ */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Navigation className="w-5 h-5 text-purple-600" />
              3. Chemins principaux tracés
            </h2>
            {flowResult.paths.length === 0 ? (
              <p className="text-sm italic text-slate-500">
                Aucun chemin n'a pu être tracé. Vérifier que le plan contient bien des zones de circulation
                franchissables entre les entrées et sorties détectées.
              </p>
            ) : (
              <div className="space-y-3">
                {flowResult.paths.slice(0, 20).map((p) => (
                  <PathCard key={p.id} path={p} signage={flowResult.signage.filter(s => s.pathIds.includes(p.id))} />
                ))}
                {flowResult.paths.length > 20 && (
                  <p className="text-[11px] italic text-slate-500">
                    + {flowResult.paths.length - 20} chemins additionnels non détaillés ici.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ═══ 4. PLAN DE SIGNALÉTIQUE ═══ */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Signpost className="w-5 h-5 text-amber-600" />
              4. Plan de signalétique recommandé
            </h2>
            <p className="text-sm text-slate-700 mb-4">
              Chaque panneau a été positionné par PROPH3T à un emplacement précis du plan, déterminé par
              l'analyse des flux et des points de décision. Les panneaux <strong>critiques</strong> doivent
              être déployés en priorité, car ils concernent les intersections majeures (≥ 4 chemins bifurquent).
            </p>

            {/* Par priorité */}
            {(['critical', 'high', 'medium', 'low'] as const).map(prio => {
              const list = analysis.signByPriority[prio]
              if (list.length === 0) return null
              const meta = PRIORITY_META[prio]
              return (
                <div key={prio} className="mb-5 break-inside-avoid">
                  <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
                      PRIORITÉ {meta.label.toUpperCase()}
                    </span>
                    <span className="text-slate-500 font-normal text-[11px]">
                      ({list.length} panneau{list.length > 1 ? 'x' : ''})
                    </span>
                  </h3>
                  <table className="w-full text-[12px] border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">#</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Position (m)</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Motif</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Contenu suggéré</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((s, i) => {
                        const smeta = SIGNAGE_META[s.type]
                        return (
                          <tr key={s.id} className="border-t border-slate-200 align-top">
                            <td className="px-2 py-1.5 font-semibold tabular-nums">{i + 1}</td>
                            <td className="px-2 py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                  style={{ backgroundColor: smeta.color }}
                                >
                                  {smeta.icon}
                                </span>
                                {smeta.label}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-slate-500 font-mono text-[10px]">
                              x={s.x.toFixed(1)}<br />y={s.y.toFixed(1)}
                            </td>
                            <td className="px-2 py-1.5 text-[11px]">{s.reason}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600">
                              <ul className="list-disc pl-4 space-y-0.5 m-0">
                                {s.suggestedContent.slice(0, 4).map((c, j) => (
                                  <li key={j}>{c}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}

            {/* Par type (synthèse) */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Répartition par type de panneau</h3>
              <div className="grid grid-cols-5 gap-2 text-[11px]">
                {(Object.keys(SIGNAGE_META) as SignageType[]).map(t => {
                  const meta = SIGNAGE_META[t]
                  const count = analysis.signByType[t].length
                  return (
                    <div key={t} className="bg-white border border-slate-200 rounded p-2 text-center">
                      <div className="mx-auto mb-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: meta.color }}>
                        {meta.icon}
                      </div>
                      <div className="text-[10px] text-slate-600">{meta.label}</div>
                      <div className="text-lg font-bold tabular-nums text-slate-900">{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ═══ 5. INVENTAIRE DES ESPACES ═══ */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-600" />
              5. Inventaire des espaces (plan actuel)
            </h2>
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Catégorie</th>
                  <th className="px-3 py-2 text-right font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-right font-semibold">Surface totale</th>
                  <th className="px-3 py-2 text-right font-semibold">Part du plan</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(analysis.breakdown) as [SpaceCategory, { count: number; area: number }][])
                  .filter(([, b]) => b.count > 0)
                  .sort((a, b) => b[1].area - a[1].area)
                  .map(([cat, b]) => {
                    const meta = CATEGORY_META[cat]
                    const pct = analysis.totalWalkable > 0 ? (b.area / analysis.totalWalkable) * 100 : 0
                    return (
                      <tr key={cat} className="border-t border-slate-200">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: meta.color }} />
                            {meta.icon} {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.area.toFixed(0)} m²</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct.toFixed(1)} %</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </section>

          {/* ═══ 6. RECOMMANDATIONS ═══ */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              6. Recommandations stratégiques
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {generateRecommendations(flowResult).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ═══ 7. MÉTHODOLOGIE ═══ */}
          <section className="mb-4 break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-slate-600" />
              7. Méthodologie
            </h2>
            <div className="text-[12px] text-slate-600 leading-relaxed space-y-2">
              <p className="m-0">
                <strong>Détection des entrées / sorties / transits</strong> : lecture des labels DXF et
                classification par expressions régulières (mot-clés : entrée, sortie, exit, issue, escalator,
                ascenseur, lift). Les corrections manuelles utilisateur sont prioritaires. À défaut, fallback
                heuristique sur les spaces de circulation aux 4 bords du plan.
              </p>
              <p className="m-0">
                <strong>Calcul des chemins</strong> : une grille de 2 m est construite à partir des polygones
                franchissables (tous les espaces hors technique/WC). Pour chaque paire (entrée, sortie) d'un
                même étage, un algorithme <strong>A*</strong> (heuristique euclidienne, 8 voisins) trouve le
                chemin le plus court. La vitesse retenue est 1,3 m/s (marche moyenne en mall).
              </p>
              <p className="m-0">
                <strong>Points de décision</strong> : sur chaque chemin, les cellules où l'angle de
                changement de direction dépasse 25° sont retenues comme candidates. Un <strong>clustering</strong>
                par proximité (rayon 5 m) fusionne les points proches, pondérés par le nombre de chemins qui
                y transitent.
              </p>
              <p className="m-0">
                <strong>Classification des panneaux</strong> :
              </p>
              <ul className="list-disc pl-5 m-0 space-y-1">
                <li><strong>Accueil (welcome)</strong> : à chaque entrée détectée.</li>
                <li><strong>Directionnel</strong> : aux points de décision (bifurcations ≥ 25°).</li>
                <li><strong>Vous êtes ici</strong> : tous les 30 m de chemin sans autre repère.</li>
                <li><strong>Sortie</strong> : à chaque sortie détectée.</li>
              </ul>
              <p className="m-0">
                <strong>Priorité</strong> : <em>critique</em> si ≥ 4 chemins convergent, <em>élevée</em>
                pour ≥ 2 chemins, <em>moyenne</em> si angle &gt; 60°, <em>faible</em> sinon.
              </p>
              <p className="m-0 italic">
                Limites : l'analyse ne tient pas compte des interactions inter-étages (un transit escalator
                n'est pas encore traité comme pont entre niveaux). La fidélité des recommandations dépend
                directement de la qualité de labellisation du DXF — d'où l'importance de corriger les labels
                manuellement avant de relancer le calcul.
              </p>
            </div>
          </section>

          <footer className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            Rapport généré automatiquement par PROPH3T · {projectName} · Atlas Mall Suite · {new Date().toISOString()}
          </footer>
        </article>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ═══ Sous-composants ═════════════════════════════════════════

function KpiCard({ label, value, color }: { label: string; value: string; color: 'purple' | 'blue' | 'emerald' | 'amber' | 'red' }) {
  const colorMap = {
    purple:  'bg-purple-50 border-purple-200 text-purple-900',
    blue:    'bg-blue-50 border-blue-200 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber:   'bg-amber-50 border-amber-200 text-amber-900',
    red:     'bg-red-50 border-red-200 text-red-900',
  }
  return (
    <div className={`rounded-md border px-3 py-2.5 ${colorMap[color]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

function FlowPointsTable({ title, icon, color, points }: {
  title: string
  icon: string
  color: 'emerald' | 'red' | 'blue'
  points: FlowAnalysisResult['entrances']
}) {
  const accent = color === 'emerald' ? 'border-emerald-300 text-emerald-900 bg-emerald-50'
               : color === 'red'     ? 'border-red-300 text-red-900 bg-red-50'
               : 'border-blue-300 text-blue-900 bg-blue-50'
  return (
    <div className={`border rounded-md ${accent} p-3`}>
      <div className="text-[11px] uppercase tracking-wider font-bold mb-2">
        {icon} {title} <span className="opacity-60">({points.length})</span>
      </div>
      {points.length === 0 ? (
        <p className="text-[11px] italic opacity-70 m-0">Aucun détecté.</p>
      ) : (
        <ul className="space-y-1 text-[11px] m-0 list-none pl-0">
          {points.map(p => (
            <li key={p.id} className="flex items-baseline justify-between gap-2">
              <span className="truncate">{p.label}</span>
              <span className="text-[9px] opacity-60 tabular-nums font-mono">
                ({p.x.toFixed(0)}, {p.y.toFixed(0)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PathCard({ path, signage }: { path: FlowPath; signage: SignageRecommendation[] }) {
  return (
    <div className="border border-slate-200 rounded-md p-3 break-inside-avoid">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold m-0 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">▲</span>
          {path.from.label}
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">▼</span>
          {path.to.label}
        </h3>
        <div className="text-[11px] text-slate-500 tabular-nums">
          {path.distanceM.toFixed(0)} m · {path.durationMin.toFixed(1)} min · poids {path.weight.toFixed(2)}
        </div>
      </div>
      {signage.length > 0 ? (
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">Signalétique sur ce chemin :</span>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            {signage.map(s => {
              const meta = SIGNAGE_META[s.type]
              return (
                <li key={s.id}>
                  <span className="font-semibold" style={{ color: meta.color }}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-slate-500"> — {s.reason}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] italic text-slate-500 m-0">Aucun panneau nécessaire sur ce chemin (trajet direct).</p>
      )}
    </div>
  )
}

// ═══ Recommandations stratégiques ═════════════════════════════

function generateRecommendations(flow: FlowAnalysisResult): string[] {
  const recs: string[] = []

  if (flow.entrances.length === 0) {
    recs.push(
      `Aucune entrée détectée dans le plan. Critique : corriger la labellisation des spaces correspondants (libellé contenant "entrée" ou "entrance") avant de relancer l'analyse.`,
    )
  }
  if (flow.exits.length === 0) {
    recs.push(
      `Aucune sortie détectée. Même remarque que pour les entrées — labelliser les espaces de sortie et les issues de secours.`,
    )
  }
  if (flow.summary.criticalSignageCount > 0) {
    recs.push(
      `Déployer en priorité les ${flow.summary.criticalSignageCount} panneau${flow.summary.criticalSignageCount > 1 ? 'x' : ''} critique${flow.summary.criticalSignageCount > 1 ? 's' : ''}
       identifié${flow.summary.criticalSignageCount > 1 ? 's' : ''} aux intersections majeures (≥ 4 chemins convergent).`,
    )
  }
  if (flow.summary.unreachablePairs > 0) {
    recs.push(
      `${flow.summary.unreachablePairs} paire${flow.summary.unreachablePairs > 1 ? 's' : ''} entrée/sortie ne peut être reliée par un chemin continu.
       Causes probables : cloisons mal représentées, zones de circulation mal labellisées. À vérifier avec l'équipe architecte.`,
    )
  }
  if (flow.summary.avgDistanceM > 120) {
    recs.push(
      `La distance moyenne des chemins (${flow.summary.avgDistanceM.toFixed(0)} m) est longue :
       envisager des panneaux « Vous êtes ici » supplémentaires pour rassurer le visiteur et des zones de pause intermédiaires.`,
    )
  }
  const longPaths = flow.paths.filter(p => p.distanceM > 150)
  if (longPaths.length > 0) {
    recs.push(
      `${longPaths.length} chemin${longPaths.length > 1 ? 's' : ''} dépasse${longPaths.length > 1 ? 'nt' : ''} 150 m.
       Ajouter obligatoirement une signalétique intermédiaire pour ces trajets (perception de la distance est critique).`,
    )
  }
  if (flow.transits.length === 0 && flow.entrances.some(e => e.floorId && e.floorId !== 'RDC')) {
    recs.push(
      `Des entrées existent hors RDC mais aucun escalator / ascenseur n'a été détecté.
       Vérifier la labellisation des équipements verticaux (escalator, ascenseur, lift).`,
    )
  }
  if (recs.length === 0) {
    recs.push(
      `La configuration des flux paraît saine : entrées et sorties bien réparties, chemins de longueurs raisonnables, points de décision peu nombreux.`,
    )
  }
  // Recommandation méthodologique finale
  recs.push(
    `Lancer une campagne terrain pour valider les emplacements calculés avant déploiement physique de la signalétique (reportage photo, tests utilisateurs).`,
  )
  recs.push(
    `Relancer cette analyse après toute correction de labellisation ou évolution du plan (nouveau tenant, réaménagement, extension).`,
  )
  return recs
}
