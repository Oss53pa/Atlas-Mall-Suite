// ═══ SIGNAGE MEMORY PANEL ═══
// Visualise la base de patterns validés inter-projets.
// Montre les corrections PROPH3T suggère sur le projet courant et permet
// de les accepter en masse ou individuellement.

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Brain, Sparkles, CheckCircle, XCircle, Loader2, TrendingUp,
  Award, RefreshCw,
} from 'lucide-react'
import {
  findMatchingPatterns, incrementPatternValidation, getMemoryStats,
  type PatternMatch, type PatternType, type SignagePattern,
} from '../services/signageMemoryService'
import {
  useSpaceCorrectionsStore, CATEGORY_META, type SpaceCategory,
} from '../stores/spaceCorrectionsStore'
import { usePlanEngineStore } from '../stores/planEngineStore'

interface Props {
  projetId: string
  onClose: () => void
}

const TYPE_META: Record<PatternType, { label: string; icon: string; color: string }> = {
  'label-correction':    { label: 'Renommage libellé',   icon: '✏', color: '#3b82f6' },
  'category-correction': { label: 'Catégorie',            icon: '🏷', color: '#a855f7' },
  'panel-placement':     { label: 'Emplacement panneau',  icon: '📍', color: '#f59e0b' },
  'layer-classification':{ label: 'Classification calque', icon: '📚', color: '#10b981' },
  'exclusion':           { label: 'Exclusion',            icon: '⊘', color: '#ef4444' },
}

export function SignageMemoryPanel({ projetId, onClose }: Props) {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const spaceCorrections = useSpaceCorrectionsStore()

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMemoryStats>> | null>(null)
  const [matches, setMatches] = useState<Record<string, PatternMatch[]>>({})
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)

  // Charger les matches pour chaque space du plan courant
  const loadMatches = async () => {
    if (!parsedPlan) return
    setLoading(true)
    try {
      const [s, stat] = await Promise.all([
        findMatchingPatterns(
          (parsedPlan.spaces ?? []).flatMap(sp => [
            { type: 'label-correction' as PatternType, raw: sp.label },
            { type: 'category-correction' as PatternType, raw: sp.label },
            { type: 'exclusion' as PatternType, raw: sp.label },
          ]),
          { excludeProject: projetId, minConfidence: 0.4, minSimilarity: 0.65 },
        ),
        getMemoryStats(),
      ])
      setMatches(s)
      setStats(stat)
    } catch (err) {
       
      console.warn('[SignageMemoryPanel] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMatches() }, [parsedPlan, projetId])

  // Regrouper les suggestions par space concerné
  const spacesSuggestions = useMemo(() => {
    if (!parsedPlan) return []
    const out: Array<{
      spaceId: string
      spaceLabel: string
      suggestions: Array<{ type: PatternType; matches: PatternMatch[] }>
    }> = []
    for (const s of (parsedPlan.spaces ?? [])) {
      const types: PatternType[] = ['label-correction', 'category-correction', 'exclusion']
      const suggestions = types
        .map(t => {
          const key = `${t}::${s.label.trim().toUpperCase().replace(/[\s/\-.,;:]+/g, '_').replace(/[^A-Z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')}`
          const raw = matches[key] ?? []
          return { type: t, matches: raw }
        })
        .filter(sug => sug.matches.length > 0)
      if (suggestions.length > 0) {
        out.push({ spaceId: s.id, spaceLabel: s.label, suggestions })
      }
    }
    return out
  }, [parsedPlan, matches])

  const applyPattern = async (spaceId: string, pattern: SignagePattern) => {
    setApplying(pattern.id)
    try {
      const v = pattern.applied_value
      if (pattern.pattern_type === 'label-correction') {
        spaceCorrections.setCorrection(spaceId, { customLabel: String(v.label ?? '') })
      } else if (pattern.pattern_type === 'category-correction') {
        spaceCorrections.setCorrection(spaceId, { category: v.category as SpaceCategory })
      } else if (pattern.pattern_type === 'exclusion') {
        spaceCorrections.setCorrection(spaceId, { excluded: true })
      }
      await incrementPatternValidation(pattern.id, true)
    } finally {
      setApplying(null)
    }
  }

  const rejectPattern = async (pattern: SignagePattern) => {
    await incrementPatternValidation(pattern.id, false)
    // Retire cette suggestion localement
    setMatches(prev => {
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        next[k] = next[k].filter(m => m.pattern.id !== pattern.id)
      }
      return next
    })
  }

  const applyAll = async () => {
    if (spacesSuggestions.length === 0) return
    setApplying('all')
    try {
      for (const s of spacesSuggestions) {
        for (const sug of s.suggestions) {
          const best = sug.matches[0]
          if (best && best.pattern.confidence_score >= 0.75) {
            await applyPattern(s.spaceId, best.pattern)
          }
        }
      }
    } finally {
      setApplying(null)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[560px] max-w-[95vw] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Mémoire inter-projets</h2>
            {stats && (
              <span className="text-[10px] text-slate-500">
                {stats.totalPatterns} patterns · confiance moyenne {(stats.averageConfidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadMatches}
              disabled={loading}
              className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-50"
              title="Recalculer les suggestions"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats top */}
        {stats && (
          <div className="px-5 py-3 border-b border-white/5 bg-slate-950/40">
            <div className="grid grid-cols-5 gap-2 text-[10px]">
              {(Object.keys(TYPE_META) as PatternType[]).map(t => {
                const meta = TYPE_META[t]
                const count = stats.byType[t] ?? 0
                return (
                  <div key={t} className="text-center" title={meta.label}>
                    <div className="text-lg mb-0.5">{meta.icon}</div>
                    <div className="text-[9px] text-slate-600 truncate">{meta.label.split(' ')[0]}</div>
                    <div className="font-bold tabular-nums" style={{ color: meta.color }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Apply all */}
        {spacesSuggestions.length > 0 && (
          <div className="px-5 py-2 border-b border-white/5">
            <button
              onClick={applyAll}
              disabled={applying === 'all'}
              className="w-full py-2 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {applying === 'all'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Application…</>
                : <><Sparkles className="w-4 h-4" /> Appliquer toutes les suggestions (confiance ≥ 75%)</>
              }
            </button>
          </div>
        )}

        {/* Liste suggestions par space */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Recherche patterns…
            </div>
          )}

          {!loading && spacesSuggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Award className="w-8 h-8 text-purple-500 mb-2" />
              <p className="text-sm">Aucun pattern applicable sur ce plan.</p>
              <p className="text-[11px] text-slate-600 mt-2">
                À mesure que vous validez des corrections sur différents projets, PROPH3T apprend et propose automatiquement les patterns les plus pertinents sur les nouveaux plans.
              </p>
            </div>
          )}

          {!loading && spacesSuggestions.map(entry => (
            <div key={entry.spaceId} className="mb-3 rounded-md border border-white/10 bg-slate-950/60 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900/80 border-b border-white/5">
                <div className="text-[11px] font-mono text-slate-300 truncate">{entry.spaceLabel}</div>
                <div className="text-[9px] text-slate-600 font-mono">#{entry.spaceId.slice(0, 8)}</div>
              </div>
              <div className="p-2 space-y-2">
                {entry.suggestions.map(sug => {
                  const best = sug.matches[0]
                  if (!best) return null
                  const meta = TYPE_META[sug.type]
                  return (
                    <div key={sug.type} className="px-2.5 py-2 rounded bg-slate-900/60 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: meta.color }}
                          >
                            {meta.icon}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-200">
                            {meta.label}
                          </span>
                          <span className="text-[9px] text-emerald-400 tabular-nums">
                            {(best.pattern.confidence_score * 100).toFixed(0)}% conf.
                          </span>
                          <span className="text-[9px] text-slate-500 tabular-nums">
                            {(best.similarity * 100).toFixed(0)}% sim.
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => applyPattern(entry.spaceId, best.pattern)}
                            disabled={applying === best.pattern.id}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                            title="Appliquer"
                          >
                            {applying === best.pattern.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => rejectPattern(best.pattern)}
                            className="px-2 py-1 rounded text-[10px] text-slate-400 hover:bg-red-950/40 hover:text-red-300"
                            title="Rejeter ce pattern"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 m-0 leading-snug">
                        {best.suggestion}
                      </p>
                      {best.pattern.applied_on_projects.length > 1 && (
                        <p className="text-[9px] text-slate-600 mt-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Validé sur {best.pattern.applied_on_projects.length} projet{best.pattern.applied_on_projects.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
