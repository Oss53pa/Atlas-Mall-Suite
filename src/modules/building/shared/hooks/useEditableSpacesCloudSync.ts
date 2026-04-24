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
  const lastPushedSignatureRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    // Signature : count + 5 derniers IDs + somme longueurs polygones.
    // Change à chaque édit pertinente. Si identique à la dernière poussée
    // réussie → pas de re-push (évite boucles, mais marche sur hydratation
    // puisque la signature passe de "" à qqchose).
    const signature = computeSignature(spaces)
    if (signature === lastPushedSignatureRef.current) return
    if (spaces.length === 0) {
      // Rien à pousser mais on retient la signature vide pour éviter
      // de spammer un upsert de zéro row à chaque hydratation.
      lastPushedSignatureRef.current = signature
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const snapshot = useEditableSpaceStore.getState().spaces
      const snapshotSig = computeSignature(snapshot)
      pushEditableSpaces(config.projectId, snapshot)
        .then(result => {
          // Ne retient la signature que si le push a RÉUSSI (au moins partiellement)
          // sinon on continue à essayer à la prochaine édit.
          if (result.succeeded > 0) {
            lastPushedSignatureRef.current = snapshotSig
          }
          if (result.failed > 0) {
            console.warn(
              `[cells-sync] ${result.failed}/${result.attempted} spaces failed`,
              result.errors.slice(0, 3),
            )
          } else if (result.succeeded > 0) {
            console.info(`[cells-sync] ${result.succeeded} spaces synced`)
          }
        })
        .catch(err => {
          console.warn('[cells-sync] unexpected error', err)
        })
    }, debounce)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, spaces, config.projectId, debounce])
}

function computeSignature(spaces: readonly { id: string; polygon: readonly { x: number; y: number }[] }[]): string {
  if (spaces.length === 0) return 'empty'
  const tailIds = spaces.slice(-5).map(s => s.id).join('|')
  const polyLen = spaces.reduce((sum, s) => sum + (s.polygon?.length ?? 0), 0)
  return `${spaces.length}:${polyLen}:${tailIds}`
}
