// ═══ DXF PARSER WORKER — Off-main-thread parsing (M05) ═══
// Décharge le thread principal pour éviter les freezes sur plans 100+ MB.
//
// Vite charge ce worker automatiquement via `new Worker(new URL(..., import.meta.url))`.
// Le handler accepte un ArrayBuffer DXF brut et renvoie l'AST dxf-parser sérialisable.

/// <reference lib="webworker" />

import DxfParser from 'dxf-parser'

export interface DxfParseRequest {
  id: string
  kind: 'parse'
  /** Contenu DXF texte (UTF-8 ou ASCII). Transféré via structured clone. */
  text: string
}

export interface DxfParseResponseOk {
  id: string
  kind: 'ok'
  /** AST dxf-parser. */
  ast: unknown
  elapsedMs: number
}

export interface DxfParseResponseErr {
  id: string
  kind: 'err'
  error: string
  stack?: string
}

export type DxfParseResponse = DxfParseResponseOk | DxfParseResponseErr

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.addEventListener('message', (ev: MessageEvent<DxfParseRequest>) => {
  const msg = ev.data
  if (!msg || msg.kind !== 'parse') return

  const t0 = performance.now()
  try {
    const parser = new DxfParser()
    const ast = parser.parseSync(msg.text)
    const elapsedMs = performance.now() - t0
    const reply: DxfParseResponseOk = { id: msg.id, kind: 'ok', ast, elapsedMs }
    ctx.postMessage(reply)
  } catch (err) {
    const reply: DxfParseResponseErr = {
      id: msg.id,
      kind: 'err',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }
    ctx.postMessage(reply)
  }
})

export {}
