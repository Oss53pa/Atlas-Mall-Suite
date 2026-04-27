// ═══ PlanModelSelector — dropdown de sélection du modèle actif ═══
//
// Composant compact à injecter dans le header de chaque volume.
// Permet à l'utilisateur de switcher entre les modèles de plan enregistrés
// dans Atlas Studio sans quitter son volume courant.

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, Check, Sparkles, ExternalLink, CheckCircle2, AlertCircle,
  Plus, Layers,
} from 'lucide-react'
import { usePlanModelsStore } from '../stores/planModelsStore'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'

interface Props {
  projectId: string
  /** Couleur d'accent (par défaut : violet Atlas Studio). */
  accentColor?: string
  /** Rendu compact (icône seule) — pour les sidebars étroites. */
  compact?: boolean
}

export function PlanModelSelector({ projectId, accentColor = '#b38a5a', compact = false }: Props) {
  const navigate = useNavigate()
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)

  // Sélections Zustand stables + dérivation mémoïsée (évite re-render infini)
  const allModels = usePlanModelsStore(s => s.models)
  const activeModelId = usePlanModelsStore(s => s.activeModelIdByProject[projectId])
  const setActiveModel = usePlanModelsStore(s => s.setActiveModel)

  const models = useMemo(
    () => allModels
      .filter(m => m.projectId === projectId && m.status !== 'archive')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allModels, projectId],
  )
  const activeModel = useMemo(
    () => allModels.find(m => m.id === activeModelId),
    [allModels, activeModelId],
  )

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleSelect = (modelId: string) => {
    const model = allModels.find(m => m.id === modelId)
    if (!model) return
    setActiveModel(projectId, modelId)
    setParsedPlan(model.plan)   // propagation au planEngineStore
    // Restaure aussi les EditableSpace[] du draft enregistré (si présents)
    // pour que l'éditeur affiche le même état que lors de la sauvegarde.
    if (model.editableSpaces) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useEditableSpaceStore.getState().setSpaces(model.editableSpaces as any)
    }
    setOpen(false)
  }

  // Aucun modèle : CTA vers Atlas Studio
  if (models.length === 0) {
    return (
      <button
        onClick={() => navigate(`/projects/${projectId}/studio`)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
          compact ? '' : 'border border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40'
        }`}
        title="Aucun modèle — ouvrir Atlas Studio pour créer le premier"
      >
        <AlertCircle size={11} />
        {!compact && <span>Aucun modèle · créer</span>}
      </button>
    )
  }

  const label = activeModel?.name ?? 'Sélectionner un modèle'
  const statusEmoji = activeModel?.status === 'valide' ? '✓' : activeModel?.status === 'brouillon' ? '●' : ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
          compact ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : ''
        }`}
        style={!compact ? {
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}40`,
          color: accentColor,
        } : undefined}
        title={`Modèle actif : ${label}`}
      >
        <Layers size={11} />
        {!compact && (
          <>
            <span className="max-w-[160px] truncate">{label}</span>
            {activeModel && statusEmoji && (
              <span className={`text-[9px] ${
                activeModel.status === 'valide' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {statusEmoji}
              </span>
            )}
          </>
        )}
        <ChevronDown size={11} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 rounded-lg bg-surface-1 border border-white/10 shadow-2xl z-[100] overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-atlas-400" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Modèles de plan</span>
            </div>
            <span className="text-[9px] text-slate-500">{models.length} dispo</span>
          </div>

          {/* Liste */}
          <div className="max-h-[360px] overflow-y-auto py-1">
            {models.map(m => {
              const active = m.id === activeModelId
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className={`w-full text-left px-3 py-2 text-[11px] transition border-b border-white/[0.03] last:border-0 ${
                    active ? 'bg-purple-950/40' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center"
                      style={{ background: `${m.color ?? '#b38a5a'}25`, color: m.color ?? '#d4b280' }}
                    >
                      <Layers size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white truncate">{m.name}</span>
                        {active && <Check size={11} className="text-emerald-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0 rounded ${
                          m.status === 'valide' ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {m.status === 'valide' ? '✓ Validé' : 'Brouillon'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {m.stats?.spacesCount ?? 0} esp · {(m.stats?.surfaceTotaleSqm ?? 0).toFixed(0)} m²
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 m-0">{m.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="border-t border-white/5 p-2 space-y-1">
            <button
              onClick={() => { setOpen(false); navigate(`/projects/${projectId}/studio?tab=models`) }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <ExternalLink size={10} /> Gérer dans Atlas Studio
            </button>
            <button
              onClick={() => { setOpen(false); navigate(`/projects/${projectId}/studio`) }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-semibold bg-gradient-to-r from-atlas-500 to-atlas-500 text-white hover:opacity-90"
            >
              <Plus size={10} /> Nouveau modèle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export nommé alternatif pour les imports qui ne font pas du default
export default PlanModelSelector

// Badge de statut séparé (utilisable ailleurs)
export function PlanModelStatusBadge({ projectId }: { projectId: string }) {
  const allModels = usePlanModelsStore(s => s.models)
  const activeModelId = usePlanModelsStore(s => s.activeModelIdByProject[projectId])
  const activeModel = useMemo(
    () => allModels.find(m => m.id === activeModelId),
    [allModels, activeModelId],
  )
  if (!activeModel) return null
  const valid = activeModel.status === 'valide'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
      valid
        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
        : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
    }`}>
      {valid ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
      {valid ? 'Validé' : 'Brouillon'}
    </span>
  )
}
