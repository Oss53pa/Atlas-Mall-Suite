// ═══ useEditableSpacesCloudSync — Sync best-effort EditableSpace → Supabase cells ═══
//
// Surveille `useEditableSpaceStore.spaces` et déclenche `pushEditableSpaces`
// après un débounce (défaut 8 s d'inactivité) pour éviter de spammer Supabase
// à chaque clic de l'éditeur.
//
// Best-effort (CLAUDE.md §5.4 local-first) :
//   • offline / Supabase non configuré → no-op silencieux
//   • erreur réseau → log console, pas d'impact UI
//   • pas de blocage du thread UI (push via promise fire-and-forget)
//
// Usage :
//   useEditableSpacesCloudSync({ projectId: 'cosmos-angre', enabled: true })

import { useEffect, useRef } from 'react'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import { pushEditableSpaces } from '../engines/geometry/cellsSyncAdapter'
import { isOfflineMode } from '../../../../lib/supabase'

export interface CloudSyncConfig {
  projectId: string
  enabled?: boolean
  /** Durée d'inactivité avant push (ms). Défaut 8 s. */
  debounceMs?: number
}

const DEFAULT_DEBOUNCE = 8 * 1000

export function useEditableSpacesCloudSync(config: CloudSyncConfig): void {
  const enabled = config.enabled !== false && !!config.projectId && !isOfflineMode
  const debounce = config.debounceMs ?? DEFAULT_DEBOUNCE

  const spaces = useEditableSpaceStore(s => s.spaces)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPushedCountRef = useRef<number>(-1)

  useEffect(() => {
    if (!enabled) return
    // Skip push initial (hydratation du store au mount)
    if (lastPushedCountRef.current === -1 && spaces.length === 0) {
      lastPushedCountRef.current = 0
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // Capture la liste au moment du push (évite race avec nouvelles édits)
      const snapshot = useEditableSpaceStore.getState().spaces
      pushEditableSpaces(config.projectId, snapshot)
        .then(result => {
          lastPushedCountRef.current = snapshot.length
          if (result.failed > 0) {
            // Log groupé sans spam : 1 ligne par batch
            console.warn(
              `[cells-sync] ${result.failed}/${result.attempted} spaces failed`,
              result.errors.slice(0, 3),
            )
          }
        })
        .catch(err => {
          // Defensive — pushEditableSpaces ne devrait jamais throw
          console.warn('[cells-sync] unexpected error', err)
        })
    }, debounce)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, spaces, config.projectId, debounce])
}
