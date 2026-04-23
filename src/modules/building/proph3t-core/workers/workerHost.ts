// ═══ Worker host — wrap Worker en Promise + progress callback ═══
//
// Côté main thread : crée le Worker, lui envoie l'input, route les messages
// vers les callbacks, retourne le résultat final.

import type { OrchestrateInput, ExecutionTrace, ProgressEvent } from '../types'
import type { WorkerInMessage, WorkerOutMessage } from './orchestratorWorker'

/**
 * Lance l'orchestration dans un vrai Web Worker (thread séparé).
 * Retourne une Promise qui résout sur ExecutionTrace ou rejette sur erreur.
 *
 * Le `onProgress` est invoqué pour chaque message de progression du Worker.
 * Le Worker est terminé proprement à la fin (success ou erreur).
 */
export function runOrchestratorInWorker(
  input: OrchestrateInput,
): Promise<ExecutionTrace> & { cancel: () => void } {
  let worker: Worker | null = null
  let cancelFn: () => void = () => {}

  const promise = new Promise<ExecutionTrace>((resolve, reject) => {
    try {
      // Vite résout cette URL au build et bundle le worker séparément.
      // En SSR (jest/vitest node), Worker n'existe pas → fallback main thread.
      if (typeof Worker === 'undefined') {
        // Fallback : appel direct synchrone (utilisé en tests Node)
        import('../orchestrator').then(({ orchestrate }) => {
          orchestrate(input).then(resolve, reject)
        }).catch(reject)
        return
      }

      worker = new Worker(
        new URL('./orchestratorWorker.ts', import.meta.url),
        { type: 'module', name: 'proph3t-orchestrator' },
      )

      cancelFn = () => {
        if (worker) {
          worker.postMessage({ kind: 'cancel' } satisfies WorkerInMessage)
          // Laisse 500 ms pour annulation propre puis terminate
          setTimeout(() => {
            if (worker) {
              worker.terminate()
              worker = null
              reject(new Error('Orchestration annulée'))
            }
          }, 500)
        }
      }

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data
        if (msg.kind === 'progress') {
          input.onProgress?.(msg.event)
        } else if (msg.kind === 'done') {
          worker?.terminate()
          worker = null
          resolve(msg.trace)
        } else if (msg.kind === 'error') {
          worker?.terminate()
          worker = null
          reject(new Error(msg.error))
        }
      }

      worker.onerror = (err) => {
        const errorMsg = err.message ?? 'Worker error'
        worker?.terminate()
        worker = null
        reject(new Error(errorMsg))
      }

      // Démarre l'exécution
      worker.postMessage({
        kind: 'start',
        input: stripNonSerializable(input),
      } satisfies WorkerInMessage)
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })

  // On attache cancel sur la Promise
  return Object.assign(promise, { cancel: () => cancelFn() })
}

/** Retire les fonctions et autres propriétés non sérialisables avant postMessage. */
function stripNonSerializable(input: OrchestrateInput): import('./orchestratorWorker').SerializableOrchestrateInput {
  const { onProgress, useWorker, ...rest } = input
  void onProgress; void useWorker
  return rest
}

// ─── Hook React optionnel ────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'

/** Hook React pour orchestrer + suivre la progression dans un Worker. */
export function useWorkerOrchestrator() {
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [trace, setTrace] = useState<ExecutionTrace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)

  const start = useCallback(async (input: OrchestrateInput) => {
    setError(null)
    setTrace(null)
    setProgress(null)
    setRunning(true)
    const p = runOrchestratorInWorker({
      ...input,
      onProgress: setProgress,
    })
    cancelRef.current = p.cancel
    try {
      const result = await p
      setTrace(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setRunning(false)
      cancelRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    cancelRef.current?.()
  }, [])

  useEffect(() => () => cancelRef.current?.(), [])

  return { start, cancel, progress, trace, error, running }
}
