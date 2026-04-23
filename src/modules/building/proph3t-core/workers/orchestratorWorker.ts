// ═══ Worker dédié Orchestrator ═══
//
// Vrai Web Worker (instancié via Vite `new Worker(new URL(...), { type: 'module' })`).
// Reçoit input sérialisable + envoie progression + résultat via postMessage.
//
// CDC §3.7 ORC-05 : "Gérer les traitements longs en arrière-plan (Web Worker)"
//
// Protocole :
//   IN  → { kind: 'start', input: SerializableOrchestrateInput }
//        | { kind: 'cancel' }
//   OUT → { kind: 'progress', event: ProgressEvent }
//        | { kind: 'done', trace: ExecutionTrace }
//        | { kind: 'error', error: string }

/// <reference lib="webworker" />

import { orchestrate } from '../orchestrator'
import type { OrchestrateInput, ProgressEvent, ExecutionTrace } from '../types'

// On retire `onProgress` du payload (les fonctions ne sont pas sérialisables)
// et `useWorker` (la décision est déjà prise puisqu'on EST dans le Worker).
export interface SerializableOrchestrateInput
  extends Omit<OrchestrateInput, 'onProgress' | 'useWorker'> {}

export type WorkerInMessage =
  | { kind: 'start'; input: SerializableOrchestrateInput }
  | { kind: 'cancel' }

export type WorkerOutMessage =
  | { kind: 'progress'; event: ProgressEvent }
  | { kind: 'done'; trace: ExecutionTrace }
  | { kind: 'error'; error: string }

// ─── Annulation coopérative ────────────

let canceled = false

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  if (msg.kind === 'cancel') {
    canceled = true
    return
  }
  if (msg.kind !== 'start') return

  canceled = false
  try {
    const trace = await orchestrate({
      ...msg.input,
      onProgress: (event) => {
        if (canceled) throw new Error('Annulé par l\'utilisateur')
        post({ kind: 'progress', event })
      },
    })
    post({ kind: 'done', trace })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue'
    post({ kind: 'error', error: errorMsg })
  }
}

function post(msg: WorkerOutMessage): void {
   
  ;(self as unknown as Worker).postMessage(msg)
}

// Signale au main thread que le worker est prêt
post({
  kind: 'progress',
  event: { volume: 'vol1-commercial', status: 'pending', pct: 0, message: 'Worker prêt' },
})
