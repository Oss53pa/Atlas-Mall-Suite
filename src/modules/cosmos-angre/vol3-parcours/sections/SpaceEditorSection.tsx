// VOL.3 — Section "Éditer espaces" : interface complète de modification du plan
// (dessin polygone/rect/curve/wall, fusion, découpe, vertex edit) basée sur
// SpaceEditorCanvas. Source de vérité persistante : useEditableSpaceStore.

import React, { useEffect, useMemo, useState } from 'react'
import { Info, Download, RotateCcw } from 'lucide-react'
import { SpaceEditorCanvas, type EditableSpace } from '../../shared/components/SpaceEditorCanvas'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { useEditableSpaceStore } from '../../shared/stores/editableSpaceStore'
import { autoDetectSpaceType } from '../../shared/proph3t/libraries/spaceTypeLibrary'
import { loadAllPlanImages } from '../../shared/stores/planImageCache'
import { useVol3Store } from '../store/vol3Store'

export default function SpaceEditorSection() {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const vol3ActiveFloorId = useVol3Store((s) => s.activeFloorId)
  const { spaces, activeFloor, setSpaces, setActiveFloor, clear } = useEditableSpaceStore()

  const planBounds = useMemo(() => ({
    width: parsedPlan?.bounds.width || 200,
    height: parsedPlan?.bounds.height || 140,
  }), [parsedPlan])

  // Resout le blob URL valide de l'image de plan importe depuis planImageCache
  // (IndexedDB + re-materialisation Blob). On ignore `parsedPlan.imageUrl` car
  // les blob: URLs y meurent apres un refresh. On prend d'abord l'image du
  // floor actif Vol.3 (s'il y en a une), sinon la premiere disponible.
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const all = await loadAllPlanImages()
        if (cancelled) return
        const preferred = vol3ActiveFloorId ? all[vol3ActiveFloorId] : undefined
        const first = preferred ?? Object.values(all)[0]
        setBackgroundUrl(first)
      } catch {
        setBackgroundUrl(undefined)
      }
    })()
    return () => { cancelled = true }
  }, [vol3ActiveFloorId, parsedPlan])

  // Empty state hint
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
          {spaces.length} espace{spaces.length > 1 ? 's' : ''} · {spaces.filter(s => s.validated).length} validé{spaces.filter(s => s.validated).length > 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        {parsedPlan.spaces?.length > 0 && (
          <button onClick={importDetected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-600/30">
            <Download className="w-3 h-3" /> Importer espaces détectés ({parsedPlan.spaces.length})
          </button>
        )}
        <button onClick={() => { if (confirm('Effacer tous les espaces édités ?')) clear() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 text-xs hover:bg-red-900/30">
          <RotateCcw className="w-3 h-3" /> Réinitialiser
        </button>
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
