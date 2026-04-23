// ═══ POLYGON VERTEX EDITOR — Édition fine des contours d'un espace ═══
// Drag des sommets, ajout/suppression au double-clic, snap optionnel à la grille

import React, { useState, useCallback, useRef } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'

interface Props {
  /** Polygone initial en mètres. */
  polygon: [number, number][]
  /** Conversions (mètres ↔ pixels écran). */
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  screenToWorld: (x: number, y: number) => { x: number; y: number }
  /** Callback quand l'utilisateur valide. */
  onSave: (newPolygon: [number, number][]) => void
  onCancel: () => void
  /** Pas de la grille de snap en mètres (0 = pas de snap). */
  snapM?: number
}

export function PolygonVertexEditor({ polygon, worldToScreen, screenToWorld, onSave, onCancel, snapM = 0 }: Props) {
  const [verts, setVerts] = useState<[number, number][]>(() => polygon.map(p => [...p] as [number, number]))
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const snap = (n: number) => snapM > 0 ? Math.round(n / snapM) * snapM : n

  const onPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation()
    setDraggingIdx(idx)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIdx === null || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const w = screenToWorld(sx, sy)
    setVerts(v => {
      const next = [...v]
      next[draggingIdx] = [snap(w.x), snap(w.y)]
      return next
    })
  }, [draggingIdx, screenToWorld, snap])

  const onPointerUp = useCallback(() => setDraggingIdx(null), [])

  const removeVertex = (idx: number) => {
    if (verts.length <= 3) { alert('Un polygone doit avoir au moins 3 sommets.'); return }
    setVerts(v => v.filter((_, i) => i !== idx))
  }

  const insertVertexBetween = (idx: number) => {
    setVerts(v => {
      const next = [...v]
      const a = v[idx]
      const b = v[(idx + 1) % v.length]
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      next.splice(idx + 1, 0, mid)
      return next
    })
  }

  const reset = () => setVerts(polygon.map(p => [...p] as [number, number]))

  // Pixel coords for rendering
  const pxVerts = verts.map(v => worldToScreen(v[0], v[1]))

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 cursor-crosshair"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* SVG overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Polygone */}
        <polygon
          points={pxVerts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(34,211,238,0.18)"
          stroke="#22d3ee"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        {/* Arêtes : double-clic pour insérer un sommet au milieu */}
        {pxVerts.map((p, i) => {
          const q = pxVerts[(i + 1) % pxVerts.length]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          return (
            <g key={`edge-${i}`} className="pointer-events-auto" style={{ cursor: 'copy' }}
              onDoubleClick={(e) => { e.stopPropagation(); insertVertexBetween(i) }}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="transparent" strokeWidth={12} />
              <circle cx={mx} cy={my} r={3} fill="rgba(34,211,238,0.5)" stroke="#22d3ee" strokeWidth={1} />
            </g>
          )
        })}
      </svg>

      {/* Sommets draggables */}
      {pxVerts.map((p, i) => (
        <div
          key={`vert-${i}`}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${draggingIdx === i ? 'scale-125' : ''} transition-transform`}
          style={{ left: p.x, top: p.y }}
        >
          <div
            onPointerDown={(e) => onPointerDown(e, i)}
            onContextMenu={(e) => { e.preventDefault(); removeVertex(i) }}
            className="w-4 h-4 rounded-full bg-cyan-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
            title={`Sommet ${i + 1}/${verts.length} — drag pour déplacer · clic-droit pour supprimer`}
          />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded bg-surface-1 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 whitespace-nowrap">
            {verts[i][0].toFixed(1)}, {verts[i][1].toFixed(1)}
          </div>
        </div>
      ))}

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-0 border border-cyan-500/40 shadow-2xl">
        <span className="text-[10px] uppercase tracking-wider text-cyan-300 mr-1">Édition contours</span>
        <span className="text-[10px] text-slate-400">{verts.length} sommets</span>
        <div className="w-px h-4 bg-white/[0.1] mx-1" />
        <button
          onClick={reset}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-slate-800 border border-white/[0.06] text-slate-300 hover:text-white"
          title="Réinitialiser au polygone d'origine"
        >
          <RotateCcw size={11} /> Reset
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
        >
          <X size={11} /> Annuler
        </button>
        <button
          onClick={() => onSave(verts)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-600/40 font-medium"
        >
          <Check size={11} /> Valider
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-surface-0/90 border border-white/[0.06] text-[10px] text-slate-400 pointer-events-none">
        <strong className="text-cyan-300">Drag</strong> sommet · <strong className="text-cyan-300">Double-clic</strong> milieu d'arête pour ajouter · <strong className="text-cyan-300">Clic-droit</strong> sommet pour supprimer
      </div>
    </div>
  )
}
