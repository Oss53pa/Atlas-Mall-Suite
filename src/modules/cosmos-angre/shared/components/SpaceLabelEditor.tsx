// ═══ SPACE LABEL EDITOR — modale pour corriger la labelisation d'un espace ═══
// Ouverte au clic sur un espace dans l'overlay d'info. Permet de :
//   - Renommer l'espace (customLabel)
//   - Changer sa catégorie métier (SpaceCategory)
//   - Ajouter des notes
//   - Marquer comme exclu de l'analyse parcours
// Persiste via useSpaceCorrectionsStore (localStorage).

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Trash2, AlertTriangle } from 'lucide-react'
import {
  useSpaceCorrectionsStore,
  SPACE_CATEGORIES,
  CATEGORY_META,
  type SpaceCategory,
} from '../stores/spaceCorrectionsStore'

export interface LabeledSpace {
  id: string
  label: string
  type?: string
  areaSqm: number
  polygon: [number, number][]
  floorId?: string
}

/** @deprecated Renommé en `LabeledSpace` pour éviter la collision avec
 *  `EditableSpace` de `SpaceEditorCanvas`. Conservé temporairement pour
 *  les imports historiques. À supprimer après migration complète. */
export type EditableSpace = LabeledSpace

interface Props {
  space: LabeledSpace | null
  /** Catégorie détectée automatiquement (fallback si pas corrigée). */
  autoCategory?: SpaceCategory
  onClose: () => void
}

function bboxOf(poly: [number, number][]): { w: number; h: number } {
  if (!poly.length) return { w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return { w: maxX - minX, h: maxY - minY }
}

export function SpaceLabelEditor({ space, autoCategory, onClose }: Props) {
  const store = useSpaceCorrectionsStore()
  const existing = space ? store.get(space.id) : undefined

  const [customLabel, setCustomLabel] = useState('')
  const [category, setCategory] = useState<SpaceCategory | ''>('')
  const [notes, setNotes] = useState('')
  const [excluded, setExcluded] = useState(false)

  // Reset form à l'ouverture / au changement de space
  useEffect(() => {
    if (!space) return
    setCustomLabel(existing?.customLabel ?? '')
    setCategory(existing?.category ?? autoCategory ?? '')
    setNotes(existing?.notes ?? '')
    setExcluded(existing?.excluded ?? false)
  }, [space?.id, existing, autoCategory])

  // Esc pour fermer
  useEffect(() => {
    if (!space) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [space, onClose])

  if (!space) return null

  const bbox = bboxOf(space.polygon)

  const handleSave = () => {
    store.setCorrection(space.id, {
      customLabel: customLabel.trim() || undefined,
      category: category || undefined,
      notes: notes.trim() || undefined,
      excluded: excluded || undefined,
    })

    // ─── Mémoire inter-projets : enregistrer chaque correction comme pattern ──
    // Un pattern ne sera réutilisé sur un futur projet que s'il matche le
    // trigger_key (label DXF normalisé). Pas de personnalisation sensible.
    if (space.label) {
      void (async () => {
        try {
          const { recordPattern } = await import('../services/signageMemoryService')
          if (customLabel.trim() && customLabel.trim() !== space.label) {
            await recordPattern({
              pattern_type: 'label-correction',
              trigger_raw: space.label,
              trigger_context: { areaSqm: space.areaSqm, type: space.type },
              applied_value: { label: customLabel.trim() },
            })
          }
          if (category && category !== autoCategory) {
            await recordPattern({
              pattern_type: 'category-correction',
              trigger_raw: space.label,
              trigger_context: { areaSqm: space.areaSqm, type: space.type },
              applied_value: { category },
            })
          }
          if (excluded) {
            await recordPattern({
              pattern_type: 'exclusion',
              trigger_raw: space.label,
              trigger_context: { areaSqm: space.areaSqm, type: space.type },
              applied_value: { reason: notes.trim() || 'Exclu manuellement' },
            })
          }
        } catch (err) {
           
          console.warn('[SpaceLabelEditor] Pattern recording failed:', err)
        }
      })()
    }

    onClose()
  }

  const handleReset = () => {
    store.removeCorrection(space.id)
    onClose()
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
          <div>
            <h3 className="text-sm font-semibold text-white">Corriger la labelisation</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ID : <span className="font-mono">{space.id.slice(0, 8)}</span> · Étage : {space.floorId ?? 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Infos brutes */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-white/5 text-[11px] text-slate-400 grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-600 uppercase text-[9px] tracking-wider">Label DXF</div>
            <div className="text-slate-300 font-mono text-[11px] truncate" title={space.label}>
              {space.label || '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-600 uppercase text-[9px] tracking-wider">Type DXF</div>
            <div className="text-slate-300 font-mono text-[11px]">{space.type ?? '—'}</div>
          </div>
          <div>
            <div className="text-slate-600 uppercase text-[9px] tracking-wider">Surface</div>
            <div className="text-slate-300 tabular-nums">{space.areaSqm.toFixed(1)} m²</div>
          </div>
          <div>
            <div className="text-slate-600 uppercase text-[9px] tracking-wider">Dimensions</div>
            <div className="text-slate-300 tabular-nums">
              {bbox.w.toFixed(1)} × {bbox.h.toFixed(1)} m
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Custom label */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Nom lisible (remplace le label DXF)
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={space.label || 'ex : Boutique Orange'}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Catégorie métier (pour le parcours client)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SPACE_CATEGORIES.map(c => {
                const meta = CATEGORY_META[c]
                const isSelected = category === c
                const isAuto = !category && autoCategory === c
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] text-left transition-all border ${
                      isSelected
                        ? 'border-white/30 bg-white/10'
                        : isAuto
                        ? 'border-dashed border-white/20 bg-white/[0.03] opacity-80'
                        : 'border-white/[0.06] bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="flex-1 truncate">{meta.label}</span>
                    {isAuto && <span className="text-[9px] text-slate-500">auto</span>}
                    {isSelected && <span className="text-[9px] text-emerald-400 font-semibold">✓</span>}
                  </button>
                )
              })}
            </div>
            {category && autoCategory && category !== autoCategory && (
              <div className="mt-1.5 text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Correction : auto = <span className="font-semibold">{CATEGORY_META[autoCategory].label}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Notes (facultatif)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="ex : en rénovation, pop-up store saisonnier…"
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-white/10 text-slate-300 text-[11px] focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Excluded */}
          <label className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-950/30 border border-red-900/40 cursor-pointer">
            <input
              type="checkbox"
              checked={excluded}
              onChange={(e) => setExcluded(e.target.checked)}
              className="mt-0.5 accent-red-500"
            />
            <div>
              <div className="text-[11px] font-medium text-red-300">Exclure de l'analyse parcours</div>
              <div className="text-[10px] text-red-400/80 mt-0.5">
                PROPH3T ne visitera pas ce space. À cocher pour les faux commerces (cages d'escalier, locaux techniques mal labelisés…).
              </div>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/40 sticky bottom-0">
          {existing ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          ) : (
            <span className="text-[10px] text-slate-600">Aucune correction</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
            >
              <Save className="w-3.5 h-3.5" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
