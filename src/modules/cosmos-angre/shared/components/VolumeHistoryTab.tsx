// ═══ VOLUME HISTORY TAB — Wrapper réutilisable PlanVersionHistory ═══
//
// Fournit aux volumes une intégration zéro-friction de l'historique :
//   • Monte PlanVersionHistory en mode panneau (non-modal)
//   • Gère le planId stable à partir du volumeId + activeFloorId
//   • Injecte le ParsedPlan courant depuis planEngineStore
//   • Déclenche l'application du revert sur le store central
//   • Auteur courant = e-mail utilisateur du storage onboarding

import { useCallback, useMemo, useState, useEffect } from 'react'
import { History, GitBranch, Clock, Plus, RotateCcw, User } from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import {
  listPlanVersions, createPlanVersion, revertAndRecord,
  getPlanVersionStats,
  type PlanVersion,
} from '../engines/planVersioningEngine'
import PlanVersionHistory from './PlanVersionHistory'

interface Props {
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  volumeColor?: string
  /** Nom lisible pour UI. */
  volumeName: string
}

export default function VolumeHistoryTab({ volumeId, volumeColor = '#c9a068', volumeName }: Props) {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore((s) => s.setParsedPlan)

  // Plan ID stable par volume (chaque volume = un plan distinct pour l'historique)
  const planId = useMemo(() => `${volumeId}-plan`, [volumeId])
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<PlanVersion[]>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlanVersionStats>> | null>(null)
  const [loading, setLoading] = useState(false)

  const currentUser = useMemo(() => {
    // Récupère l'email utilisateur depuis le storage onboarding
    try {
      const raw = localStorage.getItem('cosmos-onboarding-v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed?.state?.userEmail ?? parsed?.state?.projectName ?? 'Utilisateur'
      }
    } catch { /* ignore */ }
    return 'Utilisateur'
  }, [])

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

  useEffect(() => { void refresh() }, [refresh])

  const handleQuickSnapshot = async () => {
    if (!parsedPlan) return
    const msg = prompt('Message de cette version (ex : "Ajustement R+1 après revue DG") :')
    if (!msg) return
    setLoading(true)
    try {
      await createPlanVersion({
        planId,
        snapshot: parsedPlan,
        author: currentUser,
        message: msg,
      })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleRevert = useCallback((restored: typeof parsedPlan) => {
    if (restored) {
      setParsedPlan(restored)
      void refresh()
    }
  }, [setParsedPlan, refresh])

  const handleQuickRevert = async (versionId: string) => {
    const v = versions.find(x => x.id === versionId)
    if (!v) return
    if (!confirm(`Restaurer la version ${v.versionNumber} « ${v.message} » ?\nLe plan courant sera remplacé.`)) return
    setLoading(true)
    try {
      const { restored } = await revertAndRecord(v, currentUser)
      handleRevert(restored)
    } finally {
      setLoading(false)
    }
  }

  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <History size={48} className="text-slate-600 mb-4" />
        <h3 className="text-slate-200 font-semibold mb-1">Aucun plan chargé</h3>
        <p className="text-slate-500 text-sm max-w-md">
          Importez ou chargez un plan dans l'onglet « Plans importés » pour activer l'historique des versions.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-0 text-slate-200">

      {/* Header */}
      <div className="border-b border-white/[0.06] p-4 flex items-center justify-between">
        <div>
          <h2 className="text-white text-sm font-semibold flex items-center gap-2">
            <History size={14} style={{ color: volumeColor }} />
            Historique du {volumeName}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {versions.length} version{versions.length > 1 ? 's' : ''}
            {stats?.authors.length ? ` · ${stats.authors.length} contributeur${stats.authors.length > 1 ? 's' : ''}` : ''}
            {stats?.totalSizeBytes ? ` · ${(stats.totalSizeBytes / 1024).toFixed(0)} KB total` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickSnapshot}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40"
            style={{ background: `${volumeColor}18`, border: `1px solid ${volumeColor}40`, color: volumeColor }}
          >
            <Plus size={12} />
            Nouvelle version
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 hover:bg-slate-700"
          >
            <GitBranch size={12} />
            Voir & comparer
          </button>
        </div>
      </div>

      {/* Inline timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        {versions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Clock size={40} strokeWidth={1.3} />
            <p className="text-[13px] mt-3">Aucune version enregistrée</p>
            <p className="text-[11px] mt-1">Créez une première version pour démarrer l'historique.</p>
          </div>
        ) : (
          <ol className="relative border-l-2 border-white/[0.06] ml-4 space-y-5">
            {versions.map((v, i) => {
              const isLatest = i === 0
              return (
                <li key={v.id} className="ml-5 relative">
                  <span className={`absolute -left-[30px] top-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                    isLatest
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                      : 'bg-slate-800 border-white/15 text-slate-400'
                  }`}>
                    {v.versionNumber}
                  </span>
                  <div className="rounded-lg bg-surface-1/40 border border-white/[0.05] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isLatest && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              actuelle
                            </span>
                          )}
                          {v.tag && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                              {v.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-200 font-medium">{v.message}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <User size={9} />
                          {v.author}
                          <span>·</span>
                          <Clock size={9} />
                          {new Date(v.createdAt).toLocaleString('fr-FR')}
                          <span>·</span>
                          <span>{(v.sizeBytes / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                      {!isLatest && (
                        <button
                          onClick={() => handleQuickRevert(v.id)}
                          disabled={loading}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-atlas-500/15 border border-atlas-500/30 text-atlas-300 text-[10px] hover:bg-atlas-500/25 disabled:opacity-40"
                        >
                          <RotateCcw size={10} />
                          Restaurer
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Full modal pour diff détaillé */}
      <PlanVersionHistory
        open={open}
        onClose={() => setOpen(false)}
        planId={planId}
        currentPlan={parsedPlan}
        currentUser={currentUser}
        onRevert={(restored) => {
          handleRevert(restored)
          setOpen(false)
        }}
      />
    </div>
  )
}
