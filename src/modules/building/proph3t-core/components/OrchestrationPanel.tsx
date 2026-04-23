// ═══ Orchestration Panel ═══
//
// Tableau de bord PROPH3T orchestrateur (CDC §3.7) :
//   - Bouton « Lancer orchestration 4 volumes »
//   - Progress bar (events ProgressEvent)
//   - Décisions live au fur et à mesure
//   - Liste historique des traces (listTraces)
//   - Sélection trace → TraceViewer

import { useEffect, useState } from 'react'
import {
  Play, Loader2, Cpu, History, AlertCircle, CheckCircle2, Sparkles,
} from 'lucide-react'
import proph3t from '../api'
import { listTraces, loadTrace } from '../executionTrace'
import type { ExecutionTrace, ProgressEvent, VolumeId } from '../types'
import { VOLUMES_ORDER } from '../types'
import { TraceViewer } from './TraceViewer'
import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'

interface Props {
  projetId: string
  parsedPlan: ParsedPlan | null
}

export function OrchestrationPanel({ projetId, parsedPlan }: Props) {
  const [running, setRunning] = useState(false)
  const [useWorker, setUseWorker] = useState(true)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [liveTrace, setLiveTrace] = useState<ExecutionTrace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ExecutionTrace[]>([])
  const [selectedTrace, setSelectedTrace] = useState<ExecutionTrace | null>(null)
  const [selectedVolumes, setSelectedVolumes] = useState<VolumeId[]>([...VOLUMES_ORDER])

  useEffect(() => {
    void refreshHistory()
  }, [projetId])

  const refreshHistory = async () => {
    try {
      const list = await listTraces(projetId)
      setHistory(list)
    } catch (e) {
      console.warn('[OrchestrationPanel] history load failed', e)
    }
  }

  const launch = async () => {
    if (!parsedPlan) {
      setError('Aucun plan importé. Importez un plan via « Plans importés ».')
      return
    }
    setRunning(true)
    setError(null)
    setProgress(null)
    setLiveTrace(null)
    setSelectedTrace(null)
    try {
      const trace = await proph3t.orchestrate({
        projetId,
        parsedPlan,
        volumes: selectedVolumes,
        useWorker,
        onProgress: (ev) => {
          setProgress(ev)
        },
      })
      setLiveTrace(trace)
      setSelectedTrace(trace)
      await refreshHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setRunning(false)
    }
  }

  const openTrace = async (id: string) => {
    const t = await loadTrace(id)
    if (t) setSelectedTrace(t)
  }

  // Si une trace est sélectionnée, afficher le viewer plein écran
  if (selectedTrace) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/10 bg-surface-1/60">
          <button
            onClick={() => setSelectedTrace(null)}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            ← Retour orchestration
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <TraceViewer trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-surface-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-atlas-400" size={18} />
          <h1 className="text-lg font-bold text-white m-0">PROPH3T Orchestrateur</h1>
        </div>
        <p className="text-[11px] text-slate-500 mb-6">
          Enchaîne automatiquement Vol.1 → Vol.2 → Vol.3 → Vol.4 sur le plan importé.
          Chaque décision est tracée et auditable (CDC §3.7 + §6.2).
        </p>

        {/* Config */}
        <div className="rounded-lg border border-white/10 bg-surface-1/40 p-4 mb-4">
          <h2 className="text-[12px] font-semibold text-white mb-3">Configuration</h2>

          <div className="mb-3">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1.5">
              Volumes à exécuter
            </div>
            <div className="flex gap-2 flex-wrap">
              {VOLUMES_ORDER.map(v => {
                const active = selectedVolumes.includes(v)
                return (
                  <button
                    key={v}
                    onClick={() => setSelectedVolumes(prev =>
                      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
                    )}
                    disabled={running}
                    className={`px-3 py-1.5 rounded text-[11px] font-medium border transition ${
                      active
                        ? 'bg-atlas-600/30 border-atlas-500 text-atlas-200'
                        : 'bg-surface-1 border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={useWorker}
              onChange={e => setUseWorker(e.target.checked)}
              disabled={running}
            />
            <Cpu size={12} />
            Exécuter en Web Worker (UI non bloquée — ORC-05)
          </label>
        </div>

        {/* Bouton lancement */}
        <button
          onClick={launch}
          disabled={running || !parsedPlan || selectedVolumes.length === 0}
          className="w-full py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-atlas-500 to-atlas-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          {running ? (
            <><Loader2 className="animate-spin" size={16} /> Orchestration en cours…</>
          ) : (
            <><Play size={16} /> Lancer orchestration {selectedVolumes.length} volume(s)</>
          )}
        </button>

        {!parsedPlan && (
          <div className="rounded border border-amber-700 bg-amber-950/30 p-3 mb-4 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200 m-0">
              Aucun plan importé. Importez un plan via « Plans importés » avant de lancer l'orchestration.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-700 bg-red-950/30 p-3 mb-4 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-200 m-0">{error}</p>
          </div>
        )}

        {/* Progress live */}
        {progress && (
          <div className="rounded-lg border border-purple-800 bg-purple-950/20 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-atlas-200 font-semibold">
                {progress.volume} · {progress.status}
              </span>
              <span className="text-[11px] text-white tabular-nums">{progress.pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-atlas-500 to-atlas-500 transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            {progress.message && (
              <p className="text-[10px] text-slate-400 m-0">{progress.message}</p>
            )}
            {progress.decisionAdded && (
              <p className="text-[10px] text-emerald-300 m-0 mt-1 truncate">
                ✓ {progress.decisionAdded.description}
              </p>
            )}
          </div>
        )}

        {/* Trace en cours */}
        {liveTrace && !running && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-950/20 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-[12px] font-semibold text-white">
                Orchestration terminée — {liveTrace.stats?.decisionsCount} décisions
              </span>
            </div>
            <button
              onClick={() => setSelectedTrace(liveTrace)}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline"
            >
              Voir la trace complète →
            </button>
          </div>
        )}

        {/* Historique */}
        <div className="rounded-lg border border-white/10 bg-surface-1/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-semibold text-white flex items-center gap-2">
              <History size={14} />
              Historique des traces
            </h2>
            <button
              onClick={refreshHistory}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Rafraîchir
            </button>
          </div>

          {history.length === 0 && (
            <p className="text-[11px] text-slate-500 m-0">
              Aucune trace persistée pour ce projet.
            </p>
          )}

          <div className="space-y-1">
            {history.map(t => (
              <button
                key={t.id}
                onClick={() => openTrace(t.id)}
                className="w-full text-left p-2.5 rounded border border-white/5 bg-surface-0/40 hover:bg-surface-1 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      t.status === 'success' ? 'bg-emerald-400'
                      : t.status === 'failed' ? 'bg-red-400'
                      : 'bg-amber-400'
                    }`} />
                    <code className="text-[10px] text-slate-400">{t.id.slice(0, 24)}…</code>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(t.startedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{t.volumes.length} volumes</span>
                  <span>{t.stats?.decisionsCount ?? 0} décisions</span>
                  {t.stats?.avgConfidence !== undefined && (
                    <span>conf {(t.stats.avgConfidence * 100).toFixed(0)}%</span>
                  )}
                  {t.stats?.totalDurationMs !== undefined && (
                    <span>{(t.stats.totalDurationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
