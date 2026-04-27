// ═══ PROPH3T VOLUME PANEL — Dockable par volume (Vol1 / Vol2 / Vol3) ═══
// 3 actions permanentes :
//   • Évaluer  → score instantané sur l'état actuel du volume
//   • Suggérer → propose actions concrètes (placements, ajustements)
//   • Auditer  → compliance + conformité + risques cités
//
// Le panneau écoute le domain event bus → rafraîchissement auto quand
// l'utilisateur modifie des entités dans le volume.

import React, { useState, useCallback } from 'react'
import { Sparkles, ChevronRight, ChevronLeft, Gauge, Lightbulb, ShieldCheck, Loader2, RefreshCw } from 'lucide-react'
import { Proph3tResultPanel } from './Proph3tResultPanel'
import { runSkill } from '../orchestrator'
import type { Proph3tResult, Proph3tAction } from '../orchestrator.types'

export type VolumeKind = 'commercial' | 'security' | 'parcours' | 'wayfinder'

interface Props {
  /** Volume courant. */
  volume: VolumeKind
  /** Construit l'input pour la skill du volume. Doit être STABLE (useCallback). */
  buildInput: () => unknown | null
  /** Callback application d'action (Accept). */
  onApplyAction?: (action: Proph3tAction) => Promise<void> | void
  /** Titre optionnel du panneau. */
  title?: string
  /** Position (défaut: right). */
  position?: 'left' | 'right'
  /** Contrôlé (si absent, état interne). */
  open?: boolean
  onToggle?: (open: boolean) => void
}

const VOLUME_CONFIG: Record<VolumeKind, {
  label: string
  accent: string
  border: string
  skill: string
  evalVerb: string
  suggestVerb: string
  auditVerb: string
}> = {
  commercial: {
    label: 'Vol.1 Commercial',
    accent: 'amber',
    border: 'border-amber-500/30',
    skill: 'analyzeCommercialMix',
    evalVerb: 'Évaluer le mix',
    suggestVerb: 'Suggérer placements',
    auditVerb: 'Auditer portefeuille',
  },
  security: {
    label: 'Vol.2 Sécurité',
    accent: 'blue',
    border: 'border-blue-500/30',
    skill: 'auditSecurity',
    evalVerb: 'Évaluer couverture',
    suggestVerb: 'Suggérer caméras',
    auditVerb: 'Auditer conformité ERP',
  },
  parcours: {
    label: 'Vol.3 Parcours',
    accent: 'emerald',
    border: 'border-emerald-500/30',
    skill: 'analyzeParcours',
    evalVerb: 'Évaluer parcours',
    suggestVerb: 'Suggérer signalétique',
    auditVerb: 'Auditer accessibilité',
  },
  wayfinder: {
    label: 'Vol.4 Wayfinder',
    accent: 'atlas',
    border: 'border-atlas-500/30',
    skill: 'analyzeWayfinder',
    evalVerb: 'Analyser wayfinder',
    suggestVerb: 'Suggérer beacons',
    auditVerb: 'Auditer signalétique',
  },
}

export function Proph3tVolumePanel({
  volume, buildInput, onApplyAction,
  title, position = 'right', open: openProp, onToggle,
}: Props) {
  const cfg = VOLUME_CONFIG[volume]
  // Panneau FERMÉ par défaut (évite exécution lourde à l'ouverture du volume)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (v: boolean) => { setInternalOpen(v); onToggle?.(v) }

  const [result, setResult] = useState<Proph3tResult<unknown> | null>(null)
  const [running, setRunning] = useState<'eval' | 'suggest' | 'audit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)
  const lastExecAt = React.useRef<number>(0)

  const execute = useCallback(async (mode: 'eval' | 'suggest' | 'audit') => {
    if (running) return
    // Cooldown 2s — évite spam clics + protège le main thread
    const now = Date.now()
    if (now - lastExecAt.current < 2000) {
      console.log(`[Proph3tVolumePanel] cooldown, skip ${mode}`)
      return
    }
    lastExecAt.current = now
    const input = buildInput()
    if (!input) {
      setError('Plan non disponible — importe un plan avant de lancer Proph3t.')
      return
    }
    setRunning(mode)
    setError(null)
    try {
      // Defensive : si bootstrap pas encore tourné, force-le.
      const { listSkills } = await import('../orchestrator')
      if (!listSkills().includes(cfg.skill)) {
        const { bootstrapProph3t } = await import('../bootstrap')
        await bootstrapProph3t()
      }
      const r = await runSkill(cfg.skill, input)
      setResult(r)
      // Pousse les overlays (badges signalétique, heatmaps bottlenecks)
      // dans le store partagé pour que MallMap2D les dessine sur le plan.
      if (r.overlays && r.overlays.length > 0) {
        const { useProph3tOverlaysStore } = await import('../../stores/proph3tOverlaysStore')
        useProph3tOverlaysStore.getState().setOverlays(r.overlays, cfg.skill)
      }
    } catch (err) {
      console.error(`[Proph3tVolumePanel] ${volume} ${mode} failed`, err)
      setError(`Erreur Proph3t : ${(err as Error).message ?? String(err)}`)
    } finally {
      setRunning(null)
    }
  }, [buildInput, cfg.skill, running, volume])

  // Auto-refresh sur event bus DÉSACTIVÉ — déclenchait freeze sur hydratation
  // (400 lots → 400 events lot.created → debounce empile les timers → bloque main thread)
  // L'utilisateur clique manuellement Évaluer / Suggérer / Auditer.

  // Collapsed state
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${position === 'right' ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 px-2 py-3 rounded-lg bg-surface-0/90 border ${cfg.border} text-slate-300 hover:bg-surface-1`}
        style={{ writingMode: 'vertical-rl' }}
        title="Ouvrir PROPH3T"
      >
        <Sparkles size={14} className="text-atlas-300" />
        <span className="text-[10px] uppercase tracking-wider">PROPH3T · {cfg.label}</span>
        {position === 'right' ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    )
  }

  const qualityScore = result?.qualityScore
  const scoreColor = qualityScore === undefined
    ? 'text-slate-400'
    : qualityScore >= 75 ? 'text-emerald-400'
    : qualityScore >= 50 ? 'text-amber-400'
    : 'text-red-400'

  return (
    <aside
      className={`fixed ${position === 'right' ? 'right-0' : 'left-0'} top-16 bottom-4 w-[380px] z-20 rounded-l-xl ${position === 'left' ? 'rounded-l-none rounded-r-xl' : ''} bg-surface-0/95 border ${cfg.border} flex flex-col overflow-hidden shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-gradient-to-r from-purple-950/30 to-surface-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-atlas-300" />
          <div>
            <div className="text-[12px] font-bold text-white">{title ?? `PROPH3T · ${cfg.label}`}</div>
            <div className="text-[9px] text-slate-500">Suggestions · évaluations · audit</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 text-slate-500 hover:text-white">
          {position === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Score snapshot */}
      {result && (
        <div className="px-3 py-2 border-b border-white/[0.06] bg-surface-1/40 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
            qualityScore !== undefined && qualityScore >= 75 ? 'border-emerald-500/60 bg-emerald-900/20' :
            qualityScore !== undefined && qualityScore >= 50 ? 'border-amber-500/60 bg-amber-900/20' :
            'border-red-500/60 bg-red-900/20'
          }`}>
            <span className={`text-[18px] font-bold tabular-nums ${scoreColor}`}>
              {qualityScore ?? '—'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase text-slate-500 tracking-widest">Score volume</div>
            <div className="text-[11px] text-slate-300 leading-tight mt-0.5 line-clamp-2">
              {result.executiveSummary}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-3 py-2.5 border-b border-white/[0.06] grid grid-cols-3 gap-1.5">
        <button
          onClick={() => execute('eval')}
          disabled={!!running}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded text-[10px] font-medium border bg-surface-1 border-white/[0.06] text-slate-200 hover:bg-slate-800 disabled:opacity-40`}
        >
          {running === 'eval' ? <Loader2 size={12} className="animate-spin" /> : <Gauge size={12} />}
          {running === 'eval' ? 'Calcul…' : 'Évaluer'}
        </button>
        <button
          onClick={() => execute('suggest')}
          disabled={!!running}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded text-[10px] font-medium border bg-amber-900/30 border-amber-500/40 text-amber-200 hover:bg-amber-900/50 disabled:opacity-40`}
        >
          {running === 'suggest' ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
          {running === 'suggest' ? 'Calcul…' : 'Suggérer'}
        </button>
        <button
          onClick={() => execute('audit')}
          disabled={!!running}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded text-[10px] font-medium border bg-blue-900/30 border-blue-500/40 text-blue-200 hover:bg-blue-900/50 disabled:opacity-40`}
        >
          {running === 'audit' ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
          {running === 'audit' ? 'Calcul…' : 'Auditer'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
        {error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-[11px] text-rose-200">
            <div className="font-bold mb-1">⚠️ Échec Proph3t</div>
            <div className="font-mono text-[10px] whitespace-pre-wrap break-words">{error}</div>
            <button onClick={() => setError(null)} className="mt-2 text-[10px] underline text-rose-300 hover:text-rose-100">
              Fermer
            </button>
          </div>
        ) : !result ? (
          <div className="text-center py-10 text-slate-500">
            <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[11px]">Cliquez sur une action pour lancer PROPH3T</p>
            <p className="text-[9px] text-slate-600 mt-1">
              Évaluer = score · Suggérer = actions · Auditer = conformité
            </p>
          </div>
        ) : (
          <>
            <Proph3tResultPanel result={result} onApplyAction={onApplyAction} compact />
            <button
              onClick={() => setShowFullReport(true)}
              className="mt-3 w-full px-3 py-2 rounded bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-100 text-[11px] font-semibold border border-emerald-500/40"
            >
              📊 Voir le rapport complet et détaillé →
            </button>
          </>
        )}
      </div>

      {/* ─── Rapport plein écran modal ─── */}
      {showFullReport && result && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowFullReport(false)}
        >
          <div
            className="bg-surface-1 border border-white/10 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Rapport Proph3t — {cfg.label}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Skill : <span className="font-mono text-emerald-300">{result.skill}</span> ·
                  Source : <span className="font-mono text-slate-300">{result.source}</span> ·
                  Confiance : <span className="text-amber-300">{(result.confidence.score * 100).toFixed(0)}%</span>
                </p>
              </div>
              <button onClick={() => setShowFullReport(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <Proph3tResultPanel result={result} onApplyAction={onApplyAction} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] text-[9px] text-slate-500 flex items-center justify-between">
        <span>source : {result?.source ?? '—'}</span>
        {result && (
          <button
            onClick={() => execute('eval')}
            className="flex items-center gap-0.5 text-slate-400 hover:text-white"
            title="Rafraîchir l'évaluation"
          >
            <RefreshCw size={9} /> Refresh
          </button>
        )}
      </div>
    </aside>
  )
}
