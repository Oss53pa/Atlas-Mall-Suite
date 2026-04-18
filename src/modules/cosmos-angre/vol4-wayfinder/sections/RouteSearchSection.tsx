// ═══ VOL.4 · Section Recherche & Itinéraire ═══
//
// Cœur UX du Wayfinder : recherche d'une destination, calcul d'itinéraire,
// affichage des instructions pas-à-pas, modes (Standard / PMR / Rapide / Découverte).

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Navigation, Accessibility, Zap, Sparkles, Clock, ArrowRight,
  Star, History, X, Volume2, VolumeX, MapPin,
} from 'lucide-react'
import { useVol4Store } from '../store/vol4Store'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { usePlanImportStore } from '../../shared/stores/planImportStore'
import {
  buildWayfinderGraph, buildWayfinderCatalog, nearestGraphNode,
} from '../engines/wayfinderBridge'
import { buildSearchIndex, search, contextualSuggestions } from '../engines/searchEngine'
import type { SearchResult } from '../engines/searchEngine'
import { calculateRoute } from '../engines/astarEngine'
import type { RouteMode } from '../engines/astarEngine'

const MODE_META: Record<RouteMode, { label: string; icon: React.FC<{ size?: number }>; color: string; hint: string }> = {
  standard:   { label: 'Standard',   icon: Navigation,     color: '#38bdf8', hint: 'Plus équilibré (distance + confort)' },
  pmr:        { label: 'PMR',        icon: Accessibility,  color: '#c084fc', hint: 'Accessible · ascenseurs & rampes' },
  fast:       { label: 'Rapide',     icon: Zap,            color: '#fbbf24', hint: 'Chemin le plus court uniquement' },
  discovery:  { label: 'Découverte', icon: Sparkles,       color: '#f472b6', hint: 'Passe devant les meilleures enseignes' },
  evacuation: { label: 'Évacuation', icon: X,              color: '#ef4444', hint: 'Sortie de secours la plus proche' },
}

export default function RouteSearchSection() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const imports = usePlanImportStore(s => s.imports)

  const {
    currentPosition, defaultMode, pmrMode, activePersona,
    favorites, history, blockedEdgeIds,
    voiceGuidance, setVoiceGuidance,
    setRoute, touchHistory, addFavorite, removeFavorite, logRoute,
    setDefaultMode, currentRoute,
  } = useVol4Store()

  const [mode, setMode] = useState<RouteMode>(pmrMode ? 'pmr' : defaultMode)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  // ─── Catalogue & graphe (dérivés du ParsedPlan, zero-mock) ───
  const { catalog, graph, anchorByRefId } = useMemo(() => {
    if (!parsedPlan) return { catalog: [], graph: null, anchorByRefId: new Map<string, string>() }
    const g = buildWayfinderGraph({ parsedPlan })
    const cat = buildWayfinderCatalog({ parsedPlan })
    return { catalog: cat, graph: g.graph, anchorByRefId: g.anchorByRefId }
  }, [parsedPlan])

  const searchIndex = useMemo(() => catalog.length ? buildSearchIndex(catalog) : null, [catalog])

  // Distance A* depuis position (utilisée pour tri / filtres)
  const distanceFn = useCallback((itemId: string): number | null => {
    if (!graph || !currentPosition) return null
    const fromNodeId = nearestGraphNode(graph, currentPosition.x, currentPosition.y)
    const toAnchorId = anchorByRefId.get(itemId)
    if (!fromNodeId || !toAnchorId) return null
    const r = calculateRoute(graph, fromNodeId, toAnchorId, 'fast', { blockedEdgeIds })
    return r?.lengthM ?? null
  }, [graph, currentPosition, anchorByRefId, blockedEdgeIds])

  // Recherche live
  useEffect(() => {
    if (!searchIndex) { setResults([]); return }
    const r = search(searchIndex, { q: query, distanceFn, limit: 15 })
    setResults(r)
  }, [query, searchIndex, distanceFn])

  // Suggestions contextuelles
  const suggestions = useMemo(() => {
    if (!searchIndex || !currentPosition) return []
    return contextualSuggestions({
      index: searchIndex,
      currentPosition,
      distanceFn,
      maxItemsPerCategory: 4,
    })
  }, [searchIndex, currentPosition, distanceFn])

  // ─── Lancement d'un itinéraire ───
  const goTo = useCallback((itemId: string, label: string) => {
    if (!graph || !currentPosition) return
    const fromNodeId = nearestGraphNode(graph, currentPosition.x, currentPosition.y)
    const toAnchorId = anchorByRefId.get(itemId)
    if (!fromNodeId || !toAnchorId) return
    const r = calculateRoute(graph, fromNodeId, toAnchorId, mode, { blockedEdgeIds })
    if (!r) return
    setRoute(r, fromNodeId, toAnchorId)
    touchHistory(itemId, label)
    logRoute({
      fromRefId: fromNodeId,
      toRefId: itemId,
      mode, distanceM: r.lengthM, durationS: r.durationS,
      recalculated: false,
      timestamp: Date.now(),
    })
    // Vocal (TTS natif navigateur)
    if (voiceGuidance && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(`Itinéraire calculé vers ${label}. ${Math.round(r.lengthM)} mètres. Environ ${Math.round(r.durationS / 60)} minutes.`)
      utter.lang = 'fr-FR'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }
  }, [graph, currentPosition, anchorByRefId, mode, blockedEdgeIds, setRoute, touchHistory, logRoute, voiceGuidance])

  // Bascule mode PMR → propage dans le store
  const changeMode = useCallback((m: RouteMode) => {
    setMode(m)
    setDefaultMode(m)
  }, [setDefaultMode])

  // ─── Empty state ───
  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <MapPin size={48} className="text-slate-600 mb-4" />
        <h3 className="text-slate-200 font-semibold mb-1">Aucun plan importé</h3>
        <p className="text-slate-500 text-sm max-w-md">
          Importez un plan DXF / PDF / image depuis l'onglet « Plans importés » pour activer le Wayfinder.
          Le graphe de navigation, le catalogue et les ancres seront construits automatiquement.
        </p>
        <p className="text-[11px] text-slate-600 mt-3">
          {imports.length} import{imports.length > 1 ? 's' : ''} disponible{imports.length > 1 ? 's' : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white text-xl font-semibold">Recherche & itinéraire</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {catalog.length} destinations indexées · Graphe : {graph?.nodes.length ?? 0} nœuds / {graph?.edges.length ?? 0} arêtes
            </p>
          </div>
          <button
            onClick={() => setVoiceGuidance(!voiceGuidance)}
            className={`p-2 rounded-lg ${voiceGuidance ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-500 hover:bg-white/5'}`}
            title="Guidage vocal"
          >
            {voiceGuidance ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(MODE_META) as RouteMode[]).filter(m => m !== 'evacuation').map(m => {
            const meta = MODE_META[m]
            const Icon = meta.icon
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border`}
                style={{
                  background: active ? `${meta.color}18` : 'transparent',
                  color: active ? meta.color : '#64748b',
                  borderColor: active ? `${meta.color}40` : 'transparent',
                }}
                title={meta.hint}
              >
                <Icon size={12} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto">
        {/* ─── Colonne gauche : recherche ─── */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher une enseigne, un service, un sanitaire…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06] text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500/40"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Résultats */}
          {query && (
            <div className="rounded-lg bg-slate-900/40 border border-white/[0.05] divide-y divide-white/[0.04] overflow-hidden">
              {results.length === 0 && (
                <div className="p-4 text-[12px] text-slate-500 text-center">Aucun résultat — essayez un autre terme</div>
              )}
              {results.map(r => (
                <button
                  key={r.item.id}
                  onClick={() => goTo(r.item.id, r.item.label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition"
                >
                  <span className="text-lg">{r.item.icon ?? '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white font-medium truncate"
                      dangerouslySetInnerHTML={{ __html: r.highlight.replace(/〘/g, '<mark class="bg-sky-500/30 text-sky-200">').replace(/〙/g, '</mark>') }} />
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>{r.item.floorLabel ?? r.item.floorId}</span>
                      <span>·</span>
                      <span>{r.item.category}</span>
                      {r.distanceM != null && <>
                        <span>·</span>
                        <span className="text-sky-400">{Math.round(r.distanceM)} m</span>
                      </>}
                    </div>
                  </div>
                  <ArrowRight size={12} className="text-slate-600" />
                </button>
              ))}
            </div>
          )}

          {/* Suggestions contextuelles */}
          {!query && suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] text-slate-500 uppercase tracking-wider">À proximité</h3>
              {suggestions.map(g => (
                <div key={g.category}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{g.icon}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{g.label}</span>
                    <span className="text-[10px] text-slate-600">({g.items.length})</span>
                  </div>
                  <div className="space-y-1">
                    {g.items.map(r => (
                      <button key={r.item.id}
                        onClick={() => goTo(r.item.id, r.item.label)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/30 border border-white/[0.04] hover:border-sky-500/30 text-left text-[11px]">
                        <span className="flex-1 text-slate-200 truncate">{r.item.label}</span>
                        {r.distanceM != null && <span className="text-sky-400 text-[10px]">{Math.round(r.distanceM)} m</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Favoris */}
          {!query && favorites.length > 0 && (
            <div>
              <h3 className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Star size={11} /> Favoris
              </h3>
              <div className="space-y-1">
                {favorites.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-600/5 border border-amber-500/15 text-[11px]">
                    <button onClick={() => goTo(f.itemId, f.label)} className="flex-1 text-left text-slate-200">{f.label}</button>
                    <button onClick={() => removeFavorite(f.id)} className="text-slate-600 hover:text-red-400">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique */}
          {!query && history.length > 0 && (
            <div>
              <h3 className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <History size={11} /> Récent
              </h3>
              <div className="space-y-1">
                {history.slice(0, 5).map(h => (
                  <button key={h.id} onClick={() => goTo(h.itemId, h.label)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/30 border border-white/[0.04] text-[11px] text-slate-300 text-left">
                    <Clock size={10} className="text-slate-500" />
                    <span className="flex-1">{h.label}</span>
                    <span className="text-slate-600 text-[10px]">{h.count}×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Colonne droite : itinéraire courant ─── */}
        <div className="flex flex-col min-h-0">
          {currentRoute ? (
            <div className="rounded-xl bg-slate-900/40 border border-sky-500/20 p-4 flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                  <Navigation size={14} className="text-sky-400" />
                  Itinéraire · {MODE_META[currentRoute.mode].label}
                </h3>
                <button onClick={() => setRoute(null)} className="text-slate-500 hover:text-white p-1">
                  <X size={13} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-950/40 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Distance</div>
                  <div className="text-base text-sky-300 font-semibold">{Math.round(currentRoute.lengthM)} m</div>
                </div>
                <div className="bg-slate-950/40 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Durée</div>
                  <div className="text-base text-sky-300 font-semibold">{Math.round(currentRoute.durationS / 60)} min</div>
                </div>
                <div className="bg-slate-950/40 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Calcul</div>
                  <div className="text-base text-emerald-400 font-semibold">{currentRoute.computeTimeMs.toFixed(0)} ms</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {currentRoute.instructions.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11px]">
                    <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-semibold ${
                      ins.kind === 'start' ? 'bg-emerald-600/20 text-emerald-400' :
                      ins.kind === 'arrive' ? 'bg-amber-600/20 text-amber-400' :
                      ins.kind === 'transit' ? 'bg-purple-600/20 text-purple-400' :
                      'bg-sky-600/20 text-sky-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200">{ins.text}</div>
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        {ins.distFromPrevM > 0 && `${Math.round(ins.distFromPrevM)} m`}
                        {ins.distToEndM > 0 && ins.kind !== 'arrive' && ` · reste ${Math.round(ins.distToEndM)} m`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ajout favoris rapide */}
              {currentRoute.instructions.length > 0 && (
                <button
                  onClick={() => {
                    const last = currentRoute.instructions[currentRoute.instructions.length - 1]
                    if (!last.landmark) return
                    addFavorite({
                      itemId: last.nodeId,
                      label: last.landmark,
                      floorId: last.floorId ?? 'RDC',
                    })
                  }}
                  className="mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600/10 border border-amber-500/20 text-[11px] text-amber-300 hover:bg-amber-600/20"
                >
                  <Star size={11} />
                  Ajouter aux favoris
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-8 flex flex-col items-center justify-center text-center h-full">
              <Navigation size={32} className="text-slate-700 mb-3" />
              <h3 className="text-slate-400 text-sm">Aucun itinéraire actif</h3>
              <p className="text-slate-600 text-xs mt-1 max-w-xs">
                Recherchez ou sélectionnez une destination pour calculer un parcours depuis votre position.
              </p>
              {!currentPosition && (
                <p className="text-[10px] text-amber-400/80 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                  Position courante inconnue · calibrer dans l'onglet Positionnement
                </p>
              )}
            </div>
          )}

          {/* Persona badge */}
          <div className="mt-3 text-[10px] text-slate-600 text-center">
            Persona actif : <span className="text-purple-400">{activePersona}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
