// ═══ REGISTER ALL STORES ═══
//
// Enregistre tous les stores Atlas dans l'orchestrateur de backup local.
// Définit un `partialize` par store pour exclure flags transitoires,
// promesses en vol, blob URLs, fonctions, etc.

import { registerStore } from './backupOrchestrator'
import { useAppStore } from '../../stores/appStore'
import { useVol1Store } from '../../modules/building/vol1-commercial/store/vol1Store'
import { useVol2Store } from '../../modules/building/vol2-securitaire/store/vol2Store'
import { useVol3Store } from '../../modules/building/vol3-parcours/store/vol3Store'
import { useVol4Store } from '../../modules/building/vol4-wayfinder/store/vol4Store'
import { usePlanEngineStore } from '../../modules/building/shared/stores/planEngineStore'
import { useAnnotationsStore } from '../../modules/building/shared/stores/annotationsStore'
import { useEditableSpaceStore } from '../../modules/building/shared/stores/editableSpaceStore'
import { usePlanImportStore } from '../../modules/building/shared/stores/planImportStore'
// Note: plansLibraryStore n'est PAS un store Zustand — c'est un wrapper IndexedDB
// (Dexie) avec ses propres fonctions async (savePlan, loadPlan, listPlans…).
// Il n'a pas besoin du système de backup Zustand — la persistance est native.
import { useLotsStore } from '../../modules/building/shared/stores/lotsStore'
import { useOnboardingStore } from '../../modules/building/shared/stores/onboardingStore'
import { useHiddenEntitiesStore } from '../../modules/building/shared/stores/hiddenEntitiesStore'
import { useExcludedLayersStore } from '../../modules/building/shared/stores/excludedLayersStore'
import { useContentStore } from '../../modules/building/shared/store/contentStore'
import { useRlhfStore } from '../../modules/building/shared/proph3t/rlhfStore'

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
  // plansLibrary non enregistré : c'est un store IndexedDB natif (voir plansLibraryStore.ts)
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
    // plansLibrary : pas de setState (IndexedDB natif)
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
