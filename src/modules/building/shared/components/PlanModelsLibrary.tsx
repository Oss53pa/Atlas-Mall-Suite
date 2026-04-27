// ═══ PlanModelsLibrary — bibliothèque de modèles de plan ═══
//
// Page affichée dans l'onglet "Bibliothèque" du module Atlas Studio.
// L'utilisateur peut :
//   - Voir la liste des modèles enregistrés pour ce projet
//   - Activer un modèle (sera utilisé dans les volumes)
//   - Dupliquer, renommer, supprimer, marquer validé/brouillon
//   - Enregistrer le plan courant comme nouveau modèle

import { useMemo, useState } from 'react'
import {
  Save, Copy, Trash2, CheckCircle2, Edit2, X,
  FileText, Archive, Clock, Square, Layers, Ruler, Check,
} from 'lucide-react'
import { usePlanModelsStore, type PlanModel } from '../stores/planModelsStore'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import { applyEditsToPlan } from '../planReader/applyEditsToPlan'

interface Props {
  projectId: string
}

export function PlanModelsLibrary({ projectId }: Props) {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore((s) => s.setParsedPlan)
  const validatePlan = usePlanEngineStore((s) => s.validatePlan)
  // Les polygones dessinés/édités par l'utilisateur dans l'éditeur Atlas Studio
  // doivent remplacer les DetectedSpace bruts à la sauvegarde du modèle, sinon
  // les volumes continuent à afficher le plan DXF non-remodelé.
  const editableSpaces = useEditableSpaceStore((s) => s.spaces)

  // IMPORTANT : sélectionner directement `models` (référence stable) puis
  // filtrer/trier dans useMemo pour éviter les boucles de re-render Zustand
  // (un sélecteur qui retourne un nouveau array à chaque appel déclenche un
  // setState infini → "Maximum update depth exceeded").
  const allModels = usePlanModelsStore((s) => s.models)
  const activeModelId = usePlanModelsStore((s) => s.activeModelIdByProject[projectId])
  const saveCurrentAsModel = usePlanModelsStore((s) => s.saveCurrentAsModel)
  const duplicateModel = usePlanModelsStore((s) => s.duplicateModel)
  const updateModel = usePlanModelsStore((s) => s.updateModel)
  const deleteModel = usePlanModelsStore((s) => s.deleteModel)
  const setActiveModel = usePlanModelsStore((s) => s.setActiveModel)

  const models = useMemo(
    () => allModels.filter(m => m.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allModels, projectId],
  )

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSave = () => {
    if (!parsedPlan) { alert('Aucun plan importé à enregistrer.'); return }
    if (!saveName.trim()) { alert('Nom requis.'); return }
    // Fusionne les éditions utilisateur (EditableSpace) dans le plan avant
    // sauvegarde — sans ça, les volumes voient le DXF brut et non le remodelage.
    const merged = applyEditsToPlan(parsedPlan, editableSpaces)
    saveCurrentAsModel(projectId, saveName, merged, {
      description: saveDesc || undefined,
      status: 'brouillon',
      // Snapshot des EditableSpace pour pouvoir restaurer le draft a l'identique
      editableSpaces,
    })
    setSaveName(''); setSaveDesc(''); setSaveOpen(false)
  }

  const handleActivate = (m: PlanModel) => {
    setActiveModel(projectId, m.id)
    // Propager au planEngineStore pour alimenter les volumes
    setParsedPlan(m.plan)
  }

  const handleValidate = (m: PlanModel) => {
    // Re-fusionner les edits au moment de la validation si l'utilisateur
    // a continué à modifier depuis la dernière sauvegarde. On met à jour
    // le modèle avec le plan remodelé final.
    const mergedPlan = applyEditsToPlan(m.plan, editableSpaces)
    updateModel(m.id, { status: 'valide', plan: mergedPlan })
    setActiveModel(projectId, m.id)
    setParsedPlan(mergedPlan)
    validatePlan()
  }

  const handleRename = (id: string) => {
    if (editName.trim()) updateModel(id, { name: editName.trim() })
    setEditingId(null); setEditName('')
  }

  return (
    <div className="h-full overflow-y-auto bg-[#080c14] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white m-0">Bibliothèque de modèles</h2>
            <p className="text-[12px] text-slate-400 m-0 mt-1">
              Enregistrez plusieurs versions de votre plan. Activez celle à utiliser dans les volumes
              Vol.1/Vol.2/Vol.3/Vol.4. Vous pouvez itérer sur une copie sans perdre l'original.
            </p>
          </div>
          <button
            onClick={() => setSaveOpen(true)}
            disabled={!parsedPlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-atlas-500 to-purple-600 text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            title={parsedPlan ? 'Enregistre un snapshot du plan comme BROUILLON (pas encore final)' : 'Importez d\'abord un plan'}
          >
            <Save size={13} /> Enregistrer brouillon
          </button>
        </div>

        {/* Modale enregistrement */}
        {saveOpen && (
          <div className="fixed inset-0 z-[9999] bg-surface-0/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[460px] max-w-[95vw] rounded-xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white m-0">Enregistrer le plan</h3>
                <button onClick={() => setSaveOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 tracking-wider mb-1 block">Nom du modèle *</label>
                  <input
                    value={saveName} onChange={(e) => setSaveName(e.target.value)}
                    placeholder='Ex: "V1 initial", "Après split parking"…'
                    className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm border border-white/10 focus:border-atlas-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 tracking-wider mb-1 block">Description (optionnel)</label>
                  <textarea
                    value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)}
                    rows={3} placeholder="Modifications, raison du snapshot…"
                    className="w-full bg-slate-800 text-white rounded px-3 py-2 text-sm border border-white/10 focus:border-atlas-500 outline-none resize-none"
                  />
                </div>
                <div className="text-[11px] text-slate-500 px-3 py-2 rounded bg-slate-800/50">
                  Snapshot : <strong className="text-slate-300">{parsedPlan?.spaces?.length ?? 0} espaces</strong>,{' '}
                  <strong className="text-slate-300">{parsedPlan?.wallSegments?.length ?? 0} murs</strong>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
                <button onClick={() => setSaveOpen(false)} className="px-3 py-1.5 rounded text-[11px] text-slate-400 hover:text-white">Annuler</button>
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[11px] font-semibold bg-atlas-500 hover:bg-atlas-500 text-white">
                  <Save size={11} /> Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {models.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Archive size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm text-slate-300 m-0">Aucun modèle enregistré</p>
            <p className="text-[11px] text-slate-500 m-0 mt-2">
              {parsedPlan
                ? 'Cliquez « Enregistrer comme modèle » pour sauvegarder votre plan actuel.'
                : 'Importez d\'abord un plan dans l\'onglet Import, puis revenez ici.'}
            </p>
          </div>
        )}

        {/* Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {models.map(m => {
            const isActive = m.id === activeModelId
            return (
              <div key={m.id}
                className={`rounded-xl border p-4 transition ${
                  isActive
                    ? 'border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                    : 'border-white/10 bg-surface-1/50 hover:border-atlas-500/30'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: `${m.color ?? '#b38a5a'}25`, color: m.color ?? '#d4b280' }}>
                    <Layers size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(m.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(m.id)}
                          className="flex-1 bg-slate-800 text-white rounded px-2 py-1 text-[12px] border border-atlas-500 outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h3
                        className="text-[13px] font-bold text-white m-0 truncate cursor-pointer hover:text-atlas-300"
                        onClick={() => { setEditingId(m.id); setEditName(m.name) }}
                        title="Cliquer pour renommer"
                      >
                        {m.name}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        m.status === 'valide' ? 'bg-emerald-500/20 text-emerald-300'
                        : m.status === 'archive' ? 'bg-slate-700 text-slate-400'
                        : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {m.status === 'valide' ? '✓ VALIDÉ' : m.status === 'archive' ? 'ARCHIVÉ' : 'BROUILLON'}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={9} /> ACTIF
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {m.description && (
                  <p className="text-[11px] text-slate-400 m-0 mb-2 line-clamp-2">{m.description}</p>
                )}

                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-400 mt-3 mb-3">
                  <div className="flex items-center gap-1">
                    <Square size={9} /> {m.stats?.spacesCount ?? 0} esp.
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers size={9} /> {m.stats?.wallSegmentsCount ?? 0} murs
                  </div>
                  <div className="flex items-center gap-1">
                    <Ruler size={9} /> {(m.stats?.surfaceTotaleSqm ?? 0).toFixed(0)} m²
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-slate-600 mb-3">
                  <Clock size={9} />
                  <span>MàJ {new Date(m.updatedAt).toLocaleString('fr-FR')}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  {!isActive && (
                    <button
                      onClick={() => handleActivate(m)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold bg-atlas-500 hover:bg-atlas-500 text-white"
                      title="Utiliser ce modèle dans les volumes"
                    >
                      <Check size={11} /> Activer
                    </button>
                  )}
                  {m.status !== 'valide' && isActive && (
                    <button
                      onClick={() => handleValidate(m)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90"
                      title="Valider ce modèle comme base — débloque les volumes"
                    >
                      <CheckCircle2 size={11} /> Valider
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const copy = duplicateModel(m.id)
                      if (copy) { setEditingId(copy.id); setEditName(copy.name) }
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5"
                    title="Dupliquer"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={() => { setEditingId(m.id); setEditName(m.name) }}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5"
                    title="Renommer"
                  >
                    <Edit2 size={11} />
                  </button>
                  {m.status !== 'archive' && (
                    <button
                      onClick={() => updateModel(m.id, { status: 'archive' })}
                      className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-amber-950/30"
                      title="Archiver"
                    >
                      <Archive size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer "${m.name}" ? Cette action est irréversible.`)) deleteModel(m.id)
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                    title="Supprimer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Note explicative */}
        {models.length > 0 && (
          <div className="mt-6 px-4 py-3 rounded-lg border border-blue-900/40 bg-blue-950/20 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <FileText size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                Le <strong className="text-blue-300">modèle ACTIF</strong> est celui utilisé par Vol.1, Vol.2, Vol.3 et Vol.4.
                Activer un autre modèle bascule instantanément toute l'application dessus.
                Pour autoriser l'accès aux volumes, le modèle actif doit être <strong className="text-emerald-300">VALIDÉ</strong>.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
