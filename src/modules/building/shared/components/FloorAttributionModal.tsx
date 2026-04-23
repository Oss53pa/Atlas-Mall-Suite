// ═══ FLOOR ATTRIBUTION MODAL — Hybride strict ═══
// Apparaît juste après la détection DBSCAN. Le système a trouvé N clusters
// géométriques mais l'utilisateur DOIT nommer explicitement chaque étage
// (B2 / B1 / PARKING / RDJ / RDC / MEZZ / R+1 / R+2 / R+3 / ROOF).

import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Info, ArrowRight, Layers } from 'lucide-react'
import { FloorLevel, FLOOR_LABEL_FR, FLOOR_STACK_ORDER } from '../domain/FloorLevel'
import type { DetectedFloor } from '../planReader/planEngineTypes'

export interface FloorAttribution {
  /** ID technique du cluster (ex: 'cluster-0'). */
  clusterId: string
  /** Libellé affiché à l'utilisateur pendant la sélection. */
  displayLabel: string
  /** FloorLevel canonique choisi (null = à nommer). */
  level: FloorLevel | null
  /** Bounds originaux du cluster. */
  bounds: DetectedFloor['bounds']
  /** Nb d'entités dans ce cluster. */
  entityCount: number
  /** Utilisateur a coché "ignorer/supprimer cet étage". */
  ignored: boolean
}

interface Props {
  open: boolean
  /** Clusters détectés par DBSCAN. */
  detectedClusters: DetectedFloor[]
  /** Vignette optionnelle pour visualiser chaque cluster. */
  thumbnailForCluster?: (clusterId: string) => string | null
  /** Callback validation — reçoit la liste définitive d'étages nommés (sans ignorés). */
  onConfirm: (attributions: Array<FloorAttribution & { level: FloorLevel }>) => void
  onCancel: () => void
}

// Options affichables par ordre physique (bas → haut)
const LEVEL_OPTIONS: Array<{ value: FloorLevel; label: string }> = [
  FloorLevel.B2, FloorLevel.B1, FloorLevel.PARKING,
  FloorLevel.RDJ, FloorLevel.RDC, FloorLevel.MEZZ,
  FloorLevel.R1, FloorLevel.R2, FloorLevel.R3, FloorLevel.ROOF,
].map(v => ({ value: v, label: FLOOR_LABEL_FR[v] + ' (' + v + ')' }))

export function FloorAttributionModal({ open, detectedClusters, thumbnailForCluster, onConfirm, onCancel }: Props) {
  // État initial : un slot par cluster, aucun level par défaut (strict)
  const [attributions, setAttributions] = useState<FloorAttribution[]>(() =>
    detectedClusters.map((c, i) => ({
      clusterId: c.id,
      displayLabel: `Zone ${i + 1}`,
      level: null,
      bounds: c.bounds,
      entityCount: c.entityCount,
      ignored: false,
    })),
  )

  // Re-sync si le nb de clusters change
  React.useEffect(() => {
    setAttributions(detectedClusters.map((c, i) => ({
      clusterId: c.id,
      displayLabel: `Zone ${i + 1}`,
      level: null,
      bounds: c.bounds,
      entityCount: c.entityCount,
      ignored: false,
    })))
  }, [detectedClusters])

  const usedLevels = useMemo(() => new Set(attributions.filter(a => !a.ignored && a.level).map(a => a.level)), [attributions])
  const canConfirm = attributions.filter(a => !a.ignored).every(a => a.level !== null)
    && attributions.some(a => !a.ignored)
  const duplicateLevels = attributions.filter(a => !a.ignored && a.level).filter(
    (a, i, arr) => arr.findIndex(b => b.level === a.level) !== i,
  )

  const setLevel = (clusterId: string, level: FloorLevel | null) => {
    setAttributions(prev => prev.map(a => a.clusterId === clusterId ? { ...a, level } : a))
  }
  const toggleIgnore = (clusterId: string) => {
    setAttributions(prev => prev.map(a => a.clusterId === clusterId
      ? { ...a, ignored: !a.ignored, level: !a.ignored ? null : a.level }
      : a))
  }

  const handleConfirm = () => {
    const active = attributions.filter(a => !a.ignored && a.level) as Array<FloorAttribution & { level: FloorLevel }>
    // Tri par stack order (bas → haut) avant confirmation
    active.sort((a, b) => FLOOR_STACK_ORDER[a.level] - FLOOR_STACK_ORDER[b.level])
    onConfirm(active)
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 bg-surface-0/85 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99998 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] rounded-xl bg-surface-0 border border-cyan-500/40 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-cyan-950/40 to-surface-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center">
              <Layers size={18} className="text-cyan-300" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">Attribuer un niveau à chaque zone détectée</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PROPH3T a détecté {detectedClusters.length} zone(s) géométrique(s) — nommez-les ou ignorez-les
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/[0.05] rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Info strip */}
        <div className="px-5 py-2 border-b border-white/[0.06] bg-blue-950/20 flex items-start gap-2">
          <Info size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-[10px] text-blue-200 leading-relaxed">
            <strong>Mode hybride strict :</strong> la détection géométrique est donnée à titre indicatif. Vous devez <strong>choisir explicitement</strong> le niveau de chaque zone (B1, RDC, R+1…) ou cocher "Ignorer" pour la retirer du plan. Chaque niveau ne peut être utilisé qu'une seule fois.
          </div>
        </div>

        {/* List clusters */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {attributions.map((a, i) => {
            const isDup = duplicateLevels.includes(a)
            return (
              <div
                key={a.clusterId}
                className={`rounded-lg border p-3 transition-colors ${
                  a.ignored ? 'border-red-500/20 bg-red-950/20 opacity-50' :
                  !a.level ? 'border-amber-500/30 bg-amber-950/10' :
                  isDup ? 'border-red-500/40 bg-red-950/30' :
                  'border-emerald-500/30 bg-emerald-950/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Vignette si dispo */}
                  {thumbnailForCluster?.(a.clusterId) ? (
                    <img
                      src={thumbnailForCluster(a.clusterId) ?? ''}
                      alt={`Zone ${i + 1}`}
                      className="w-20 h-20 rounded border border-white/[0.1] bg-surface-1 object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded border border-white/[0.1] bg-surface-1 flex items-center justify-center text-[10px] text-slate-600">
                      Zone {i + 1}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-white">{a.displayLabel}</span>
                      <span className="text-[9px] text-slate-500">
                        {a.bounds.width.toFixed(0)}×{a.bounds.height.toFixed(0)} m · {a.entityCount} entités
                      </span>
                    </div>

                    {a.ignored ? (
                      <div className="mt-2 text-[11px] text-red-400">
                        ✕ Cette zone sera ignorée (supprimée du plan)
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500">Niveau</label>
                          <select
                            value={a.level ?? ''}
                            onChange={(e) => setLevel(a.clusterId, e.target.value ? (e.target.value as FloorLevel) : null)}
                            className={`text-[11px] px-2 py-1 rounded bg-surface-1 border outline-none ${
                              !a.level ? 'border-amber-500/50 text-amber-200' :
                              isDup ? 'border-red-500/60 text-red-200' :
                              'border-emerald-500/40 text-emerald-200'
                            }`}
                          >
                            <option value="">— Choisir —</option>
                            {LEVEL_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}
                                disabled={usedLevels.has(opt.value) && a.level !== opt.value}>
                                {opt.label}{usedLevels.has(opt.value) && a.level !== opt.value ? ' (déjà utilisé)' : ''}
                              </option>
                            ))}
                          </select>
                          {!a.level && <span className="text-[10px] text-amber-400">Requis</span>}
                          {isDup && <span className="text-[10px] text-red-400">Niveau dupliqué</span>}
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => toggleIgnore(a.clusterId)}
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          a.ignored
                            ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 border border-white/[0.06] text-slate-400 hover:text-red-400 hover:border-red-500/40'
                        }`}
                      >
                        {a.ignored ? '↺ Réactiver' : '✕ Ignorer cette zone'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-surface-1/40 flex items-center justify-between">
          <div className="text-[10px] text-slate-500">
            {attributions.filter(a => !a.ignored && a.level).length} / {attributions.filter(a => !a.ignored).length} niveaux nommés
            {duplicateLevels.length > 0 && <span className="text-red-400 ml-2">· {duplicateLevels.length} doublon(s)</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="px-3 py-1.5 rounded text-[11px] bg-slate-800 text-slate-300 hover:bg-slate-700">
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || duplicateLevels.length > 0}
              className="flex items-center gap-1 px-4 py-1.5 rounded text-[11px] font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white disabled:opacity-40"
            >
              <Check size={12} />
              Valider les niveaux
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
