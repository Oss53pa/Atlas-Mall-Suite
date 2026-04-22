// ═══ PLAN VERSION HISTORY — Timeline + diff viewer + revert ═══
//
// Panel réutilisable (modal ou drawer) qui affiche l'historique d'un plan :
//   • Timeline verticale (version la plus récente en haut)
//   • Clic sur une version → affichage du diff avec la courante
//   • Bouton "Restaurer" → revert avec création d'une entrée de trace
//   • Bouton "Taguer" → ajoute un tag lisible (ex: "v1.0 validée DG")
//   • Bouton "Nouvelle version" → snapshot du plan courant

import React, { useCallback, useEffect, useState } from 'react'
import {
  History, Tag, GitBranch, RotateCcw, Plus, X, User, Clock,
  AlertTriangle, FileText, ArrowRight,
} from 'lucide-react'
import {
  listPlanVersions, createPlanVersion, diffPlanVersions, revertAndRecord,
  deletePlanVersion, getPlanVersionStats,
  type PlanVersion, type VersionDiff,
} from '../engines/planVersioningEngine'
import type { ParsedPlan } from '../planReader/planEngineTypes'

interface Props {
  open: boolean
  onClose: () => void
  /** ID stable du plan (issu de plansLibrary) pour grouper les versions. */
  planId: string
  /** ParsedPlan courant — utilisé pour le snapshot "nouvelle version". */
  currentPlan: ParsedPlan | null
  /** Nom de l'utilisateur courant (stocké comme auteur). */
  currentUser: string
  currentUserEmail?: string
  /** Callback quand l'utilisateur restaure une version. */
  onRevert: (restored: ParsedPlan) => void
}

export default function PlanVersionHistory({
  open, onClose, planId, currentPlan, currentUser, currentUserEmail, onRevert,
}: Props) {
  const [versions, setVersions] = useState<PlanVersion[]>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlanVersionStats>> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitTag, setCommitTag] = useState('')
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null)

  // Recharge la liste
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [vs, st] = await Promise.all([
        listPlanVersions(planId),
        getPlanVersionStats(planId),
      ])
      setVersions(vs)
      setStats(st)
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  // Calcul du diff : version sélectionnée vs version la plus récente
  useEffect(() => {
    if (!selectedId || versions.length < 2) { setDiff(null); return }
    const selected = versions.find(v => v.id === selectedId)
    const latest = versions[0]
    if (!selected || !latest || selected.id === latest.id) { setDiff(null); return }
    setDiff(diffPlanVersions(selected, latest))
  }, [selectedId, versions])

  const handleCreateVersion = async () => {
    if (!currentPlan || !commitMessage.trim()) return
    setLoading(true)
    try {
      await createPlanVersion({
        planId,
        snapshot: currentPlan,
        author: currentUser,
        authorEmail: currentUserEmail,
        message: commitMessage.trim(),
        tag: commitTag.trim() || undefined,
      })
      setCommitMessage('')
      setCommitTag('')
      setCreating(false)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleRevert = async (versionId: string) => {
    const v = versions.find(x => x.id === versionId)
    if (!v) return
    setLoading(true)
    try {
      const { restored } = await revertAndRecord(v, currentUser, currentUserEmail)
      onRevert(restored)
      setConfirmRevertId(null)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (versionId: string) => {
    if (versions.length <= 1) return // garde au moins une version
    setLoading(true)
    try {
      await deletePlanVersion(versionId)
      if (selectedId === versionId) setSelectedId(null)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-surface-0/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[85vh] rounded-xl bg-surface-0 border border-white/[0.08] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-atlas-500/15 border border-atlas-500/30 flex items-center justify-center">
              <History size={16} className="text-atlas-300" />
            </div>
            <div>
              <h2 className="text-white text-sm font-semibold">Historique du plan</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats?.count ?? 0} version{(stats?.count ?? 0) > 1 ? 's' : ''}
                {stats?.authors.length ? ` · ${stats.authors.length} contributeur${stats.authors.length > 1 ? 's' : ''}` : ''}
                {stats?.totalSizeBytes ? ` · ${(stats.totalSizeBytes / 1024).toFixed(0)} KB` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCreating(true)} disabled={!currentPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] hover:bg-emerald-500/25 disabled:opacity-40">
              <Plus size={12} />
              Nouvelle version
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-lg text-slate-400">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* New version form */}
        {creating && (
          <div className="px-5 py-3 border-b border-white/[0.06] bg-emerald-500/[0.04]">
            <div className="flex items-center gap-2">
              <input value={commitMessage} onChange={e => setCommitMessage(e.target.value)}
                placeholder="Message (ex: 'Ajustement des vitrines étage R+1')"
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-1 border border-white/[0.06] text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40" />
              <input value={commitTag} onChange={e => setCommitTag(e.target.value)}
                placeholder="Tag (optionnel)"
                className="w-40 px-3 py-1.5 rounded-lg bg-surface-1 border border-white/[0.06] text-[12px] text-white placeholder:text-slate-600" />
              <button onClick={handleCreateVersion} disabled={!commitMessage.trim() || loading}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] hover:bg-emerald-500/30 disabled:opacity-40">
                Enregistrer
              </button>
              <button onClick={() => { setCreating(false); setCommitMessage(''); setCommitTag('') }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Timeline */}
          <div className="w-80 shrink-0 border-r border-white/[0.06] overflow-y-auto">
            {versions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-[12px]">
                Aucune version enregistrée. Créez-en une pour démarrer l'historique.
              </div>
            ) : (
              <div className="p-2">
                {versions.map((v, i) => {
                  const isLatest = i === 0
                  const isSelected = selectedId === v.id
                  return (
                    <button key={v.id} onClick={() => setSelectedId(v.id)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition border ${
                        isSelected ? 'bg-atlas-500/10 border-atlas-500/30' : 'border-transparent hover:bg-white/[0.03]'
                      }`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isLatest ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          v{v.versionNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {isLatest && <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">actuelle</span>}
                            {v.tag && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <Tag size={8} /> {v.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-slate-200 font-medium truncate">{v.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <User size={9} />
                            {v.author}
                            <span>·</span>
                            <Clock size={9} />
                            {new Date(v.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Diff viewer / details */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedId ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <GitBranch size={40} strokeWidth={1.3} />
                <p className="text-[13px] mt-3">Sélectionnez une version</p>
                <p className="text-[11px] mt-1">Le différentiel avec la version actuelle s'affichera ici</p>
              </div>
            ) : (() => {
              const v = versions.find(x => x.id === selectedId)!
              const isLatest = versions[0]?.id === v.id
              return (
                <div>
                  {/* Entête version */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white text-[15px] font-semibold">Version {v.versionNumber}</h3>
                        {v.tag && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                            {v.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-400 mt-1">{v.message}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-1.5">
                        <span>{v.author}</span>
                        <span>·</span>
                        <span>{new Date(v.createdAt).toLocaleString('fr-FR')}</span>
                        <span>·</span>
                        <span>{(v.sizeBytes / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isLatest && (
                        <button onClick={() => setConfirmRevertId(v.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlas-500/15 border border-atlas-500/30 text-atlas-300 text-[11px] hover:bg-atlas-500/25">
                          <RotateCcw size={12} />
                          Restaurer
                        </button>
                      )}
                      {versions.length > 1 && (
                        <button onClick={() => handleDelete(v.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-300"
                          title="Supprimer cette version">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirmation revert */}
                  {confirmRevertId === v.id && (
                    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3">
                      <div className="flex items-start gap-2 text-[12px] text-amber-200">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <strong>Restaurer cette version ?</strong>
                          <p className="text-[11px] text-amber-300/80 mt-1">
                            Le plan courant sera remplacé par le snapshot de la version {v.versionNumber}.
                            Une nouvelle entrée sera ajoutée à l'historique pour tracer cette action (tu peux annuler ensuite).
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleRevert(v.id)} disabled={loading}
                              className="px-3 py-1 rounded bg-amber-500/25 border border-amber-500/50 text-amber-100 text-[11px] hover:bg-amber-500/35">
                              Confirmer la restauration
                            </button>
                            <button onClick={() => setConfirmRevertId(null)}
                              className="px-3 py-1 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px] hover:bg-white/10">
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diff */}
                  {diff && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500">
                        <FileText size={12} />
                        <span>Différentiel avec la version actuelle</span>
                        <ArrowRight size={11} />
                        <strong className="text-slate-300">{diff.summary}</strong>
                      </div>
                      {diff.entries.length === 0 ? (
                        <div className="rounded-lg border border-white/[0.05] bg-surface-1/40 p-4 text-center text-[12px] text-slate-500">
                          Pas de différence détectée entre cette version et la version actuelle.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {diff.entries.map((e, i) => (
                            <DiffRow key={i} entry={e} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Snapshot info */}
                  <div className="mt-5 rounded-lg border border-white/[0.05] bg-surface-1/30 p-3 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Contenu du snapshot :</strong>{' '}
                    {v.snapshot.spaces.length} espaces · {v.snapshot.wallSegments.length} murs · {v.snapshot.layers.length} calques ·
                    bounds {v.snapshot.bounds.width.toFixed(1)}×{v.snapshot.bounds.height.toFixed(1)} m
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Diff row ──────────────────────────────────────────────

function DiffRow({ entry }: { entry: ReturnType<typeof diffPlanVersions>['entries'][0] }) {
  const color =
    entry.kind === 'space_added' ? 'emerald' :
    entry.kind === 'space_removed' ? 'red' :
    entry.kind === 'space_renamed' ? 'sky' :
    entry.kind === 'space_resized' ? 'amber' :
    entry.kind === 'space_status_changed' ? 'purple' :
    entry.kind === 'floor_restructured' ? 'pink' :
    'slate'
  const COLOR_CLS: Record<string, string> = {
    emerald: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300',
    red: 'border-red-500/25 bg-red-500/[0.06] text-red-300',
    sky: 'border-sky-500/25 bg-sky-500/[0.06] text-sky-300',
    amber: 'border-amber-500/25 bg-amber-500/[0.06] text-amber-300',
    purple: 'border-atlas-500/25 bg-atlas-500/[0.06] text-atlas-300',
    pink: 'border-pink-500/25 bg-pink-500/[0.06] text-pink-300',
    slate: 'border-slate-500/25 bg-slate-500/[0.06] text-slate-300',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 text-[11px] ${COLOR_CLS[color]}`}>
      {entry.summary}
    </div>
  )
}
