// ═══ PROPH3T VOLUME PANEL — Dockable par volume (Vol1 / Vol2 / Vol3) ═══
// 3 actions permanentes :
//   • Évaluer  → score instantané sur l'état actuel du volume
//   • Suggérer → propose actions concrètes (placements, ajustements)
//   • Auditer  → compliance + conformité + risques cités
//
// Le panneau écoute le domain event bus → rafraîchissement auto quand
// l'utilisateur modifie des entités dans le volume.

import React, { useState, useEffect, useCallback } from 'react'
import { Sparkles, ChevronRight, ChevronLeft, Gauge, Lightbulb, ShieldCheck, Loader2, RefreshCw } from 'lucide-react'
import { Proph3tResultPanel } from './Proph3tResultPanel'
import { runSkill } from '../orchestrator'
import type { Proph3tResult, Proph3tAction } from '../orchestrator.types'

export type VolumeKind = 'commercial' | 'security' | 'parcours'

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
}

export function Proph3tVolumePanel({
  volume, buildInput, onApplyAction,
  title, position = 'right', open: openProp, onToggle,
}: Props) {
  const cfg = VOLUME_CONFIG[volume]
  const [internalOpen, setInternalOpen] = useState(true)
  const open = openProp ?? internalOpen
  const setOpen = (v: boolean) => { setInternalOpen(v); onToggle?.(v) }

  const [result, setResult] = useState<Proph3tResult<unknown> | null>(null)
  const [running, setRunning] = useState<'eval' | 'suggest' | 'audit' | null>(null)

  const execute = useCallback(async (mode: 'eval' | 'suggest' | 'audit') => {
    if (running) return
    const input = buildInput()
    if (!input) return
    setRunning(mode)
    try {
      // Même skill, mais on pourrait moduler via un "focus" si besoin
      const r = await runSkill(cfg.skill, input)
      setResult(r)
    } catch (err) {
      console.error(`[Proph3tVolumePanel] ${volume} ${mode} failed`, err)
    } finally {
      setRunning(null)
    }
  }, [buildInput, cfg.skill, running, volume])

  // Auto-refresh sur event bus
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    ;(async () => {
      const { eventBus } = await import('../../domain/events')
      const listener = () => {
        if (cancelled) return
        if (timer) clearTimeout(timer)
        // Debounce : ré-évalue 800ms après la dernière modif
        timer = setTimeout(() => {
          if (!cancelled && !running) void execute('eval')
        }, 800)
      }
      // Écoute toutes les mutations pertinentes
      const unsubs = [
        eventBus.on('lot.created', listener),
        eventBus.on('lot.updated', listener),
        eventBus.on('lot.deleted', listener),
        eventBus.on('lot.statusChanged', listener),
        eventBus.on('lot.tenantAssigned', listener),
      ]
      ;(globalThis as any).__proph3t_panel_unsubs = unsubs
    })()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      const unsubs = (globalThis as any).__proph3t_panel_unsubs as Array<() => void> | undefined
      if (unsubs) for (const u of unsubs) u()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Collapsed state
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${position === 'right' ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 px-2 py-3 rounded-lg bg-slate-950/90 border ${cfg.border} text-slate-300 hover:bg-slate-900`}
        style={{ writingMode: 'vertical-rl' }}
        title="Ouvrir PROPH3T"
      >
        <Sparkles size={14} className="text-purple-300" />
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
      className={`fixed ${position === 'right' ? 'right-0' : 'left-0'} top-16 bottom-4 w-[380px] z-30 rounded-l-xl ${position === 'left' ? 'rounded-l-none rounded-r-xl' : ''} bg-slate-950/95 border ${cfg.border} flex flex-col overflow-hidden shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-gradient-to-r from-purple-950/30 to-slate-950">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-300" />
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
        <div className="px-3 py-2 border-b border-white/[0.06] bg-slate-900/40 flex items-center gap-3">
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
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded text-[10px] font-medium border bg-slate-900 border-white/[0.06] text-slate-200 hover:bg-slate-800 disabled:opacity-40`}
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
        {!result ? (
          <div className="text-center py-10 text-slate-500">
            <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[11px]">Cliquez sur une action pour lancer PROPH3T</p>
            <p className="text-[9px] text-slate-600 mt-1">
              Évaluer = score · Suggérer = actions · Auditer = conformité
            </p>
          </div>
        ) : (
          <Proph3tResultPanel result={result} onApplyAction={onApplyAction} compact />
        )}
      </div>

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
