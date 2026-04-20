// ═══ useDraggable — hook pour rendre un élément fixed draggable ═══
//
// Utilisation :
//   const ref = useRef<HTMLDivElement>(null)
//   const { style, handleProps } = useDraggable('my-widget-pos', {
//     defaultBottom: 24, defaultRight: 24,
//   })
//   <div ref={ref} style={style}>
//     <div {...handleProps}>handle</div>
//     ...
//   </div>
//
// Position persistée dans localStorage sous storageKey. Respect des bords
// de la fenêtre (clamp). Double-clic sur la poignée = reset position.

import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  /** Valeurs par défaut en pixels depuis le coin bas-droit. */
  defaultBottom?: number
  defaultRight?: number
  /** Marges de sécurité au bord de l'écran. */
  margin?: number
}

interface Position { x: number; y: number }

export function useDraggable(storageKey: string, opts: Options = {}) {
  const { defaultBottom = 24, defaultRight = 24, margin = 8 } = opts

  // Position initiale : restaurée depuis localStorage OU coin bas-droit
  const getInitialPosition = (): Position => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw) as Position
        if (typeof p.x === 'number' && typeof p.y === 'number') return p
      }
    } catch { /* ignore */ }
    return {
      x: window.innerWidth - defaultRight,
      y: window.innerHeight - defaultBottom,
    }
  }

  const [position, setPosition] = useState<Position>(getInitialPosition)
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Clamp dans la fenêtre quand elle est redimensionnée
  useEffect(() => {
    const clamp = () => {
      setPosition(p => ({
        x: Math.max(margin, Math.min(window.innerWidth - margin, p.x)),
        y: Math.max(margin, Math.min(window.innerHeight - margin, p.y)),
      }))
    }
    window.addEventListener('resize', clamp)
    clamp()
    return () => window.removeEventListener('resize', clamp)
  }, [margin])

  // Persister à chaque changement
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(position)) } catch { /* ignore */ }
  }, [position, storageKey])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: position.x, origY: position.y,
    }
    setDragging(true)
  }, [position])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const s = dragState.current
      if (!s) return
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      setPosition({
        x: Math.max(margin, Math.min(window.innerWidth - margin, s.origX + dx)),
        y: Math.max(margin, Math.min(window.innerHeight - margin, s.origY + dy)),
      })
    }
    const onUp = () => {
      dragState.current = null
      setDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, margin])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Reset : coin bas-droit par défaut
    setPosition({
      x: window.innerWidth - defaultRight,
      y: window.innerHeight - defaultBottom,
    })
  }, [defaultBottom, defaultRight])

  /** Style à appliquer sur l'élément fixé (position absolue par rapport viewport). */
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    // On ancre par le coin bas-droit pour que la position reflète bien l'apparence
    transform: 'translate(-100%, -100%)',
    touchAction: 'none',
    cursor: dragging ? 'grabbing' : undefined,
    userSelect: dragging ? 'none' : undefined,
    zIndex: 9998,
  }

  /** Props à appliquer sur la poignée de drag (zone de prise). */
  const handleProps = {
    onMouseDown,
    onDoubleClick,
    style: { cursor: dragging ? 'grabbing' : 'grab' as const },
    title: 'Glisser pour déplacer · double-clic pour réinitialiser la position',
  }

  return { position, style, handleProps, dragging }
}
