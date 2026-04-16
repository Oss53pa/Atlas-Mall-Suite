// ═══ ANNOTATIONS LAYER — Étiquettes texte libres sur le plan (SVG overlay) ═══
// Édition inline, drag pour repositionner, suppression au clic droit

import React, { useState, useRef, useCallback } from 'react'
import { useAnnotationsStore, type Annotation } from '../stores/annotationsStore'

interface AnnotationsLayerProps {
  floorId?: string
  /** Conversion mètres → pixels (depuis ViewportState). */
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  /** Inverse. */
  screenToWorld: (x: number, y: number) => { x: number; y: number }
  /** Mode "ajouter une annotation au prochain clic". */
  addMode?: boolean
  onAddDone?: () => void
  className?: string
}

export function AnnotationsLayer({ floorId, worldToScreen, screenToWorld, addMode, onAddDone, className = '' }: AnnotationsLayerProps) {
  const annotations = useAnnotationsStore(s => s.byFloor(floorId))
  const add = useAnnotationsStore(s => s.add)
  const update = useAnnotationsStore(s => s.update)
  const remove = useAnnotationsStore(s => s.remove)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click pour ajouter
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (!addMode || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const w = screenToWorld(sx, sy)
    const id = add({ floorId, x: w.x, y: w.y, text: 'Nouvelle annotation' })
    setEditingId(id)
    onAddDone?.()
  }, [addMode, floorId, screenToWorld, add, onAddDone])

  const onDragStart = (e: React.PointerEvent, ann: Annotation) => {
    e.stopPropagation()
    if (editingId === ann.id) return
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sxy = worldToScreen(ann.x, ann.y)
    dragOffsetRef.current = {
      dx: e.clientX - rect.left - sxy.x,
      dy: e.clientY - rect.top - sxy.y,
    }
    setDraggingId(ann.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: React.PointerEvent) => {
    if (!draggingId || !dragOffsetRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sx = e.clientX - rect.left - dragOffsetRef.current.dx
    const sy = e.clientY - rect.top - dragOffsetRef.current.dy
    const w = screenToWorld(sx, sy)
    update(draggingId, { x: w.x, y: w.y })
  }
  const onDragEnd = () => {
    setDraggingId(null)
    dragOffsetRef.current = null
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${addMode ? 'cursor-crosshair' : 'pointer-events-none'} ${className}`}
      onClick={onContainerClick}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
    >
      {annotations.map(ann => {
        const sxy = worldToScreen(ann.x, ann.y)
        const isEditing = editingId === ann.id
        return (
          <div
            key={ann.id}
            className="absolute pointer-events-auto"
            style={{
              left: sxy.x,
              top: sxy.y,
              transform: `translate(-50%, -50%) rotate(${ann.rotation ?? 0}deg)`,
            }}
            onPointerDown={e => onDragStart(e, ann)}
            onContextMenu={e => { e.preventDefault(); if (confirm(`Supprimer "${ann.text}" ?`)) remove(ann.id) }}
          >
            {isEditing ? (
              <input
                autoFocus
                value={ann.text}
                onChange={e => update(ann.id, { text: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null) }}
                className="px-2 py-0.5 rounded text-[11px] border border-cyan-400 outline-none"
                style={{
                  background: ann.background ?? '#ffffffcc',
                  color: ann.color ?? '#1e293b',
                  fontWeight: ann.bold ? 700 : 500,
                  fontSize: ann.fontSize ?? 12,
                }}
              />
            ) : (
              <div
                onDoubleClick={e => { e.stopPropagation(); setEditingId(ann.id) }}
                className="px-2 py-0.5 rounded shadow-sm cursor-move select-none whitespace-nowrap"
                style={{
                  background: ann.background ?? '#ffffffcc',
                  color: ann.color ?? '#1e293b',
                  fontWeight: ann.bold ? 700 : 500,
                  fontSize: ann.fontSize ?? 12,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                {ann.text}
              </div>
            )}
          </div>
        )
      })}

      {addMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-[11px] font-medium pointer-events-none shadow-lg">
          Cliquez sur le plan pour ajouter une annotation · Échap pour annuler
        </div>
      )}
    </div>
  )
}
