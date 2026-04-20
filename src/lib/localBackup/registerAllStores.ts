// ═══ REGISTER ALL STORES ═══
//
// Enregistre tous les stores Atlas dans l'orchestrateur de backup local.
// Définit un `partialize` par store pour exclure flags transitoires,
// promesses en vol, blob URLs, fonctions, etc.

import { registerStore } from './backupOrchestrator'
import { useAppStore } from '../../stores/appStore'
import { useVol1Store } from '../../modules/cosmos-angre/vol1-commercial/store/vol1Store'
import { useVol2Store } from '../../modules/cosmos-angre/vol2-securitaire/store/vol2Store'
import { useVol3Store } from '../../modules/cosmos-angre/vol3-parcours/store/vol3Store'
import { useVol4Store } from '../../modules/cosmos-angre/vol4-wayfinder/store/vol4Store'
import { usePlanEngineStore } from '../../modules/cosmos-angre/shared/stores/planEngineStore'
import { useAnnotationsStore } from '../../modules/cosmos-angre/shared/stores/annotationsStore'
import { useEditableSpaceStore } from '../../modules/cosmos-angre/shared/stores/editableSpaceStore'
import { usePlanImportStore } from '../../modules/cosmos-angre/shared/stores/planImportStore'
import { usePlansLibraryStore } from '../../modules/cosmos-angre/shared/stores/plansLibraryStore'
import { useLotsStore } from '../../modules/cosmos-angre/shared/stores/lotsStore'
import { useOnboardingStore } from '../../modules/cosmos-angre/shared/stores/onboardingStore'
import { useHiddenEntitiesStore } from '../../modules/cosmos-angre/shared/stores/hiddenEntitiesStore'
import { useExcludedLayersStore } from '../../modules/cosmos-angre/shared/stores/excludedLayersStore'
import { useContentStore } from '../../modules/cosmos-angre/shared/store/contentStore'
import { useRlhfStore } from '../../modules/cosmos-angre/shared/proph3t/rlhfStore'

type S = Record<string, unknown>

// Exclut flags/fonctions/urls éphémères qui ne doivent pas traverser les rechargements
const omit = <T extends S>(state: T, keys: string[]): Partial<T> => {
  const out: S = {}
  for (const [k, v] of Object.entries(state)) {
    if (keys.includes(k)) continue
    if (typeof v === 'function') continue
    out[k] = v
  }
  return out as Partial<T>
}

export function registerAllStoresForBackup() {
  registerStore('app', useAppStore as unknown as Parameters<typeof registerStore>[1], (s) =>
    omit(s as S, ['isLoading', 'isAuthenticated']))

  registerStore('vol1', useVol1Store as unknown as Parameters<typeof registerStore>[1])

  registerStore('vol2', useVol2Store as unknown as Parameters<typeof registerStore>[1], (s) =>
    omit(s as S, [
      'isHydrating', 'hydrationError', 'isSimulating',
      'isRunningAutoCameras', 'isRunningAutoDoors', 'isRunningBlindSpots', 'isRunningFullAnalysis',
      'planImageUrls', 'libraryOpen',
    ]))

  registerStore('vol3', useVol3Store as unknown as Parameters<typeof registerStore>[1], (s) =>
    omit(s as S, ['isHydrating', 'hydrationError', 'planImageUrls', 'libraryOpen']))

  registerStore('vol4', useVol4Store as unknown as Parameters<typeof registerStore>[1])

  registerStore('planEngine', usePlanEngineStore as unknown as Parameters<typeof registerStore>[1], (s) =>
    omit(s as S, ['proph3tModalOpen', 'floorAttributionOpen', 'parsedPlan']))

  registerStore('annotations', useAnnotationsStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('editableSpaces', useEditableSpaceStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('planImport', usePlanImportStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('plansLibrary', usePlansLibraryStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('lots', useLotsStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('onboarding', useOnboardingStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('hiddenEntities', useHiddenEntitiesStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('excludedLayers', useExcludedLayersStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('content', useContentStore as unknown as Parameters<typeof registerStore>[1])
  registerStore('rlhf', useRlhfStore as unknown as Parameters<typeof registerStore>[1])
}

/**
 * Applique un snapshot local aux stores (après hydration boot).
 * Utilise `setState` de Zustand qui merge par défaut.
 */
export function applySnapshotToAllStores(stores: Record<string, unknown>) {
  const map: Record<string, { setState: (partial: unknown) => void }> = {
    app: useAppStore as unknown as { setState: (p: unknown) => void },
    vol1: useVol1Store as unknown as { setState: (p: unknown) => void },
    vol2: useVol2Store as unknown as { setState: (p: unknown) => void },
    vol3: useVol3Store as unknown as { setState: (p: unknown) => void },
    vol4: useVol4Store as unknown as { setState: (p: unknown) => void },
    planEngine: usePlanEngineStore as unknown as { setState: (p: unknown) => void },
    annotations: useAnnotationsStore as unknown as { setState: (p: unknown) => void },
    editableSpaces: useEditableSpaceStore as unknown as { setState: (p: unknown) => void },
    planImport: usePlanImportStore as unknown as { setState: (p: unknown) => void },
    plansLibrary: usePlansLibraryStore as unknown as { setState: (p: unknown) => void },
    lots: useLotsStore as unknown as { setState: (p: unknown) => void },
    onboarding: useOnboardingStore as unknown as { setState: (p: unknown) => void },
    hiddenEntities: useHiddenEntitiesStore as unknown as { setState: (p: unknown) => void },
    excludedLayers: useExcludedLayersStore as unknown as { setState: (p: unknown) => void },
    content: useContentStore as unknown as { setState: (p: unknown) => void },
    rlhf: useRlhfStore as unknown as { setState: (p: unknown) => void },
  }
  for (const [key, state] of Object.entries(stores)) {
    const s = map[key]
    if (!s || !state || typeof state !== 'object') continue
    try { s.setState(state) } catch (err) {
      console.warn(`[LocalBackup] apply failed for ${key}:`, err)
    }
  }
}
