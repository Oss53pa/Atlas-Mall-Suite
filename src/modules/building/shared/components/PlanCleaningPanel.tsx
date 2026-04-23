// ═══ PLAN CLEANING PANEL ═══
// Modale de nettoyage du plan (Minimal / Standard / Complet + overrides manuels).
// Affiche l'analyse par calque avec aperçu avant/après en une passe.

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Check, Layers, AlertTriangle } from 'lucide-react'
import {
  computeCleaningPlan,
  applyCleaningPlan,
  summarizeCleaning,
  CLEANING_LEVEL_META,
  ROLE_META,
  type CleaningLevel,
  type CleaningPlan,
} from '../engines/plan-analysis/layerCleaningEngine'
import type { ParsedPlan } from '../planReader/planEngineTypes'

interface Props {
  plan: ParsedPlan
  onClose: () => void
  onApply: (cleanedPlan: ParsedPlan) => void
}

export function PlanCleaningPanel({ plan, onClose, onApply }: Props) {
  const [level, setLevel] = useState<CleaningLevel>('standard')
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const cleaning: CleaningPlan = useMemo(
    () => computeCleaningPlan(plan, level, overrides),
    [plan, level, overrides],
  )
  const summary = useMemo(() => summarizeCleaning(cleaning), [cleaning])

  const toggleOverride = (layerName: string, current: boolean) => {
    setOverrides(o => ({ ...o, [layerName]: !current }))
  }

  const handleApply = () => {
    const cleaned = applyCleaningPlan(plan, cleaning)
    onApply(cleaned)
    onClose()
  }

  const handleReset = () => setOverrides({})

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[880px] max-w-[95vw] max-h-[90vh] bg-surface-1 rounded-xl border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-atlas-400" />
            <h2 className="text-sm font-bold text-white">Nettoyage du plan</h2>
            <span className="text-[10px] text-slate-500">
              {cleaning.stats.totalLayers} calques · {cleaning.stats.keptEntities + cleaning.stats.removedEntities} entités
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Curseur niveau */}
        <div className="p-5 border-b border-white/5 bg-surface-0/40">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Niveau de simplification</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CLEANING_LEVEL_META) as CleaningLevel[]).map(lv => {
              const meta = CLEANING_LEVEL_META[lv]
              const selected = level === lv
              return (
                <button
                  key={lv}
                  onClick={() => { setLevel(lv); setOverrides({}) }}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected
                      ? 'border-atlas-500 bg-indigo-950/40 text-white'
                      : 'border-white/10 bg-surface-1 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{meta.label}</span>
                    {selected && <Check className="w-4 h-4 text-atlas-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{meta.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Résumé chiffré */}
        <div className="px-5 py-3 border-b border-white/5 bg-surface-0/20 grid grid-cols-4 gap-3 text-[11px]">
          <div>
            <div className="text-slate-500 uppercase text-[9px] tracking-wider">Conservés</div>
            <div className="text-emerald-400 font-bold text-base tabular-nums">
              {cleaning.stats.keptCount}<span className="text-slate-500 text-[10px]">/{cleaning.stats.totalLayers}</span>
            </div>
            <div className="text-[10px] text-slate-500">{cleaning.stats.keptEntities} entités</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase text-[9px] tracking-wider">Retirés</div>
            <div className="text-red-400 font-bold text-base tabular-nums">
              {cleaning.stats.removedCount}
            </div>
            <div className="text-[10px] text-slate-500">-{cleaning.stats.removedEntities} entités</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase text-[9px] tracking-wider">Compression</div>
            <div className="text-blue-400 font-bold text-base tabular-nums">
              {((1 - summary.keptRatio) * 100).toFixed(0)} %
            </div>
            <div className="text-[10px] text-slate-500">gain parcours</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase text-[9px] tracking-wider">Alertes</div>
            <div className={`font-bold text-base tabular-nums ${summary.warnings.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {summary.warnings.length}
            </div>
            <div className="text-[10px] text-slate-500">rôles critiques</div>
          </div>
        </div>

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <div className="px-5 py-2 border-b border-white/5 bg-amber-950/30">
            {summary.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-amber-200">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Liste des calques */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {cleaning.classifications.map(c => {
              const meta = ROLE_META[c.role]
              const isOverridden = overrides[c.name] !== undefined
              return (
                <button
                  key={c.name}
                  onClick={() => toggleOverride(c.name, c.kept)}
                  className={`text-left px-2.5 py-2 rounded-md border transition-all text-[11px] ${
                    c.kept
                      ? 'border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40'
                      : 'border-red-900/60 bg-red-950/20 hover:bg-red-950/40'
                  } ${isOverridden ? 'ring-1 ring-purple-500/60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.kept ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <code className="font-mono text-[10px] text-slate-200 truncate" title={c.name}>
                          {c.name}
                        </code>
                        {isOverridden && <span className="text-[8px] text-atlas-400 font-bold">M</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {meta.label} · {c.entityCount} entités
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">Clic sur un calque = forcer conserver/retirer</span>
            {Object.keys(overrides).length > 0 && (
              <button
                onClick={handleReset}
                className="text-[10px] text-atlas-400 hover:text-atlas-300"
              >
                Réinitialiser {Object.keys(overrides).length} override(s)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-semibold bg-gradient-to-r from-atlas-500 to-blue-600 text-white hover:opacity-90"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Appliquer le nettoyage
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
