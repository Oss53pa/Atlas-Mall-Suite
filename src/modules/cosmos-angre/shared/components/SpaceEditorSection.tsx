// SHARED — Section "Éditeur d'espaces" partagée entre Vol.1 / Vol.2 / Vol.3.
//
// Interface d'édition polygonale du plan basée sur SpaceEditorCanvas.
// Source de vérité persistante : useEditableSpaceStore (commun).
//
// Ce composant n'a AUCUNE dépendance à un volume spécifique — il fonctionne
// à l'identique dans les 3 volumes pour garantir que l'import + l'édition
// restent une seule et même source du plan.

import { useEffect, useMemo, useState } from 'react'
import { Info, Download, RotateCcw, AlertTriangle } from 'lucide-react'
import { SpaceEditorCanvas, type EditableSpace } from './SpaceEditorCanvas'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import { autoDetectSpaceType } from '../proph3t/libraries/spaceTypeLibrary'
import { loadAllPlanImages } from '../stores/planImageCache'

export default function SpaceEditorSection() {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const { spaces, activeFloor, setSpaces, setActiveFloor, clear } = useEditableSpaceStore()

  const planBounds = useMemo(() => ({
    width: parsedPlan?.bounds.width || 200,
    height: parsedPlan?.bounds.height || 140,
  }), [parsedPlan])

  // Recharge l'image de fond depuis IndexedDB (survit aux refreshes).
  // On prend la première image disponible — l'utilisateur peut changer le
  // niveau dans la toolbar de SpaceEditorCanvas.
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const all = await loadAllPlanImages()
        if (cancelled) return
        setBackgroundUrl(Object.values(all)[0])
      } catch {
        setBackgroundUrl(undefined)
      }
    })()
    return () => { cancelled = true }
  }, [parsedPlan])

  // Empty state
  if (!parsedPlan) {
    return (
      <div className="h-full flex items-center justify-center bg-[#080c14] text-gray-400">
        <div className="max-w-md text-center space-y-3 p-6">
          <Info className="w-8 h-8 mx-auto text-amber-400/70" />
          <h2 className="text-lg font-semibold text-white">Aucun plan importé</h2>
          <p className="text-sm">
            Importez un plan DXF/PDF depuis l'onglet <span className="text-emerald-400">Plans importés</span>{' '}
            pour pouvoir dessiner et éditer les espaces.
          </p>
        </div>
      </div>
    )
  }

  function importDetected() {
    if (!parsedPlan) return
    const imported: EditableSpace[] = parsedPlan.spaces.map((s, i) => ({
      id: s.id ?? `det-${i}`,
      name: s.label || `Espace ${i + 1}`,
      type: autoDetectSpaceType(s.label ?? ''),
      polygon: s.polygon.map(([x, y]) => ({ x, y })),
      floorLevel: activeFloor,
      validated: false,
    }))
    setSpaces([...spaces, ...imported])
  }

  return (
    <div className="h-full flex flex-col bg-[#080c14]">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800/60 shrink-0">
        <h2 className="text-sm font-semibold text-white">Éditeur d'espaces</h2>
        <span className="text-[11px] text-gray-500">
          {spaces.length} espace{spaces.length > 1 ? 's' : ''} dessiné{spaces.length > 1 ? 's' : ''}
          {spaces.length > 0 && ` · ${spaces.filter(s => s.validated).length} validé${spaces.filter(s => s.validated).length > 1 ? 's' : ''}`}
        </span>
        <span className="text-[10px] text-slate-600 ml-2">
          Le plan DXF sert de fond — dessine TES propres espaces dessus
        </span>
        <div className="flex-1" />
        {/* Bouton "Importer espaces détectés" — caché par défaut pour éviter de
            polluer l'éditeur avec les 500+ polygones auto-détectés par le parser.
            Disponible sous forme de petit bouton discret pour les cas avancés. */}
        {parsedPlan.spaces?.length > 0 && spaces.length === 0 && (
          <details className="relative">
            <summary className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer select-none px-2 py-1 rounded hover:bg-white/5">
              Options avancées
            </summary>
            <div className="absolute right-0 top-full mt-1 w-64 rounded-lg bg-slate-900 border border-white/10 shadow-xl z-10 p-2">
              <div className="flex items-start gap-2 p-2 rounded bg-amber-950/20 border border-amber-900/30 text-[10px] text-amber-200 mb-2">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                <span>Attention : le parser DXF a détecté <strong>{parsedPlan.spaces.length} polygones</strong>. Importer les ajoute TOUS d'un coup — souvent pollue le plan.</span>
              </div>
              <button onClick={importDetected}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[10px] hover:bg-emerald-600/30">
                <Download className="w-3 h-3" /> Importer quand même ({parsedPlan.spaces.length})
              </button>
            </div>
          </details>
        )}
        {spaces.length > 0 && (
          <button onClick={() => { if (confirm('Effacer tous les espaces édités ?')) clear() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 text-xs hover:bg-red-900/30">
            <RotateCcw className="w-3 h-3" /> Réinitialiser
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <SpaceEditorCanvas
          planBounds={planBounds}
          spaces={spaces}
          onSpacesChange={setSpaces}
          backgroundUrl={backgroundUrl}
          activeFloor={activeFloor}
          onFloorChange={setActiveFloor}
        />
      </div>
    </div>
  )
}
