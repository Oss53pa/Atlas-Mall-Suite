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

  // Seuil avant de considérer qu'on drag (pour distinguer click vs drag)
  const DRAG_THRESHOLD_PX = 4
  const [didDrag, setDidDrag] = useState(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    // On ne preventDefault pas ici pour laisser le clic se propager si pas de drag
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: position.x, origY: position.y,
    }
    setDidDrag(false)
    setDragging(true)
  }, [position])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const s = dragState.current
      if (!s) return
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      // Seuil avant de bouger vraiment (distingue click vs drag)
      if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      if (!didDrag) setDidDrag(true)
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
  }, [dragging, margin, didDrag])

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

  /**
   * Props pour rendre le **conteneur entier** draggable tout en préservant
   * les clics. Le consommateur doit wrapper ses onClick avec `wrapClick` pour
   * éviter qu'un drag ne déclenche le clic.
   */
  const wrapClick = <T extends (e: React.MouseEvent) => void>(handler: T) => {
    return ((e: React.MouseEvent) => {
      // Ne pas déclencher le clic si on vient de faire un drag
      if (didDrag) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      handler(e)
    }) as T
  }

  return { position, style, handleProps, dragging, didDrag, wrapClick }
}
