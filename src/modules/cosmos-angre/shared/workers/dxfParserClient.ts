// ═══ DXF PARSER CLIENT — Façade pour le worker ═══
// Usage :
//   const ast = await parseDxfInWorker(text, { timeoutMs: 30_000 })
//
// Si le worker n'est pas disponible (SSR, test), retombe sur dxf-parser synchrone.

import type { DxfParseRequest, DxfParseResponse } from './dxfParser.worker'

let singletonWorker: Worker | null = null
let reqCounter = 0

function getWorker(): Worker | null {
  if (singletonWorker) return singletonWorker
  if (typeof Worker === 'undefined') return null
  try {
    singletonWorker = new Worker(
      new URL('./dxfParser.worker.ts', import.meta.url),
      { type: 'module' },
    )
    return singletonWorker
  } catch (err) {
    console.warn('[DxfParserClient] Worker init failed, falling back to main thread', err)
    return null
  }
}

export interface ParseOpts {
  timeoutMs?: number
  /** Callback de progression (0-1) — non implémenté côté worker, placeholder pour extension future. */
  onProgress?: (pct: number) => void
}

export async function parseDxfInWorker(text: string, opts: ParseOpts = {}): Promise<{ ast: unknown; elapsedMs: number }> {
  const worker = getWorker()
  const timeoutMs = opts.timeoutMs ?? 60_000

  // Fallback : pas de worker → parse synchrone
  if (!worker) {
    const DxfParser = (await import('dxf-parser')).default
    const t0 = performance.now()
    const ast = new DxfParser().parseSync(text)
    return { ast, elapsedMs: performance.now() - t0 }
  }

  const id = `req-${++reqCounter}`
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener('message', onMsg)
      reject(new Error(`DXF parsing timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    const onMsg = (ev: MessageEvent<DxfParseResponse>) => {
      if (ev.data.id !== id) return
      clearTimeout(timer)
      worker.removeEventListener('message', onMsg)
      if (ev.data.kind === 'ok') {
        resolve({ ast: ev.data.ast, elapsedMs: ev.data.elapsedMs })
      } else {
        reject(new Error(ev.data.error))
      }
    }

    worker.addEventListener('message', onMsg)
    const req: DxfParseRequest = { id, kind: 'parse', text }
    worker.postMessage(req)
  })
}

/** Termine le worker (utile pour les tests ou pour libérer la mémoire). */
export function terminateDxfWorker(): void {
  if (singletonWorker) {
    singletonWorker.terminate()
    singletonWorker = null
  }
}
