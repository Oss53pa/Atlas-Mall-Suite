// SHARED — Section "Éditeur d'espaces" partagée entre Vol.1 / Vol.2 / Vol.3.
//
// Interface d'édition polygonale du plan basée sur SpaceEditorCanvas.
// Source de vérité persistante : useEditableSpaceStore (commun).
//
// Ce composant n'a AUCUNE dépendance à un volume spécifique — il fonctionne
// à l'identique dans les 3 volumes pour garantir que l'import + l'édition
// restent une seule et même source du plan.
//
// Tabs:
//   Éditeur — SpaceEditorCanvas (édition polygonale)
//   Carte    — MapViewerShell  (visualisation 2D / 3D / AR)

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info, Download, RotateCcw, AlertTriangle, PenLine, Map, FileText, ChevronDown } from 'lucide-react'
import { SpaceEditorCanvas, type EditableSpace } from './SpaceEditorCanvas'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import { usePlanImportStore } from '../stores/planImportStore'
import { autoDetectSpaceType } from '../proph3t/libraries/spaceTypeLibrary'
import { loadAllPlanImages } from '../stores/planImageCache'
import MapViewerShell from '../map-viewer/MapViewerShell'
import { safeImageUrl } from '../../../../lib/urlSafety'
import { getPlanFile } from '../stores/planFileCache'
import { importPlan } from '../planReader'

type SectionTab = 'editor' | 'map'

export default function SpaceEditorSection() {
  const [tab, setTab] = useState<SectionTab>('editor')
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const loadParsedPlan = usePlanEngineStore((s) => s.loadParsedPlan)
  const parsedPlans = usePlanEngineStore((s) => s.parsedPlans)
  const { spaces, activeFloor, setSpaces, setActiveFloor, clear } = useEditableSpaceStore()

  // ─── Imports disponibles (pour choisir quel plan éditer) ───
  const imports = usePlanImportStore((s) => s.imports)
  const activeImport = useMemo(() => {
    if (!parsedPlan) return null
    // Cherche quel importId correspond au parsedPlan actif (match par référence)
    const entry = Object.entries(parsedPlans).find(([, p]) => p === parsedPlan)
    return entry ? imports.find(i => i.id === entry[0]) ?? null : imports[0] ?? null
  }, [parsedPlan, parsedPlans, imports])

  const [rebuilding, setRebuilding] = useState<string | null>(null)

  /** Rebuild un ParsedPlan à la volée depuis le fichier DXF/PDF brut en cache.
   *  Nécessaire pour les imports antérieurs au wiring setParsedPlan (ou si
   *  le cache Dexie byImport a été vidé). */
  const rebuildParsedPlan = useCallback(async (importId: string): Promise<boolean> => {
    const rec = imports.find(i => i.id === importId)
    if (!rec) return false
    setRebuilding(importId)
    try {
      const file = await getPlanFile(importId)
      if (!file) {
        console.warn('[SpaceEditor] Fichier brut introuvable pour', importId)
        return false
      }
      const state = await importPlan(file, rec.floorId)
      if (!state.parsedPlan) {
        console.warn('[SpaceEditor] Reparse a échoué — pas de parsedPlan', importId)
        return false
      }
      const engine = usePlanEngineStore.getState()
      engine.storeParsedPlan(importId, state.parsedPlan)
      engine.setParsedPlan(state.parsedPlan)
      engine.setSpaces(state.parsedPlan.spaces)
      engine.setLayers(state.parsedPlan.layers)
      return true
    } catch (err) {
      console.warn('[SpaceEditor] Rebuild a échoué', err)
      return false
    } finally {
      setRebuilding(null)
    }
  }, [imports])

  const handleSwitchImport = useCallback(async (importId: string) => {
    const success = loadParsedPlan(importId)
    if (success) return
    // Fallback : rebuild depuis le fichier brut en cache
    console.log('[SpaceEditor] Plan non indexé — tentative de rebuild depuis planFileCache', importId)
    await rebuildParsedPlan(importId)
  }, [loadParsedPlan, rebuildParsedPlan])

  // Auto-charge : si aucun parsedPlan actif mais qu'un import existe :
  //   1. Si indexé dans parsedPlans → loadParsedPlan direct (rapide)
  //   2. Sinon → rebuild depuis planFileCache (fichier brut persisté)
  useEffect(() => {
    if (parsedPlan) return
    if (imports.length === 0) return
    const indexed = imports.find(imp => parsedPlans[imp.id])
    if (indexed) {
      loadParsedPlan(indexed.id)
      return
    }
    // Aucun parsedPlan indexé → reparse auto du plus récent
    const mostRecent = [...imports].sort((a, b) =>
      b.importedAt.localeCompare(a.importedAt),
    )[0]
    if (mostRecent && !rebuilding) void rebuildParsedPlan(mostRecent.id)
  }, [parsedPlan, imports, parsedPlans, loadParsedPlan, rebuildParsedPlan, rebuilding])

  const planBounds = useMemo(() => ({
    width: parsedPlan?.bounds.width || 200,
    height: parsedPlan?.bounds.height || 140,
  }), [parsedPlan])

  // Recharge l'image de fond depuis le plan actif (import sélectionné).
  // Priorité : planImageUrl de l'import actif > première image du cache IndexedDB.
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // 1. Si un import est sélectionné, prioriser son image
        const safeActive = safeImageUrl(activeImport?.planImageUrl)
        if (safeActive) {
          if (!cancelled) setBackgroundUrl(safeActive)
          return
        }
        // 2. Sinon fallback sur première image IndexedDB
        const all = await loadAllPlanImages()
        if (cancelled) return
        const firstSafe = Object.values(all).map(safeImageUrl).find(Boolean)
        setBackgroundUrl(firstSafe)
      } catch {
        if (!cancelled) setBackgroundUrl(undefined)
      }
    })()
    return () => { cancelled = true }
  }, [parsedPlan, activeImport])

  // Empty state
  if (!parsedPlan) {
    const hasImportsButNoPlan = imports.length > 0
    return (
      <div className="h-full flex items-center justify-center bg-[#080c14] text-gray-400">
        <div className="max-w-md text-center space-y-3 p-6">
          <Info className="w-8 h-8 mx-auto text-amber-400/70" />
          <h2 className="text-lg font-semibold text-white">
            {hasImportsButNoPlan ? 'Sélectionnez un plan à éditer' : 'Aucun plan importé'}
          </h2>
          {hasImportsButNoPlan ? (
            <>
              <p className="text-sm">
                {rebuilding
                  ? `Reconstruction du plan en cours… (parse DXF/PDF)`
                  : `${imports.length} plan${imports.length > 1 ? 's' : ''} disponible${imports.length > 1 ? 's' : ''}. Choisissez-en un :`}
              </p>
              <div className="flex flex-col gap-1.5 mt-2 text-left">
                {imports.map(imp => {
                  const isBuilding = rebuilding === imp.id
                  return (
                    <button
                      key={imp.id}
                      onClick={() => handleSwitchImport(imp.id)}
                      disabled={!!rebuilding}
                      className="px-3 py-2 rounded-lg bg-atlas-500/10 border border-atlas-500/30 text-atlas-200 text-[12px] hover:bg-atlas-500/20 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                    >
                      <FileText size={12} />
                      <span className="flex-1 truncate">{imp.fileName}</span>
                      {imp.floorLevel && <span className="text-[10px] text-slate-500">{imp.floorLevel}</span>}
                      {isBuilding && <span className="text-[10px] text-atlas-400 animate-pulse">rebuild…</span>}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-slate-600 mt-2">
                Si aucun fichier brut n'a été mis en cache (ancien import), re-importez le plan depuis l'onglet <span className="text-emerald-400">Import</span>.
              </p>
            </>
          ) : (
            <p className="text-sm">
              Importez un plan DXF/PDF depuis l'onglet <span className="text-emerald-400">Import</span>{' '}
              pour pouvoir dessiner et éditer les espaces.
            </p>
          )}
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

      {/* ─── Tab bar + editor header ─── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800/60 shrink-0">

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 bg-surface-1 border border-white/10 rounded-lg p-0.5 mr-1">
          <button
            onClick={() => setTab('editor')}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all',
              tab === 'editor'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white',
            ].join(' ')}
          >
            <PenLine size={11} /> Éditeur
          </button>
          <button
            onClick={() => setTab('map')}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all',
              tab === 'map'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white',
            ].join(' ')}
          >
            <Map size={11} /> Carte
          </button>
        </div>

        {/* ─── Sélecteur de plan (dropdown toujours visible dès qu'on a ≥1 import) ─── */}
        {imports.length > 0 && (
          <div className="flex items-center gap-1.5">
            <FileText size={11} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Plan :</span>
            <div className="relative">
              <select
                value={activeImport?.id ?? ''}
                onChange={(e) => handleSwitchImport(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1 rounded-md bg-surface-1 border border-white/[0.08] text-[11px] text-slate-200 hover:border-atlas-500/40 focus:outline-none focus:border-atlas-500/50 cursor-pointer min-w-[220px]"
              >
                {imports.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    {imp.fileName}{imp.floorLevel ? ` · ${imp.floorLevel}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <span className="text-[9px] text-slate-600 ml-1">
              ({imports.length} import{imports.length > 1 ? 's' : ''} disponible{imports.length > 1 ? 's' : ''})
            </span>
          </div>
        )}

        {tab === 'editor' && (
          <>
            <span className="text-[11px] text-gray-500">
              {spaces.length} espace{spaces.length > 1 ? 's' : ''} dessiné{spaces.length > 1 ? 's' : ''}
              {spaces.length > 0 && ` · ${spaces.filter(s => s.validated).length} validé${spaces.filter(s => s.validated).length > 1 ? 's' : ''}`}
            </span>
            <span className="text-[10px] text-slate-600 ml-2">
              Le plan DXF sert de fond — dessine TES propres espaces dessus
            </span>
          </>
        )}

        <div className="flex-1" />

        {tab === 'editor' && (
          <>
            {/* Bouton "Importer espaces détectés" */}
            {parsedPlan.spaces?.length > 0 && spaces.length === 0 && (
              <details className="relative">
                <summary className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer select-none px-2 py-1 rounded hover:bg-white/5">
                  Options avancées
                </summary>
                <div className="absolute right-0 top-full mt-1 w-64 rounded-lg bg-surface-1 border border-white/10 shadow-xl z-10 p-2">
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
          </>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 min-h-0">
        {tab === 'editor' && (
          <SpaceEditorCanvas
            planBounds={planBounds}
            spaces={spaces}
            onSpacesChange={setSpaces}
            backgroundUrl={backgroundUrl}
            activeFloor={activeFloor}
            onFloorChange={setActiveFloor}
          />
        )}
        {tab === 'map' && (
          <MapViewerShell className="h-full" />
        )}
      </div>
    </div>
  )
}
