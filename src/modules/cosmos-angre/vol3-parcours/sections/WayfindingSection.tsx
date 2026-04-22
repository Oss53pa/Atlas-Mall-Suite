import { useCallback, useState } from 'react'
import { Route, Accessibility, Clock, Ruler, Navigation, ChevronRight } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'

export default function WayfindingSection() {
  const pois = useVol3Store((s) => s.pois)
  const currentPath = useVol3Store((s) => s.currentPath)
  const navGraph = useVol3Store((s) => s.navGraph)
  const [fromPoi, setFromPoi] = useState('')
  const [toPoi, setToPoi] = useState('')
  const [pmrOnly, setPmrOnly] = useState(false)

  const calculateWayfinding = useVol3Store((s) => s.calculateWayfinding)
  const buildGraph = useVol3Store((s) => s.buildGraph)
  const [noPath, setNoPath] = useState(false)

  const handleCalculate = useCallback(async () => {
    setNoPath(false)
    // S'assurer que le graphe est construit
    if (!navGraph || navGraph.nodes.length === 0) {
      await buildGraph()
    }
    const result = calculateWayfinding(fromPoi, toPoi, pmrOnly)
    if (!result) setNoPath(true)
  }, [fromPoi, toPoi, pmrOnly, navGraph, calculateWayfinding, buildGraph])

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
          <Route className="w-4 h-4" /> Wayfinding
        </h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Calcul d'itineraire A*</p>
      </div>

      <div className="p-4 space-y-4">
        {/* POI Selectors */}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-mono block mb-1">DEPART</label>
            <select
              value={fromPoi}
              onChange={(e) => setFromPoi(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selectionner un POI...</option>
              {pois.map((p) => (
                <option key={p.id} value={p.id}>{p.label} {p.pmr ? '(PMR)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-mono block mb-1">ARRIVEE</label>
            <select
              value={toPoi}
              onChange={(e) => setToPoi(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selectionner un POI...</option>
              {pois.map((p) => (
                <option key={p.id} value={p.id}>{p.label} {p.pmr ? '(PMR)' : ''}</option>
              ))}
            </select>
          </div>

          {/* PMR Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pmrOnly}
              onChange={(e) => setPmrOnly(e.target.checked)}
              className="rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500"
            />
            <Accessibility className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-gray-300">Itineraire PMR uniquement</span>
          </label>

          <button
            onClick={handleCalculate}
            disabled={!fromPoi || !toPoi}
            className="w-full py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Navigation className="w-3.5 h-3.5" /> Calculer l'itineraire
          </button>
        </div>

        {/* Path Result */}
        {currentPath && (
          <div className="bg-gray-900/50 border border-emerald-800/30 rounded-lg p-3 space-y-3">
            <div className="text-xs font-semibold text-emerald-400">Itineraire calcule</div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Ruler className="w-3 h-3" />
                </div>
                <div className="text-sm font-bold text-white">{currentPath.totalDistanceM}m</div>
                <div className="text-[9px] text-gray-500">Distance</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="text-sm font-bold text-white">{Math.ceil(currentPath.totalTimeSec / 60)}min</div>
                <div className="text-[9px] text-gray-500">Duree</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500">
                  <Accessibility className="w-3 h-3" />
                </div>
                <div className={`text-sm font-bold ${currentPath.pmrCompliant ? 'text-green-400' : 'text-red-400'}`}>
                  {currentPath.pmrCompliant ? 'Oui' : 'Non'}
                </div>
                <div className="text-[9px] text-gray-500">PMR</div>
              </div>
            </div>

            {/* Instructions */}
            {currentPath.instructions.length > 0 && (
              <div>
                <div className="text-[10px] text-gray-500 font-mono mb-1.5">INSTRUCTIONS</div>
                <div className="space-y-1">
                  {currentPath.instructions.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
                      <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No path message */}
        {noPath && !currentPath && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-red-400">Itineraire indisponible — zones non connectees</p>
            <p className="text-[10px] text-red-400/60 mt-1">Construisez le graphe de navigation ou ajoutez des transitions entre les etages.</p>
          </div>
        )}

        {/* Graph Stats */}
        {navGraph && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 font-mono mb-2">GRAPHE NAVIGATION</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Noeuds</span>
                <span className="text-white">{navGraph.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Aretes</span>
                <span className="text-white">{navGraph.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Inter-etages</span>
                <span className="text-white">{navGraph.interFloorEdges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Aretes PMR</span>
                <span className="text-cyan-400">{navGraph.edges.filter((e) => e.pmr).length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
