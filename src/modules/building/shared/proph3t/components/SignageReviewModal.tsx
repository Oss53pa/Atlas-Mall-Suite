// ═══ SIGNAGE REVIEW MODAL — Walkthrough humain pour valider/corriger ═══
//
// Quand Proph3t hésite (confidence < 0.55), il marque les panneaux
// `needsReview: true`. Cette modale présente chaque doute un par un :
//   • Affiche le panneau, sa raison, sa raison de doute
//   • Position courante avec aperçu
//   • Boutons : Valider / Corriger (active drag) / Changer type / Supprimer
//
// L'utilisateur traverse la liste, chaque action met à jour le store
// (markReviewed, updatePosition, updateKind, remove).

import { useState, useMemo, useEffect } from 'react'
import { Check, X, Trash2, Move, ArrowLeft, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useSignagePlacementStore, type PlacedSign } from '../../stores/signagePlacementStore'
import { useActiveProjectId } from '../../../../../hooks/useActiveProject'
import {
  resolveSignageKind,
  SIGNAGE_CATALOG,
  SIGNAGE_CODES_BY_CATEGORY,
  SIGNAGE_CATEGORY_META,
  type SignageCategoryKey,
} from '../libraries/signageCatalog'

interface Props {
  open: boolean
  onClose: () => void
  /** Callback : déclencher mode drag focalisé sur ce sign id (le user déplacera). */
  onStartCorrection?: (signId: string) => void
}

export function SignageReviewModal({ open, onClose, onStartCorrection }: Props) {
  const projectId = useActiveProjectId()
  const allSigns = useSignagePlacementStore(s => s.signs)
  const markReviewed = useSignagePlacementStore(s => s.markReviewed)
  const updateKind = useSignagePlacementStore(s => s.updateKind)
  const removeSign = useSignagePlacementStore(s => s.remove)

  const uncertain = useMemo<PlacedSign[]>(
    () => allSigns.filter(s => s.projectId === projectId && s.needsReview && !s.reviewed),
    [allSigns, projectId],
  )

  const [idx, setIdx] = useState(0)

  // Reset à 0 quand on ouvre, ou clamp si la liste rétrécit
  useEffect(() => {
    if (open) setIdx(0)
  }, [open])
  useEffect(() => {
    if (idx >= uncertain.length && uncertain.length > 0) setIdx(uncertain.length - 1)
  }, [uncertain.length, idx])

  if (!open) return null

  const current = uncertain[idx]
  const allDone = uncertain.length === 0

  const goNext = () => {
    if (idx < uncertain.length - 1) setIdx(idx + 1)
    else onClose()
  }

  const handleValidate = () => {
    if (!current) return
    markReviewed(current.id)
    // Le filter mémoïzé met à jour la liste — current passera au suivant
    if (idx >= uncertain.length - 1) onClose()
  }

  const handleReject = () => {
    if (!current) return
    if (!confirm('Supprimer définitivement ce panneau ?')) return
    removeSign(current.id)
  }

  const handleChangeKind = (k: SignKind) => {
    if (!current) return
    updateKind(current.id, k)
    markReviewed(current.id)
    if (idx >= uncertain.length - 1) onClose()
  }

  const handleCorrectPosition = () => {
    if (!current || !onStartCorrection) return
    onStartCorrection(current.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-amber-500/40 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/30 to-surface-1">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-amber-300" size={20} />
            <div>
              <h2 className="text-lg font-bold text-white">Validation humaine signalétique</h2>
              <p className="text-[11px] text-slate-400">
                {allDone
                  ? 'Tous les doutes ont été traités'
                  : `Proposition ${idx + 1} sur ${uncertain.length} à valider`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {allDone ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/30 border-2 border-emerald-500/50 mb-4">
              <Check className="text-emerald-300" size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Aucun doute restant</h3>
            <p className="text-[12px] text-slate-400 mb-4">Toute la signalétique placée a été validée par toi ou par Proph3t avec haute confiance.</p>
            <button onClick={onClose} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[12px] font-semibold rounded">
              Fermer
            </button>
          </div>
        ) : current ? (
          <div className="p-6 space-y-5">
            {/* Aperçu sign */}
            {(() => {
              const def = resolveSignageKind(current.kind)
              return (
                <div className="rounded-lg border border-white/10 bg-surface-0 p-4 flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl text-white font-bold shrink-0 border-4 border-white/20"
                    style={{ background: def.color }}
                  >
                    {def.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-white">
                      {def.label} <span className="text-[10px] text-slate-500 font-mono">({def.code})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Position : <span className="font-mono">({current.x.toFixed(1)}, {current.y.toFixed(1)}) m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Confiance Proph3t : <span className="text-amber-300 font-bold">{((current.confidence ?? 0.5) * 100).toFixed(0)}%</span>
                      {def.erpRequired && <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-300 text-[9px] font-bold">ERP obligatoire</span>}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Raison + doute */}
            <div className="space-y-2">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                <div className="text-[10px] uppercase font-bold text-cyan-300 mb-1 tracking-wider">Pourquoi ce placement</div>
                <p className="text-[12px] text-slate-200 leading-relaxed">{current.reason}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-300 mb-1 tracking-wider">
                  <AlertTriangle size={11} /> Pourquoi Proph3t hésite
                </div>
                <p className="text-[12px] text-slate-200 leading-relaxed">{current.reviewReason ?? 'Confiance algorithmique faible'}</p>
              </div>
            </div>

            {/* Actions principales */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleValidate}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[12px] font-semibold"
              >
                <Check size={14} /> Valider tel quel
              </button>
              <button
                onClick={handleCorrectPosition}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-semibold"
              >
                <Move size={14} /> Corriger la position
              </button>
            </div>

            {/* Changer type — catalogue complet par catégorie */}
            <ChangeTypeCategoryPicker
              currentKind={current.kind}
              onPick={handleChangeKind}
            />

            {/* Supprimer */}
            <button
              onClick={handleReject}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-[11px] text-rose-300 hover:bg-rose-950/40 border border-rose-500/30"
            >
              <Trash2 size={12} /> Supprimer ce panneau
            </button>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setIdx(Math.max(0, idx - 1))}
                disabled={idx === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ArrowLeft size={12} /> Précédent
              </button>
              <span className="text-[10px] text-slate-500">{idx + 1} / {uncertain.length}</span>
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-300 hover:text-white"
              >
                Passer <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ChangeTypeCategoryPicker({
  currentKind, onPick,
}: {
  currentKind: string
  onPick: (kind: string) => void
}) {
  const currentDef = resolveSignageKind(currentKind)
  const [activeCat, setActiveCat] = useState<SignageCategoryKey>(currentDef.category)
  const codes = SIGNAGE_CODES_BY_CATEGORY[activeCat]
  return (
    <div className="rounded-lg border border-white/10 bg-surface-0 p-3">
      <div className="text-[10px] uppercase text-slate-500 tracking-widest mb-2">Changer le type</div>
      {/* Tabs catégorie */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
        {(Object.keys(SIGNAGE_CATEGORY_META) as SignageCategoryKey[]).map(cat => {
          const meta = SIGNAGE_CATEGORY_META[cat]
          const active = activeCat === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition ${
                active ? 'bg-white/15 text-white' : 'bg-surface-1 text-slate-400 hover:text-white'
              }`}
              style={{ borderLeft: `2px solid ${meta.color}` }}
            >
              {meta.icon} {meta.label}
            </button>
          )
        })}
      </div>
      {/* Grille types */}
      <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto">
        {codes.map(code => {
          const def = SIGNAGE_CATALOG[code]
          const active = currentKind === code
          return (
            <button
              key={code}
              onClick={() => onPick(code)}
              disabled={active}
              className={`flex flex-col items-center px-2 py-2 rounded text-[10px] font-medium border transition ${
                active
                  ? 'bg-white/10 text-white border-white/30 cursor-default'
                  : 'bg-surface-1 text-slate-300 hover:text-white border-white/10'
              }`}
              style={{ borderColor: active ? def.color : undefined }}
              title={`${def.label}\n${def.description}`}
            >
              <span style={{ color: def.color }} className="text-xl leading-none">{def.icon}</span>
              <span className="mt-1 text-center leading-tight font-mono">{def.code}</span>
              {def.erpRequired && (
                <span className="text-[7px] text-rose-300 font-bold mt-0.5">ERP</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
