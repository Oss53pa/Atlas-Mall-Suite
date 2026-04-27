// ═══ SIGNAGE IMPLEMENTER — Bouton "Implémenter" + rapport détaillé ═══
//
// Lit les propositions signalétique pushées par Proph3tVolumePanel
// (analyzeParcours), permet de les matérialiser sur le plan en un clic
// (signagePlacementStore persisté par projet), et affiche un rapport
// détaillé avec coverage, breakdown par type, table position/cibles/raison.

import { useState, useMemo } from 'react'
import { Signpost, CheckCircle2, FileText, X, Trash2, Sparkles, Plus, ShieldCheck, Loader2, MousePointerClick, Wallet, Download } from 'lucide-react'
import { useSignageProposalsStore } from '../../stores/signageProposalsStore'
import { useSignagePlacementStore } from '../../stores/signagePlacementStore'
import { useSignageEditUiStore } from '../../stores/signageEditUiStore'
import { useActiveProjectId } from '../../../../../hooks/useActiveProject'
import { runSkill } from '../orchestrator'
import type { Proph3tResult } from '../orchestrator.types'
import type { AuditSignagePayload } from '../skills/auditSignage'
import type { RecommendSignagePlanPayload } from '../skills/recommendSignagePlan'
import { Proph3tResultPanel } from './Proph3tResultPanel'
import { SignageReviewModal } from './SignageReviewModal'
import {
  SIGNAGE_CATALOG,
  SIGNAGE_CATEGORY_META,
  SIGNAGE_CODES_BY_CATEGORY,
  PRIORITY_META,
  resolveSignageKind,
  type SignageCategoryKey,
} from '../libraries/signageCatalog'

// Mapping legacy → catalog pour le picker (3 boutons rapides en bas du picker)
const QUICK_LEGACY: Array<{ kind: string; label: string; icon: string; color: string }> = [
  { kind: 'DIR-S', label: 'Direction', icon: '↗', color: '#f59e0b' },
  { kind: 'PLAN-M', label: 'You-are-here', icon: '⊕', color: '#059669' },
  { kind: 'ENS', label: 'Enseigne', icon: '🏷', color: '#2563eb' },
]

interface Props {
  /** Position du panneau flottant. */
  position?: 'bottom-left' | 'bottom-right'
  /** Builder de l'input d'audit (plan + spaces + POIs). Fourni par Vol3. */
  buildAuditInput?: () => {
    planWidth: number
    planHeight: number
    spaces: Array<{ id: string; label: string; type?: string; areaSqm: number; polygon: [number, number][] }>
    pois: Array<{ id: string; label: string; x: number; y: number; priority?: 1 | 2 | 3 }>
  } | null
}

export function SignageImplementer({ position = 'bottom-left', buildAuditInput }: Props) {
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

  const editMode = useSignageEditUiStore(s => s.mode)
  const addKind = useSignageEditUiStore(s => s.addKind)
  const setMode = useSignageEditUiStore(s => s.setMode)
  const setAddKind = useSignageEditUiStore(s => s.setAddKind)

  const [reportOpen, setReportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [financialOpen, setFinancialOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<Proph3tResult<AuditSignagePayload> | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [planResult, setPlanResult] = useState<Proph3tResult<RecommendSignagePlanPayload> | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // On affiche TOUJOURS le panneau (même sans proposal) pour permettre l'ajout
  // manuel et l'audit. Plus restrictif que la version précédente.

  const handleAudit = async () => {
    if (!buildAuditInput) {
      setFeedback('⚠️ Audit non disponible (pas de plan)')
      setTimeout(() => setFeedback(null), 2500)
      return
    }
    const inp = buildAuditInput()
    if (!inp) {
      setFeedback('⚠️ Plan indisponible')
      setTimeout(() => setFeedback(null), 2500)
      return
    }
    setAuditing(true)
    try {
      // Defensive bootstrap
      const { listSkills } = await import('../orchestrator')
      if (!listSkills().includes('auditSignage')) {
        const { bootstrapProph3t } = await import('../bootstrap')
        await bootstrapProph3t()
      }
      const r = await runSkill<typeof inp & { placedSigns: typeof placedForProject }, AuditSignagePayload>(
        'auditSignage',
        {
          ...inp,
          placedSigns: placedForProject.map(s => ({
            id: s.id, x: s.x, y: s.y, kind: s.kind, source: s.source,
          })),
        },
      )
      setAuditResult(r)
      setAuditOpen(true)
      // Push overlays sur le plan (zones mortes, signs problématiques)
      if (r.overlays && r.overlays.length > 0) {
        const { useProph3tOverlaysStore } = await import('../../stores/proph3tOverlaysStore')
        useProph3tOverlaysStore.getState().setOverlays(r.overlays, 'auditSignage')
      }
    } catch (err) {
      console.error('[SignageImplementer] audit failed', err)
      setFeedback(`⚠️ Audit échoué : ${(err as Error).message}`)
      setTimeout(() => setFeedback(null), 4000)
    } finally {
      setAuditing(false)
    }
  }

  const handleRecommendPlan = async () => {
    if (!buildAuditInput) {
      setFeedback('⚠️ Plan indisponible'); setTimeout(() => setFeedback(null), 2500); return
    }
    const inp = buildAuditInput()
    if (!inp) {
      setFeedback('⚠️ Plan indisponible'); setTimeout(() => setFeedback(null), 2500); return
    }
    setPlanning(true)
    try {
      const { listSkills } = await import('../orchestrator')
      if (!listSkills().includes('recommendSignagePlan')) {
        const { bootstrapProph3t } = await import('../bootstrap')
        await bootstrapProph3t()
      }
      // Compte les déjà placés par code
      const alreadyPlaced: Record<string, number> = {}
      for (const s of placedForProject) {
        alreadyPlaced[s.kind] = (alreadyPlaced[s.kind] ?? 0) + 1
      }
      const r = await runSkill<typeof inp & { alreadyPlaced: Record<string, number> }, RecommendSignagePlanPayload>(
        'recommendSignagePlan',
        { ...inp, alreadyPlaced },
      )
      setPlanResult(r)
      setPlanOpen(true)
      // Push pins de proposition sur le plan (preview avant placement)
      const { useSignagePlanPinsStore } = await import('../../stores/signagePlanPinsStore')
      const allPins: Array<{ id: string; code: string; x: number; y: number; reason: string; zoneLabel?: string; targetPoiId?: string }> = []
      for (const rec of r.payload.recommendations) {
        rec.suggestedLocations.forEach((loc, i) => {
          allPins.push({
            id: `pin-${rec.code}-${i}`,
            code: rec.code,
            x: loc.x, y: loc.y,
            reason: loc.reason,
            zoneLabel: loc.zoneLabel,
            targetPoiId: loc.targetPoiId,
          })
        })
      }
      useSignagePlanPinsStore.getState().setPins(allPins)
    } catch (err) {
      console.error('[SignageImplementer] plan failed', err)
      setFeedback(`⚠️ Plan échoué : ${(err as Error).message}`)
      setTimeout(() => setFeedback(null), 4000)
    } finally {
      setPlanning(false)
    }
  }

  /** Place tous les manquants d'une recommandation aux locations suggérées. */
  const handlePlaceRecommendation = async (rec: RecommendSignagePlanPayload['recommendations'][number]) => {
    if (rec.suggestedLocations.length === 0) return
    addMany(projectId, rec.suggestedLocations.map(loc => ({
      x: loc.x, y: loc.y,
      kind: rec.code,
      targets: loc.targetPoiId ? [loc.targetPoiId] : [],
      label: rec.meta.label,
      reason: loc.reason,
      source: 'proph3t-auto' as const,
      confidence: 0.85,
      needsReview: false,
      reviewReason: undefined,
      reviewed: false,
    })))
    setFeedback(`✅ ${rec.suggestedLocations.length} × ${rec.code} placés`)
    setTimeout(() => setFeedback(null), 2500)
    // Retire les pins de propositions pour ce code (déjà placés)
    const { useSignagePlanPinsStore } = await import('../../stores/signagePlanPinsStore')
    useSignagePlanPinsStore.getState().removeByCode(rec.code)
    // Refresh planResult pour mettre à jour les compteurs
    handleRecommendPlan()
  }

  /** Place TOUS les manquants en un clic (couvre tout le plan). */
  const handlePlaceAllMissing = () => {
    if (!planResult) return
    const totalToPlace = planResult.payload.recommendations
      .reduce((s, r) => s + r.suggestedLocations.length, 0)
    if (totalToPlace > 50) {
      const ok = confirm(
        `Vous allez ajouter ${totalToPlace} panneaux d'un coup sur le plan.\n\n` +
        `Cela peut saturer visuellement. Recommandation : utilisez plutôt les boutons "+N" par ligne pour placer catégorie par catégorie (Parcours client d'abord, puis Sécurité ERP, etc.).\n\n` +
        `Continuer quand même ?`,
      )
      if (!ok) return
    }
    let total = 0
    for (const rec of planResult.payload.recommendations) {
      if (rec.suggestedLocations.length === 0) continue
      addMany(projectId, rec.suggestedLocations.map(loc => ({
        x: loc.x, y: loc.y,
        kind: rec.code,
        targets: [],
        label: rec.meta.label,
        reason: loc.reason,
        source: 'proph3t-auto' as const,
        confidence: 0.85,
        needsReview: false,
        reviewReason: undefined,
        reviewed: false,
      })))
      total += rec.suggestedLocations.length
    }
    setFeedback(`✅ ${total} panneaux placés (plan complet)`)
    setTimeout(() => setFeedback(null), 3000)
    handleRecommendPlan()
  }

  /** EMERGENCY : retire TOUS les panneaux du projet (auto + manuel). */
  const handleRemoveAll = () => {
    if (placedForProject.length === 0) return
    const ok = confirm(
      `Retirer TOUS les ${placedForProject.length} panneaux du plan (auto + manuels) ?\n\n` +
      `Cette action est irréversible (mais tu peux toujours relancer "Plan signalétique complet").`,
    )
    if (!ok) return
    clearForProject(projectId)
    setFeedback(`🗑️ ${placedForProject.length} panneaux retirés`)
    setTimeout(() => setFeedback(null), 2500)
  }

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
      confidence: p.confidence,
      needsReview: p.needsReview,
      reviewReason: p.reviewReason,
      reviewed: false,
    })))
    const uncertainCount = proposals.filter(p => p.needsReview).length
    setFeedback(uncertainCount > 0
      ? `✅ ${proposals.length} panneaux placés · ${uncertainCount} à valider`
      : `✅ ${proposals.length} panneaux placés (haute confiance)`)
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

  // Répartition par catégorie catalogue (au lieu de 3 types fixes)
  const breakdownByCategory = useMemo(() => {
    const out: Record<string, number> = {}
    for (const p of proposals) {
      const def = resolveSignageKind(p.kind)
      out[def.category] = (out[def.category] ?? 0) + 1
    }
    return out
  }, [proposals])
  const coveredSqm = (circulationSqm * coveragePct) / 100
  const placedAuto = placedForProject.filter(s => s.source === 'proph3t-auto').length
  const uncertainCount = placedForProject.filter(s => s.needsReview && !s.reviewed).length

  // Breakdown placés par type (avec metadata catalogue)
  const placedByType = useMemo(() => {
    const groups = new Map<string, { code: string; count: number; def: ReturnType<typeof resolveSignageKind> }>()
    for (const s of placedForProject) {
      const def = resolveSignageKind(s.kind)
      const key = def.code
      const cur = groups.get(key) ?? { code: key, count: 0, def }
      cur.count++
      groups.set(key, cur)
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count)
  }, [placedForProject])

  /** Retire tous les panneaux d'un type donné. */
  const handleRemoveByCode = (code: string) => {
    const matching = placedForProject.filter(s => resolveSignageKind(s.kind).code === code)
    if (matching.length === 0) return
    const ok = confirm(`Retirer les ${matching.length} panneaux de type "${resolveSignageKind(matching[0].kind).label}" (${code}) ?`)
    if (!ok) return
    for (const s of matching) {
      useSignagePlacementStore.getState().remove(s.id)
    }
    setFeedback(`🗑️ ${matching.length} × ${code} retirés`)
    setTimeout(() => setFeedback(null), 2500)
  }

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
              {uncertainCount > 0 && (
                <span className="text-amber-300 font-bold"> · {uncertainCount} à valider</span>
              )}
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

          {uncertainCount > 0 && (
            <button
              onClick={() => setReviewOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-bold border-2 border-amber-300/40 animate-pulse"
            >
              <ShieldCheck size={14} />
              {uncertainCount} placement{uncertainCount > 1 ? 's' : ''} à valider
            </button>
          )}

          <button
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-surface-1 hover:bg-slate-800 text-slate-200 text-[11px] font-medium border border-white/10"
          >
            <FileText size={12} />
            Rapport détaillé signalétique
          </button>

          {/* ─── Mode édition manuelle (catalogue complet) ─── */}
          <CatalogPicker
            editMode={editMode}
            addKind={addKind}
            setMode={setMode}
            setAddKind={setAddKind}
          />

          {/* ─── Plan signalétique complet (PRESCRIPTIF) ─── */}
          <button
            onClick={handleRecommendPlan}
            disabled={planning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-[12px] font-bold disabled:opacity-40 mt-1"
          >
            {planning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {planning ? 'Calcul du plan…' : 'Plan signalétique complet (combien · où · quel type)'}
          </button>

          {/* ─── Audit Proph3t ─── */}
          <button
            onClick={handleAudit}
            disabled={auditing || placedForProject.length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          >
            {auditing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            {auditing ? 'Audit en cours…' : 'Auditer ma signalétique'}
          </button>

          {/* Rapport financier */}
          <button
            onClick={() => setFinancialOpen(true)}
            disabled={placedForProject.length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Wallet size={14} />
            Rapport financier (BoM + total FCFA)
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
          {/* Breakdown par type — identifie ce qui pollue le plan */}
          {placedByType.length > 0 && (
            <div className="rounded border border-white/10 bg-surface-1 p-2 mt-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
                <span>Panneaux placés ({placedForProject.length})</span>
                <span className="text-slate-400">par type — clic = retirer</span>
              </div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {placedByType.map(g => (
                  <button
                    key={g.code}
                    onClick={() => handleRemoveByCode(g.code)}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded bg-surface-0 hover:bg-rose-950/40 hover:border-rose-500/40 border border-white/5 text-left transition group"
                    title={`${g.def.label} — ${g.def.description}\nClic = retirer les ${g.count} panneaux`}
                  >
                    <span style={{ color: g.def.color }} className="text-base leading-none">{g.def.icon}</span>
                    <span className="flex-1 text-[10px] text-slate-300">
                      <span className="font-mono text-cyan-300 mr-1">{g.code}</span>
                      <span>{g.def.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-rose-300">
                      {g.count}<Trash2 size={9} className="inline ml-1 opacity-0 group-hover:opacity-100" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {placedForProject.length > 0 && (
            <button
              onClick={handleRemoveAll}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold text-white bg-rose-700 hover:bg-rose-600 border border-rose-500"
            >
              <Trash2 size={11} />
              🚨 Tout retirer ({placedForProject.length})
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
          {placedForProject.length === 0 && proposals.length === 0 && (
            <div className="text-[10px] text-slate-500 italic text-center px-2 py-2">
              Active le mode ajout pour placer manuellement, ou lance « Suggérer signalétique » dans Proph3t.
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL VALIDATION HUMAINE (placements à valider) ═══ */}
      <SignageReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onStartCorrection={(signId) => {
          // Ferme la modal puis active le drag focalisé : l'utilisateur
          // peut directement glisser le panneau à la bonne position.
          import('../../stores/signageEditUiStore').then(({ useSignageEditUiStore }) => {
            useSignageEditUiStore.getState().startDrag(signId)
          })
        }}
      />

      {/* ═══ MODAL RAPPORT D'AUDIT ═══ */}
      {auditOpen && auditResult && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setAuditOpen(false)}
        >
          <div
            className="bg-surface-1 border border-purple-500/30 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface-1 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-purple-300" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-white">Audit signalétique — Proph3t</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Skill : <span className="font-mono text-purple-300">auditSignage</span> ·
                    Score : <span className="text-amber-300 font-bold">{auditResult.qualityScore}/100</span> ·
                    Confiance : <span className="text-amber-300">{(auditResult.confidence.score * 100).toFixed(0)}%</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setAuditOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Score breakdown */}
              <div className="grid grid-cols-4 gap-3">
                <ScoreCard label="Couverture" value={auditResult.payload.scoreBreakdown.coverage} max={40} extra={`${auditResult.payload.coveragePct.toFixed(0)}%`} />
                <ScoreCard label="Densité" value={auditResult.payload.scoreBreakdown.density} max={20} extra={`${auditResult.payload.densityPer100Sqm.toFixed(2)}/100m² (${auditResult.payload.benchmarkDensity.status})`} />
                <ScoreCard label="Placement" value={auditResult.payload.scoreBreakdown.placement} max={20} extra={`${auditResult.payload.signsInNonCirculation.length} hors zone`} />
                <ScoreCard label="Pertinence POI" value={auditResult.payload.scoreBreakdown.orphans} max={20} extra={`${auditResult.payload.orphanSigns.length} orphelins`} />
              </div>

              <Proph3tResultPanel result={auditResult} />
            </div>
          </div>
        </div>
      )}

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

              {/* Breakdown par catégorie catalogue */}
              <section>
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">Répartition par catégorie</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(breakdownByCategory) as Array<[SignageCategoryKey, number]>).map(([cat, count]) => {
                    const meta = SIGNAGE_CATEGORY_META[cat]
                    if (!meta) return null
                    return (
                      <div key={cat} className="rounded-lg border border-white/10 bg-surface-0 p-3"
                        style={{ borderLeft: `3px solid ${meta.color}` }}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[11px] font-semibold text-white">{meta.label}</span>
                          <span className="text-2xl font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
                        </div>
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
                        const meta = resolveSignageKind(p.kind)
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

      {/* ═══ MODAL RAPPORT FINANCIER ═══ */}
      <FinancialReportModal
        open={financialOpen}
        onClose={() => setFinancialOpen(false)}
        signs={placedForProject}
      />

      {/* ═══ MODAL PLAN SIGNALÉTIQUE COMPLET ═══ */}
      <SignagePlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        result={planResult}
        onPlaceOne={handlePlaceRecommendation}
        onPlaceAll={handlePlaceAllMissing}
      />
    </>
  )
}

// ═══ SUB-COMPONENT : Catalog Picker (catégories + grille) ═══════════════

function CatalogPicker({
  editMode, addKind, setMode, setAddKind,
}: {
  editMode: 'idle' | 'add' | 'drag'
  addKind: string
  setMode: (m: 'idle' | 'add' | 'drag') => void
  setAddKind: (k: string) => void
}) {
  const [activeCat, setActiveCat] = useState<SignageCategoryKey>('orientation-direction')
  const codes = SIGNAGE_CODES_BY_CATEGORY[activeCat]
  const currentDef = resolveSignageKind(addKind)

  return (
    <div className="rounded border border-white/10 bg-surface-1 p-2 mt-1">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">Édition manuelle (catalogue ERP)</div>
      <button
        onClick={() => setMode(editMode === 'add' ? 'idle' : 'add')}
        className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold transition ${
          editMode === 'add'
            ? 'bg-amber-500 hover:bg-amber-400 text-amber-950'
            : 'bg-surface-0 hover:bg-slate-800 text-slate-200 border border-white/10'
        }`}
      >
        {editMode === 'add' ? <MousePointerClick size={12} /> : <Plus size={12} />}
        {editMode === 'add'
          ? `Cliquer pour ajouter : ${currentDef.code}`
          : 'Activer le mode ajout'}
      </button>

      {editMode === 'add' && (
        <div className="mt-2 space-y-1.5">
          {/* Tabs catégories */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(Object.keys(SIGNAGE_CATEGORY_META) as SignageCategoryKey[]).map(cat => {
              const meta = SIGNAGE_CATEGORY_META[cat]
              const active = activeCat === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-2 py-1 rounded text-[9px] font-semibold whitespace-nowrap transition ${
                    active ? 'bg-white/15 text-white' : 'bg-surface-0 text-slate-400 hover:text-white'
                  }`}
                  style={{ borderLeft: `2px solid ${meta.color}` }}
                  title={meta.label}
                >
                  <span className="mr-1">{meta.icon}</span>{meta.label}
                </button>
              )
            })}
          </div>
          {/* Grille types de la catégorie */}
          <div className="grid grid-cols-3 gap-1 max-h-[180px] overflow-y-auto">
            {codes.map(code => {
              const def = SIGNAGE_CATALOG[code]
              const active = addKind === code
              return (
                <button
                  key={code}
                  onClick={() => setAddKind(code)}
                  className={`flex flex-col items-center px-1 py-1.5 rounded text-[9px] font-medium border transition ${
                    active ? 'bg-white/15 text-white' : 'bg-surface-0 text-slate-400 hover:text-white border-white/10'
                  }`}
                  style={{ borderColor: active ? def.color : undefined }}
                  title={`${def.label}\n${def.description}\nPrix : ${def.priceFcfa.toLocaleString('fr-FR')} FCFA${def.standards.length > 0 ? '\nNormes : ' + def.standards.join(', ') : ''}`}
                >
                  <span style={{ color: def.color }} className="text-base leading-none">{def.icon}</span>
                  <span className="mt-0.5 text-center leading-tight">{def.code}</span>
                  {def.erpRequired && (
                    <span className="text-[7px] text-rose-300 font-bold">ERP</span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Détail kind sélectionné */}
          <div className="rounded bg-surface-0 border border-white/10 p-2 text-[9px]">
            <div className="font-semibold text-white">{currentDef.label} <span className="text-slate-500">({currentDef.code})</span></div>
            <div className="text-slate-400 mt-0.5">{currentDef.description}</div>
            <div className="flex items-center gap-2 mt-1.5 text-slate-500">
              <span>💰 {currentDef.priceFcfa.toLocaleString('fr-FR')} FCFA</span>
              <span>·</span>
              <span style={{ color: PRIORITY_META[currentDef.priority].color }}>
                {currentDef.priority} {PRIORITY_META[currentDef.priority].label}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-1.5 text-[9px] text-slate-500 italic">
        Clic = ajouter · Glisser = déplacer · Clic-droit = supprimer
      </div>
    </div>
  )
}

// ═══ SUB-COMPONENT : Financial Report Modal ═══════════════════════════════

function FinancialReportModal({
  open, onClose, signs,
}: {
  open: boolean
  onClose: () => void
  signs: Array<{ kind: string; source: string; needsReview?: boolean }>
}) {
  const bom = useMemo(() => {
    const groups: Record<string, { code: string; def: typeof SIGNAGE_CATALOG[string]; qty: number; total: number }> = {}
    for (const s of signs) {
      const def = resolveSignageKind(s.kind)
      const code = def.code
      if (!groups[code]) groups[code] = { code, def, qty: 0, total: 0 }
      groups[code].qty++
      groups[code].total += def.priceFcfa
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [signs])

  const grandTotal = bom.reduce((s, g) => s + g.total, 0)
  const erpTotal = bom.filter(g => g.def.erpRequired).reduce((s, g) => s + g.total, 0)
  const byPriority = {
    P1: bom.filter(g => g.def.priority === 'P1').reduce((s, g) => s + g.total, 0),
    P2: bom.filter(g => g.def.priority === 'P2').reduce((s, g) => s + g.total, 0),
    P3: bom.filter(g => g.def.priority === 'P3').reduce((s, g) => s + g.total, 0),
  }
  const byCategory = useMemo(() => {
    const out: Record<string, number> = {}
    for (const g of bom) out[g.def.category] = (out[g.def.category] ?? 0) + g.total
    return out
  }, [bom])

  const handleExportCsv = () => {
    const lines = [
      'Code,Libellé,Catégorie,Quantité,Prix unitaire FCFA,Total FCFA,Priorité,ERP,Norme,Fournisseurs',
      ...bom.map(g => [
        g.code,
        `"${g.def.label}"`,
        g.def.category,
        g.qty,
        g.def.priceFcfa,
        g.total,
        g.def.priority,
        g.def.erpRequired ? 'OUI' : 'NON',
        `"${g.def.standards.join(' ; ')}"`,
        `"${g.def.suppliersCI.join(' ; ')}"`,
      ].join(',')),
      '',
      `TOTAL,,,${signs.length},,${grandTotal},,,,`,
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signage-bom-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-amber-500/30 rounded-xl max-w-6xl w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface-1 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="text-amber-300" size={20} />
            <div>
              <h2 className="text-lg font-bold text-white">Rapport financier — Signalétique</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                BoM (Bill of Materials) calculé depuis le SIGNAGE_CATALOG · Prix indicatifs CI 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold"
            >
              <Download size={12} /> Export CSV
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* TOTAUX */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-950/30 p-4">
              <div className="text-[9px] uppercase text-amber-300 tracking-widest font-bold">Total budget</div>
              <div className="mt-1 text-3xl font-bold text-amber-200 tabular-nums">
                {(grandTotal / 1_000_000).toFixed(1)}<span className="text-lg ml-1">M FCFA</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{signs.length} panneaux placés</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4">
              <div className="text-[9px] uppercase text-rose-300 tracking-widest">Obligations ERP</div>
              <div className="mt-1 text-2xl font-bold text-rose-200 tabular-nums">
                {(erpTotal / 1_000_000).toFixed(2)}<span className="text-sm ml-1">M FCFA</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{erpTotal > 0 ? `${((erpTotal / grandTotal) * 100).toFixed(0)}% du budget` : 'Aucun ERP'}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-surface-0 p-4">
              <div className="text-[9px] uppercase text-slate-500 tracking-widest">Avant ouverture (P1)</div>
              <div className="mt-1 text-2xl font-bold text-white tabular-nums">
                {(byPriority.P1 / 1_000_000).toFixed(2)}<span className="text-sm text-slate-500 ml-1">M</span>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-surface-0 p-4">
              <div className="text-[9px] uppercase text-slate-500 tracking-widest">Phases ultérieures</div>
              <div className="mt-1 text-2xl font-bold text-white tabular-nums">
                {((byPriority.P2 + byPriority.P3) / 1_000_000).toFixed(2)}<span className="text-sm text-slate-500 ml-1">M</span>
              </div>
              <div className="text-[10px] text-slate-400">P2 : {(byPriority.P2 / 1e6).toFixed(2)}M · P3 : {(byPriority.P3 / 1e6).toFixed(2)}M</div>
            </div>
          </div>

          {/* RÉPARTITION PAR CATÉGORIE */}
          <section>
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">Répartition budgétaire par catégorie</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(byCategory) as Array<[SignageCategoryKey, number]>).map(([cat, amt]) => {
                const meta = SIGNAGE_CATEGORY_META[cat]
                if (!meta) return null
                const pct = (amt / grandTotal) * 100
                return (
                  <div key={cat} className="rounded-lg border border-white/10 bg-surface-0 p-3"
                    style={{ borderLeft: `3px solid ${meta.color}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white">{meta.icon} {meta.label}</span>
                      <span className="text-[10px] text-slate-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="text-xl font-bold tabular-nums mt-1" style={{ color: meta.color }}>
                      {(amt / 1_000_000).toFixed(2)}<span className="text-xs text-slate-500 ml-1">M FCFA</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-surface-1 rounded overflow-hidden">
                      <div style={{ width: `${pct}%`, background: meta.color }} className="h-full" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* TABLE BoM */}
          <section>
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">
              Bill of Materials ({bom.length} types · {signs.length} unités)
            </h3>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-surface-0 border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-400 font-semibold">Code</th>
                    <th className="px-3 py-2 text-left text-slate-400 font-semibold">Libellé</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-semibold">Qté</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-semibold">PU FCFA</th>
                    <th className="px-3 py-2 text-right text-slate-400 font-semibold">Total FCFA</th>
                    <th className="px-3 py-2 text-center text-slate-400 font-semibold">Priorité</th>
                    <th className="px-3 py-2 text-left text-slate-400 font-semibold">Norme</th>
                    <th className="px-3 py-2 text-left text-slate-400 font-semibold">Fournisseurs CI</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((g, i) => (
                    <tr key={g.code} className={i % 2 === 0 ? 'bg-surface-0/30' : ''}>
                      <td className="px-3 py-2 font-mono text-cyan-300">{g.code}</td>
                      <td className="px-3 py-2 text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: g.def.color }}>{g.def.icon}</span>
                          {g.def.label}
                          {g.def.erpRequired && <span className="px-1 rounded bg-rose-900/40 text-rose-300 text-[8px] font-bold">ERP</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300 font-mono">{g.qty}</td>
                      <td className="px-3 py-2 text-right text-slate-400 font-mono text-[10px]">{g.def.priceFcfa.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 text-right text-amber-200 font-mono font-bold">{g.total.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: `${PRIORITY_META[g.def.priority].color}30`, color: PRIORITY_META[g.def.priority].color }}>
                          {g.def.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-[9px]">{g.def.standards.join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 text-[9px]">{g.def.suppliersCI.slice(0, 2).join(', ')}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-amber-500/40 bg-amber-950/20">
                    <td colSpan={2} className="px-3 py-3 text-amber-200 font-bold">TOTAL</td>
                    <td className="px-3 py-3 text-right text-amber-200 font-mono font-bold">{signs.length}</td>
                    <td></td>
                    <td className="px-3 py-3 text-right text-amber-200 font-mono font-bold text-base">{grandTotal.toLocaleString('fr-FR')}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {bom.length === 0 && (
            <div className="text-center py-8 text-slate-500 italic">
              Aucun panneau placé. Implémente la signalétique optimisée ou ajoute manuellement.
            </div>
          )}

          {/* Footer méthodologie */}
          <section className="rounded-lg border border-white/10 bg-surface-0 p-4 text-[10px] text-slate-400">
            <strong className="text-white">Méthodologie BoM</strong> — Prix unitaires extraits du <code className="text-cyan-300">SIGNAGE_CATALOG</code>
            (libraries/signageCatalog.ts) qui référence 25 types selon la charte The Mall + normes ISO 7010 / NF / EN.
            Les fournisseurs CI listés sont indicatifs (Signalétique CI, ASG Industries, LM Signa, Pôle Graphique, Hager CI, Legrand CI, Schneider CI, etc.).
            Le total inclut pose mais ne couvre pas la maintenance ni les consommables (piles beacons, films vitrophanie remplacés tous les 2 ans).
          </section>
        </div>
      </div>
    </div>
  )
}

// ═══ SUB-COMPONENT : Modal plan signalétique complet ════════════════════

function SignagePlanModal({
  open, onClose, result, onPlaceOne, onPlaceAll,
}: {
  open: boolean
  onClose: () => void
  result: Proph3tResult<RecommendSignagePlanPayload> | null
  onPlaceOne: (rec: RecommendSignagePlanPayload['recommendations'][number]) => void
  onPlaceAll: () => void
}) {
  // Filtre catégorie : 'all' | 'parcours' | category key
  const [filter, setFilter] = useState<'all' | 'parcours' | SignageCategoryKey>('parcours')

  if (!open || !result) return null
  const p = result.payload

  // Tri ERP d'abord, puis par priorité, puis par missing desc
  const sortedAll = [...p.recommendations].sort((a, b) => {
    if (a.meta.erpRequired !== b.meta.erpRequired) return a.meta.erpRequired ? -1 : 1
    const prio = { P1: 0, P2: 1, P3: 2 }
    const pa = prio[a.meta.priority] - prio[b.meta.priority]
    if (pa !== 0) return pa
    return b.missingQty - a.missingQty
  })

  // Catégories "Parcours client" = wayfinding pour le client (panneaux qui guident).
  const PARCOURS_CATS: SignageCategoryKey[] = ['orientation-direction', 'wayfinding-numerique', 'information-services']

  const sorted = filter === 'all'
    ? sortedAll
    : filter === 'parcours'
      ? sortedAll.filter(r => PARCOURS_CATS.includes(r.meta.category))
      : sortedAll.filter(r => r.meta.category === filter)

  const filterStats = {
    all: sortedAll,
    parcours: sortedAll.filter(r => PARCOURS_CATS.includes(r.meta.category)),
    'orientation-direction': sortedAll.filter(r => r.meta.category === 'orientation-direction'),
    'identification-locaux': sortedAll.filter(r => r.meta.category === 'identification-locaux'),
    'securite-erp': sortedAll.filter(r => r.meta.category === 'securite-erp'),
    'information-services': sortedAll.filter(r => r.meta.category === 'information-services'),
    'communication-promotion': sortedAll.filter(r => r.meta.category === 'communication-promotion'),
    'wayfinding-numerique': sortedAll.filter(r => r.meta.category === 'wayfinding-numerique'),
  } as const

  const filterMissing = (key: keyof typeof filterStats) =>
    filterStats[key].reduce((s, r) => s + r.missingQty, 0)
  const filterRequired = (key: keyof typeof filterStats) =>
    filterStats[key].reduce((s, r) => s + r.requiredQty, 0)

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-cyan-500/40 rounded-xl max-w-7xl w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface-1 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-300" size={20} />
            <div>
              <h2 className="text-lg font-bold text-white">Plan signalétique prescriptif</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Calcul depuis SIGNAGE_CATALOG (règles métier + normes ERP) ·
                Conformité ERP : <span className={p.erpCompliancePct === 100 ? 'text-emerald-300' : 'text-amber-300'}>{p.erpCompliancePct.toFixed(0)}%</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PinsVisibilityToggle />
            <button
              onClick={() => downloadHtmlReport(result)}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-semibold"
            >
              <Download size={12} /> Rapport HTML
            </button>
            {p.totalMissing > 0 && (
              <button
                onClick={onPlaceAll}
                className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold"
              >
                <CheckCircle2 size={14} /> Tout placer ({p.totalMissing} panneaux)
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Résumé */}
          <div className="grid grid-cols-5 gap-3">
            <Kpi label="Total requis" value={p.totalRequired} unit="panneaux" color="cyan" />
            <Kpi label="Déjà placés" value={p.totalCurrent} unit="panneaux" color="emerald" />
            <Kpi label="Manquants" value={p.totalMissing} unit="panneaux" color={p.totalMissing > 0 ? 'amber' : 'slate'} />
            <Kpi label="Budget restant" value={(p.costMissingFcfa / 1_000_000).toFixed(1)} unit="M FCFA" color="amber" />
            <Kpi label="Conformité ERP" value={p.erpCompliancePct.toFixed(0)} unit="%" color={p.erpCompliancePct === 100 ? 'emerald' : 'rose'} />
          </div>

          {/* ═══ INVENTAIRE DÉTECTION — vérifie avant de placer ═══ */}
          {p.detectionInventory && (
            <section className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-4">
              <h3 className="text-[12px] font-bold text-amber-200 uppercase tracking-wider mb-2">
                🔍 Détection Prophet — vérifie avant placement
              </h3>
              <p className="text-[11px] text-amber-100 mb-3">
                Si Prophet n'a pas correctement détecté les sanitaires, ascenseurs ou ancres, les placements seront mal positionnés. Vérifie ci-dessous puis ajuste les types dans Atlas Studio si nécessaire.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
                <DetectionGroup label="🚻 Sanitaires" items={p.detectionInventory.wcs} emptyLabel="Aucun sanitaire détecté" />
                <DetectionGroup label="🛗 Ascenseurs" items={p.detectionInventory.elevators} emptyLabel="Aucun ascenseur détecté" />
                <DetectionGroup label="↗ Escalators" items={p.detectionInventory.escalators} emptyLabel="Aucun escalator détecté" />
                <DetectionGroup label="🪜 Escaliers" items={p.detectionInventory.stairs} emptyLabel="Aucun escalier détecté" />
                <DetectionGroup label="🚪 Entrées" items={p.detectionInventory.entrances.map(e => ({ ...e, areaSqm: 0 }))} emptyLabel="Aucune entrée — défaut centre du plan" hideArea />
                <DetectionGroup label="🏬 POI ancres" items={p.detectionInventory.anchors.map(a => ({ ...a, areaSqm: 0 }))} emptyLabel="Aucune ancre P1 — placements sans cible" hideArea />
                <DetectionGroup label="🏪 Commerces" items={p.detectionInventory.commerces.slice(0, 8)} emptyLabel="Aucun commerce" extraNote={p.detectionInventory.commerces.length > 8 ? `+${p.detectionInventory.commerces.length - 8} autres` : undefined} />
              </div>
            </section>
          )}

          {/* ═══ ZONES DU PLAN DÉTECTÉES PAR PROPHET ═══ */}
          {p.zoneSummary && p.zoneSummary.length > 0 && (
            <section className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-4">
              <h3 className="text-[12px] font-bold text-emerald-200 uppercase tracking-wider mb-2">
                🗺️ Plan analysé — zones détectées
              </h3>
              <p className="text-[11px] text-emerald-100 mb-3">
                Prophet a identifié les zones suivantes et adapte la signalétique à chacune (galerie commerciale, promenade/mail, parking, extérieur, services).
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {p.zoneSummary.filter(z => z.zone !== 'unknown').map(z => (
                  <div key={z.zone} className="rounded border border-white/10 bg-surface-0 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold text-white">{z.label}</span>
                      <span className="text-[10px] text-emerald-300 font-mono">{z.plannedSignsCount} panneaux</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {z.spaceCount} espace{z.spaceCount > 1 ? 's' : ''} · {z.areaSqm.toFixed(0)} m²
                    </div>
                    {z.topTypes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {z.topTypes.map(t => (
                          <span key={t.code} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-200 font-mono">
                            {t.code} ×{t.qty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Filtres catégorie */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <FilterTab active={filter === 'parcours'} onClick={() => setFilter('parcours')}
              label="🚶 Parcours client" missing={filterMissing('parcours')} required={filterRequired('parcours')} highlight />
            <FilterTab active={filter === 'securite-erp'} onClick={() => setFilter('securite-erp')}
              label="🚨 Sécurité ERP" missing={filterMissing('securite-erp')} required={filterRequired('securite-erp')} />
            <FilterTab active={filter === 'identification-locaux'} onClick={() => setFilter('identification-locaux')}
              label="🏷 Identification locaux" missing={filterMissing('identification-locaux')} required={filterRequired('identification-locaux')} />
            <FilterTab active={filter === 'communication-promotion'} onClick={() => setFilter('communication-promotion')}
              label="📣 Communication" missing={filterMissing('communication-promotion')} required={filterRequired('communication-promotion')} />
            <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}
              label="Tout afficher" missing={filterMissing('all')} required={filterRequired('all')} />
          </div>

          {/* Banner explicatif quand filtre = parcours */}
          {filter === 'parcours' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-[11px] text-emerald-100">
              <strong className="text-emerald-300">Signalétique parcours client</strong> — panneaux qui guident le visiteur de l'entrée à sa destination :
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">DIR-S</span> directionnels suspendus aux nœuds,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">DIR-M</span> applique murale couloirs secondaires,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">DIR-SOL</span> marquage au sol,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">PLAN-M</span> plans Vous-êtes-ici,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">REP</span> répertoire d'enseignes aux entrées,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">SRV-WC/ASC</span> services,
              <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-200 text-[10px] font-mono">WAY-BOR</span> bornes wayfinder interactives.
            </div>
          )}

          {/* Table */}
          <section>
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3">
              {filter === 'parcours' ? 'Signalétique parcours client' : filter === 'all' ? 'Toutes les recommandations' : 'Recommandations'} ({sorted.length} types)
            </h3>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-surface-0 border-b border-white/10 sticky top-[60px]">
                  <tr>
                    <th className="px-2 py-2 text-left text-slate-400 font-semibold">Code</th>
                    <th className="px-2 py-2 text-left text-slate-400 font-semibold">Type</th>
                    <th className="px-2 py-2 text-center text-slate-400 font-semibold">P</th>
                    <th className="px-2 py-2 text-center text-slate-400 font-semibold">ERP</th>
                    <th className="px-2 py-2 text-right text-slate-400 font-semibold">Requis</th>
                    <th className="px-2 py-2 text-right text-slate-400 font-semibold">Placés</th>
                    <th className="px-2 py-2 text-right text-slate-400 font-semibold">Manque</th>
                    <th className="px-2 py-2 text-right text-slate-400 font-semibold">Coût FCFA</th>
                    <th className="px-2 py-2 text-left text-slate-400 font-semibold">Justification</th>
                    <th className="px-2 py-2 text-center text-slate-400 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={r.code} className={`${i % 2 === 0 ? 'bg-surface-0/30' : ''} ${r.meta.erpRequired ? 'border-l-2 border-rose-500/40' : ''}`}>
                      <td className="px-2 py-2 font-mono text-cyan-300">{r.code}</td>
                      <td className="px-2 py-2 text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: r.meta.color }} className="text-base">{r.meta.icon}</span>
                          <span>{r.meta.label}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-1 rounded text-[9px] font-bold"
                          style={{
                            background: r.meta.priority === 'P1' ? '#dc262640' : r.meta.priority === 'P2' ? '#f59e0b40' : '#3b82f640',
                            color: r.meta.priority === 'P1' ? '#fca5a5' : r.meta.priority === 'P2' ? '#fcd34d' : '#93c5fd',
                          }}>
                          {r.meta.priority}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {r.meta.erpRequired ? (
                          <span className="px-1.5 rounded bg-rose-900/40 text-rose-300 text-[9px] font-bold">OUI</span>
                        ) : (
                          <span className="text-slate-600 text-[9px]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-200 font-mono font-semibold">{r.requiredQty}</td>
                      <td className="px-2 py-2 text-right text-emerald-300 font-mono">{r.currentQty}</td>
                      <td className="px-2 py-2 text-right">
                        {r.missingQty > 0 ? (
                          <span className="text-amber-300 font-mono font-bold">{r.missingQty}</span>
                        ) : (
                          <span className="text-emerald-400 font-mono">✓ 0</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-amber-200 font-mono text-[10px]">
                        {r.costMissingFcfa > 0 ? r.costMissingFcfa.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-400 text-[10px] max-w-[280px]">{r.rationale}</td>
                      <td className="px-2 py-2 text-center">
                        {r.missingQty > 0 && r.suggestedLocations.length > 0 && (
                          <button
                            onClick={() => onPlaceOne(r)}
                            className="px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[9px] font-bold"
                            title={`Placer ${r.missingQty} panneaux aux positions calculées`}
                          >
                            +{r.missingQty}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Méthodologie */}
          <section className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4 text-[11px] text-slate-300">
            <h4 className="font-bold text-cyan-200 mb-2 uppercase tracking-wider text-[10px]">Comment les quantités sont calculées</h4>
            <ul className="space-y-1 list-disc pl-5">
              <li><strong>per-decision-node</strong> : 1 panneau par centroïde + médian d'arête longue dans les circulations.</li>
              <li><strong>per-meters-path</strong> (BAES, balisage) : 1 tous les N mètres sur les périmètres des évacuations (ex : 30m pour SEC-IS, 15m pour SEC-BAES).</li>
              <li><strong>per-extinguisher</strong> : 1 panneau par extincteur, 1 extincteur tous les 200 m² selon arrêté ERP MS39.</li>
              <li><strong>per-area-sqm</strong> (plans Vous-êtes-ici, écrans dynamiques) : 1 par 2000 ou 3000 m².</li>
              <li><strong>per-floor-zone</strong> (plan évac, RIA) : 1 par niveau × zones de N m².</li>
              <li><strong>per-local / per-elevator / per-wc-block</strong> : compté depuis les types d'espaces du plan.</li>
              <li><strong>per-entrance / per-parking-entrance</strong> : compté depuis les POIs labellisés.</li>
            </ul>
            <p className="mt-2 text-slate-400">Les emplacements proposés utilisent les centroïdes des espaces concernés ou un échantillonnage uniforme dans les circulations. Tu peux ajuster manuellement chaque panneau après placement (drag-and-drop).</p>
          </section>
        </div>
      </div>
    </div>
  )
}

function PinsVisibilityToggle() {
  // Charge dynamiquement pour éviter cycle d'import
  const [visible, setVisibleLocal] = useState(true)
  const handleToggle = async () => {
    const { useSignagePlanPinsStore } = await import('../../stores/signagePlanPinsStore')
    const next = !useSignagePlanPinsStore.getState().visible
    useSignagePlanPinsStore.getState().setVisible(next)
    setVisibleLocal(next)
  }
  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2 py-2 rounded text-[10px] font-semibold border ${
        visible
          ? 'bg-emerald-700 text-white border-emerald-400'
          : 'bg-surface-0 text-slate-400 border-white/10 hover:text-white'
      }`}
      title="Afficher / masquer les pins de propositions sur le plan"
    >
      📍 {visible ? 'Pins visibles' : 'Pins masqués'}
    </button>
  )
}

function downloadHtmlReport(result: Proph3tResult<RecommendSignagePlanPayload>) {
  const p = result.payload
  const now = new Date().toLocaleString('fr-FR')
  const css = `
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 24px auto; padding: 0 16px; color: #0f172a; }
    h1 { color: #0e7490; border-bottom: 3px solid #0e7490; padding-bottom: 8px; }
    h2 { color: #1e40af; margin-top: 28px; }
    h3 { color: #475569; }
    .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 16px 0; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; }
    .kpi-value { font-size: 22px; font-weight: bold; color: #0e7490; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
    th { background: #1e40af; color: #fff; text-align: left; padding: 6px 8px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
    tr.erp { border-left: 3px solid #dc2626; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
    .badge-erp { background: #fee2e2; color: #991b1b; }
    .badge-p1 { background: #fee2e2; color: #991b1b; }
    .badge-p2 { background: #fef3c7; color: #92400e; }
    .badge-p3 { background: #dbeafe; color: #1e40af; }
    .zone { display: inline-block; background: #ecfdf5; color: #065f46; padding: 1px 5px; border-radius: 3px; font-size: 9px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; }
  `
  const erpStatus = p.erpCompliancePct >= 100 ? 'Conforme' : p.erpCompliancePct >= 80 ? 'Partiellement conforme' : 'Non conforme'
  const pinRows = p.recommendations.flatMap(rec =>
    rec.suggestedLocations.map((loc, i) => ({
      code: rec.code, label: rec.meta.label, erp: rec.meta.erpRequired, prio: rec.meta.priority,
      i: i + 1, x: loc.x.toFixed(1), y: loc.y.toFixed(1),
      zone: loc.zoneLabel ?? '—', reason: loc.reason,
      cost: rec.meta.priceFcfa,
    })),
  )
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Plan signalétique — Rapport Prophet</title><style>${css}</style></head>
<body>
  <h1>📋 Plan signalétique — Rapport Prophet</h1>
  <p>Généré le ${now} · Conformité ERP : <strong>${erpStatus}</strong> (${p.erpCompliancePct.toFixed(0)}%)</p>

  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total requis</div><div class="kpi-value">${p.totalRequired}</div></div>
    <div class="kpi"><div class="kpi-label">Déjà placés</div><div class="kpi-value" style="color:#059669">${p.totalCurrent}</div></div>
    <div class="kpi"><div class="kpi-label">Manquants</div><div class="kpi-value" style="color:#d97706">${p.totalMissing}</div></div>
    <div class="kpi"><div class="kpi-label">Budget total</div><div class="kpi-value">${(p.totalCostFcfa / 1_000_000).toFixed(1)} M FCFA</div></div>
    <div class="kpi"><div class="kpi-label">Budget restant</div><div class="kpi-value" style="color:#d97706">${(p.costMissingFcfa / 1_000_000).toFixed(1)} M FCFA</div></div>
  </div>

  <h2>🗺️ Zones du plan détectées</h2>
  <table><thead><tr><th>Zone</th><th>Espaces</th><th>Aire (m²)</th><th>Panneaux planifiés</th><th>Top types</th></tr></thead><tbody>
    ${p.zoneSummary.map(z => `<tr><td>${z.label}</td><td>${z.spaceCount}</td><td>${z.areaSqm.toFixed(0)}</td><td>${z.plannedSignsCount}</td>
      <td>${z.topTypes.map(t => `${t.code} ×${t.qty}`).join(' · ')}</td></tr>`).join('')}
  </tbody></table>

  <h2>🔍 Inventaire détection Prophet</h2>
  <h3>Sanitaires (${p.detectionInventory.wcs.length})</h3>
  <p>${p.detectionInventory.wcs.length === 0 ? '<em>Aucun sanitaire détecté.</em>' : p.detectionInventory.wcs.map(s => `${s.label || s.id} (${s.areaSqm.toFixed(0)}m²)`).join(' · ')}</p>
  <h3>Ascenseurs (${p.detectionInventory.elevators.length})</h3>
  <p>${p.detectionInventory.elevators.length === 0 ? '<em>Aucun ascenseur détecté.</em>' : p.detectionInventory.elevators.map(s => `${s.label || s.id} (${s.areaSqm.toFixed(0)}m²)`).join(' · ')}</p>
  <h3>Escalators (${p.detectionInventory.escalators.length})</h3>
  <p>${p.detectionInventory.escalators.length === 0 ? '<em>Aucun escalator détecté.</em>' : p.detectionInventory.escalators.map(s => `${s.label || s.id} (${s.areaSqm.toFixed(0)}m²)`).join(' · ')}</p>
  <h3>Entrées (${p.detectionInventory.entrances.length})</h3>
  <p>${p.detectionInventory.entrances.length === 0 ? '<em>Aucune entrée — placements par défaut au centre.</em>' : p.detectionInventory.entrances.map(e => e.label).join(' · ')}</p>
  <h3>POIs ancres (${p.detectionInventory.anchors.length})</h3>
  <p>${p.detectionInventory.anchors.length === 0 ? '<em>Aucune ancre P1 — placements directionnels sans cible.</em>' : p.detectionInventory.anchors.map(a => a.label).join(' · ')}</p>

  <h2>📊 Recommandations par type</h2>
  <table><thead><tr>
    <th>Code</th><th>Type</th><th>Priorité</th><th>ERP</th><th>Requis</th><th>Placés</th><th>Manque</th><th>Coût FCFA</th><th>Justification</th>
  </tr></thead><tbody>
    ${p.recommendations.map(r => `<tr class="${r.meta.erpRequired ? 'erp' : ''}">
      <td><strong>${r.code}</strong></td>
      <td>${r.meta.label}</td>
      <td><span class="badge badge-${r.meta.priority.toLowerCase()}">${r.meta.priority}</span></td>
      <td>${r.meta.erpRequired ? '<span class="badge badge-erp">ERP</span>' : '—'}</td>
      <td>${r.requiredQty}</td>
      <td>${r.currentQty}</td>
      <td>${r.missingQty > 0 ? `<strong style="color:#d97706">${r.missingQty}</strong>` : '✓ 0'}</td>
      <td>${r.costMissingFcfa.toLocaleString('fr-FR')}</td>
      <td>${r.rationale}</td>
    </tr>`).join('')}
  </tbody></table>

  <h2>📍 Détail des emplacements proposés (${pinRows.length} pins)</h2>
  <p>Chaque ligne correspond à un panneau à placer. Les coordonnées sont en mètres dans le repère du plan.</p>
  <table><thead><tr>
    <th>#</th><th>Code</th><th>Type</th><th>P</th><th>ERP</th><th>X (m)</th><th>Y (m)</th><th>Zone</th><th>Raison / cible</th><th>Coût FCFA</th>
  </tr></thead><tbody>
    ${pinRows.slice(0, 1000).map((pin, idx) => `<tr class="${pin.erp ? 'erp' : ''}">
      <td>${idx + 1}</td>
      <td><strong>${pin.code}</strong></td>
      <td>${pin.label}</td>
      <td><span class="badge badge-${pin.prio.toLowerCase()}">${pin.prio}</span></td>
      <td>${pin.erp ? '<span class="badge badge-erp">ERP</span>' : '—'}</td>
      <td>${pin.x}</td>
      <td>${pin.y}</td>
      <td><span class="zone">${pin.zone}</span></td>
      <td style="font-size:10px">${pin.reason}</td>
      <td>${pin.cost.toLocaleString('fr-FR')}</td>
    </tr>`).join('')}
  </tbody></table>
  ${pinRows.length > 1000 ? `<p><em>... et ${pinRows.length - 1000} autres pins (limite affichage).</em></p>` : ''}

  <div class="footer">
    Rapport généré par Prophet (Atlas BIM) · Skill : recommendSignagePlan ·
    Source : SIGNAGE_CATALOG (25 types ERP) · Confiance : ${(result.confidence.score * 100).toFixed(0)}%
  </div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plan-signaletique-prophet-${new Date().toISOString().slice(0, 10)}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function DetectionGroup({
  label, items, emptyLabel, hideArea, extraNote,
}: {
  label: string
  items: Array<{ id: string; label: string; type?: string; areaSqm: number }>
  emptyLabel: string
  hideArea?: boolean
  extraNote?: string
}) {
  return (
    <div className="rounded border border-white/10 bg-surface-0 p-2">
      <div className="text-[10px] font-bold text-white mb-1">
        {label} <span className="text-amber-300 font-mono">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="text-[9px] text-rose-300 italic">{emptyLabel}</div>
      ) : (
        <ul className="space-y-0.5 max-h-[80px] overflow-y-auto">
          {items.map(item => (
            <li key={item.id} className="text-[9px] text-slate-400 flex items-baseline justify-between gap-1">
              <span className="truncate">{item.label || item.id}</span>
              {!hideArea && item.areaSqm > 0 && (
                <span className="text-slate-500 font-mono shrink-0">{item.areaSqm.toFixed(0)}m²</span>
              )}
            </li>
          ))}
          {extraNote && <li className="text-[9px] text-slate-500 italic">{extraNote}</li>}
        </ul>
      )}
    </div>
  )
}

function FilterTab({
  active, onClick, label, missing, required, highlight,
}: {
  active: boolean
  onClick: () => void
  label: string
  missing: number
  required: number
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-semibold transition border ${
        active
          ? highlight
            ? 'bg-emerald-700 text-white border-emerald-400'
            : 'bg-cyan-700 text-white border-cyan-400'
          : highlight
            ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30 hover:bg-emerald-950/60'
            : 'bg-surface-0 text-slate-300 border-white/10 hover:bg-slate-800'
      }`}
    >
      <span>{label}</span>
      {required > 0 && (
        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/20">
          {required - missing}/{required}
          {missing > 0 && <span className="text-amber-300 ml-1">·{missing} manque</span>}
        </span>
      )}
    </button>
  )
}

function Kpi({ label, value, unit, color }: { label: string; value: number | string; unit: string; color: 'cyan' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colorMap = {
    cyan: 'text-cyan-300 border-cyan-500/30 bg-cyan-950/20',
    emerald: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20',
    amber: 'text-amber-300 border-amber-500/30 bg-amber-950/20',
    slate: 'text-slate-300 border-slate-500/30 bg-surface-0',
    rose: 'text-rose-300 border-rose-500/30 bg-rose-950/20',
  }
  return (
    <div className={`rounded-lg border ${colorMap[color]} p-3`}>
      <div className="text-[9px] uppercase text-slate-500 tracking-widest">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}<span className="text-xs text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  )
}

function ScoreCard({ label, value, max, extra }: { label: string; value: number; max: number; extra?: string }) {
  const pct = (value / max) * 100
  const color = pct >= 75 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20'
    : pct >= 50 ? 'text-amber-300 border-amber-500/30 bg-amber-950/20'
    : 'text-rose-300 border-rose-500/30 bg-rose-950/20'
  return (
    <div className={`rounded-lg border ${color} p-3`}>
      <div className="text-[9px] uppercase text-slate-500 tracking-widest">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}<span className="text-sm text-slate-500 ml-1">/{max}</span>
      </div>
      {extra && <div className="text-[10px] text-slate-400 mt-0.5">{extra}</div>}
    </div>
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
