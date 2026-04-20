// ═══ LOCAL BACKUP — Bootstrap ═══
//
// À appeler une fois au démarrage de l'app. S'occupe de :
//   1. Enregistrer tous les stores dans l'orchestrateur
//   2. Hydrater le projet actif depuis IndexedDB (si snapshot présent)
//   3. Démarrer la sauvegarde auto (debounce 2s)
//   4. Suivre les changements de projet actif
//   5. Flusher au beforeunload
//   6. Exposer des commandes globales

import { useAppStore } from '../../stores/appStore'
import {
  startBackupOrchestrator, setActiveProjectForBackup, forceFlush,
  hydrateFromLocalSnapshot,
} from './backupOrchestrator'
import {
  registerAllStoresForBackup, applySnapshotToAllStores,
} from './registerAllStores'
import {
  exportAllToFile, exportProjectToFile, importFromFile, downloadBlob,
  listSnapshots, deleteSnapshot,
} from './backupService'

let initialized = false

export async function initLocalBackup() {
  if (initialized) return
  initialized = true

  registerAllStoresForBackup()

  const initialProjectId = useAppStore.getState().activeProject?.id ?? null

  // Hydratation initiale depuis snapshot local (avant toute connexion Supabase)
  if (initialProjectId) {
    try {
      const snap = await hydrateFromLocalSnapshot(initialProjectId)
      if (snap) {
        applySnapshotToAllStores(snap)
        console.log('[LocalBackup] Projet restauré depuis sauvegarde locale:', initialProjectId)
      }
    } catch (err) {
      console.warn('[LocalBackup] Hydratation locale échouée:', err)
    }
  }

  startBackupOrchestrator(initialProjectId)

  // Suivi du changement de projet actif
  useAppStore.subscribe((state, prev) => {
    const newId = state.activeProject?.id ?? null
    const oldId = prev.activeProject?.id ?? null
    if (newId !== oldId) {
      void (async () => {
        await forceFlush() // sauvegarde l'ancien avant switch
        setActiveProjectForBackup(newId)
        if (newId) {
          const snap = await hydrateFromLocalSnapshot(newId)
          if (snap) applySnapshotToAllStores(snap)
        }
      })()
    }
  })

  // Flush au unload
  window.addEventListener('beforeunload', () => { void forceFlush() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void forceFlush()
  })

  // Commandes globales
  const w = window as unknown as Record<string, unknown>
  w.atlasBackup = {
    flush: () => forceFlush(),
    list: () => listSnapshots(),
    exportAll: async () => {
      const blob = await exportAllToFile()
      downloadBlob(blob, `atlas-backup-${new Date().toISOString().slice(0, 10)}.atlas.json`)
    },
    exportProject: async (projectId?: string) => {
      const id = projectId ?? useAppStore.getState().activeProject?.id
      if (!id) { console.warn('Pas de projet actif'); return }
      const blob = await exportProjectToFile(id)
      if (!blob) { console.warn('Pas de snapshot pour', id); return }
      downloadBlob(blob, `atlas-${id}-${new Date().toISOString().slice(0, 10)}.atlas.json`)
    },
    importFromFile: async () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const res = await importFromFile(file)
        console.log('[LocalBackup] Import:', res)
      }
      input.click()
    },
    delete: (projectId: string) => deleteSnapshot(projectId),
  }

  console.log('[LocalBackup] Activé. Commandes : window.atlasBackup.{flush,list,exportAll,exportProject,importFromFile,delete}')
}
