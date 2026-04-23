// ═══ PlanLayerSelector — Selecteur et superposition de plans ═══
// Permet de choisir quel plan afficher en fond et d'en superposer plusieurs

import { useState } from 'react'
import { Layers, Eye, EyeOff, Plus, Trash2, Image, Check } from 'lucide-react'
import { usePlanImportStore, type PlanImportRecord } from '../stores/planImportStore'

interface PlanLayerSelectorProps {
  floorId: string
  /** Callback quand le plan principal change (pour les stores vol1/vol2) */
  onPrimaryPlanChange?: (planImageUrl: string) => void
}

export function PlanLayerSelector({ floorId, onPrimaryPlanChange }: PlanLayerSelectorProps) {
  const [open, setOpen] = useState(false)

  const imports = usePlanImportStore(s => s.imports)
  const activePlanPerFloor = usePlanImportStore(s => s.activePlanPerFloor)
  const layersPerFloor = usePlanImportStore(s => s.layersPerFloor)
  const setActivePlan = usePlanImportStore(s => s.setActivePlan)
  const addLayer = usePlanImportStore(s => s.addLayer)
  const removeLayer = usePlanImportStore(s => s.removeLayer)
  const setLayerOpacity = usePlanImportStore(s => s.setLayerOpacity)
  const toggleLayerVisibility = usePlanImportStore(s => s.toggleLayerVisibility)

  const floorImports = imports.filter(r => r.floorId === floorId && r.status === 'success')
  const activePlanId = activePlanPerFloor[floorId]
  const layers = layersPerFloor[floorId] ?? []

  if (floorImports.length === 0) return null

  const handleSetPrimary = (record: PlanImportRecord) => {
    setActivePlan(floorId, record.id)
    if (record.planImageUrl && onPrimaryPlanChange) {
      onPrimaryPlanChange(record.planImageUrl)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/[0.08] bg-surface-2 text-slate-400 hover:text-white hover:border-white/[0.15] transition-colors"
        title="Gestion des plans"
      >
        <Layers size={13} />
        Plans ({floorImports.length})
        {layers.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-atlas-600 text-white text-[9px] flex items-center justify-center">
            {layers.filter(l => l.visible).length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 rounded-xl border border-white/[0.08] bg-surface-2 shadow-2xl z-40 animate-fade-in">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <p className="text-[11px] font-semibold text-white">Plans disponibles</p>
            <p className="text-[9px] text-slate-600">Selectionnez le plan principal et superposez des couches</p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {floorImports.map(record => {
              const isPrimary = record.id === activePlanId
              const layer = layers.find(l => l.importId === record.id)
              const isOverlay = !!layer

              return (
                <div key={record.id} className={`rounded-lg p-2 border transition-colors ${
                  isPrimary ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-white/[0.04] hover:border-white/[0.1]'
                }`}>
                  <div className="flex items-center gap-2">
                    <Image size={14} className="text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white truncate">{record.fileName}</p>
                      <p className="text-[9px] text-slate-600">
                        {record.sourceType.toUpperCase()} · {record.zonesDetected} zones · {new Date(record.importedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Definir comme plan principal */}
                      <button
                        onClick={() => handleSetPrimary(record)}
                        className={`p-1 rounded text-[9px] ${isPrimary ? 'text-emerald-400' : 'text-slate-600 hover:text-white'}`}
                        title={isPrimary ? 'Plan principal actif' : 'Definir comme plan principal'}
                      >
                        {isPrimary ? <Check size={12} /> : <Image size={12} />}
                      </button>

                      {/* Ajouter/retirer en superposition */}
                      {!isPrimary && (
                        <button
                          onClick={() => isOverlay ? removeLayer(floorId, record.id) : addLayer(floorId, record.id)}
                          className={`p-1 rounded text-[9px] ${isOverlay ? 'text-atlas-400' : 'text-slate-600 hover:text-white'}`}
                          title={isOverlay ? 'Retirer la superposition' : 'Superposer ce plan'}
                        >
                          {isOverlay ? <Trash2 size={12} /> : <Plus size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Controle d'opacite si le plan est en superposition */}
                  {isOverlay && layer && (
                    <div className="flex items-center gap-2 mt-2 pl-5">
                      <button
                        onClick={() => toggleLayerVisibility(floorId, record.id)}
                        className="text-slate-500 hover:text-white"
                      >
                        {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(layer.opacity * 100)}
                        onChange={e => setLayerOpacity(floorId, record.id, parseInt(e.target.value) / 100)}
                        className="flex-1 h-1 accent-atlas-500"
                      />
                      <span className="text-[9px] text-slate-500 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {floorImports.length === 0 && (
            <div className="p-4 text-center text-[11px] text-slate-600">
              Aucun plan importe pour cet etage
            </div>
          )}
        </div>
      )}
    </div>
  )
}
