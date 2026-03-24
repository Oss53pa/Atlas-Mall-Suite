// ═══ MOBILE GESTURES — Touch & Mouse ═══

import { useRef, useCallback, useEffect, useState } from 'react'

interface GestureState { zoom: number; panX: number; panY: number }

interface UseGesturesOptions {
  minZoom?: number; maxZoom?: number
  onTap?: (x: number, y: number) => void
  onLongPress?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
}

export function useGestures(containerRef: React.RefObject<HTMLElement | null>, options: UseGesturesOptions = {}) {
  const { minZoom = 0.5, maxZoom = 5, onTap, onLongPress, onDoubleTap } = options
  const [state, setState] = useState<GestureState>({ zoom: 1, panX: 0, panY: 0 })
  const stateRef = useRef(state)
  stateRef.current = state

  const gRef = useRef({
    isPanning: false, isPinching: false, lastTouchCount: 0, lastTapTime: 0,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    startPanX: 0, startPanY: 0, startStateX: 0, startStateY: 0,
    initialPinchDist: 0, initialZoom: 1,
  })

  const dist = (touches: TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX, dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      const g = gRef.current; const s = stateRef.current
      if (g.longPressTimer) clearTimeout(g.longPressTimer)
      if (e.touches.length === 1) {
        g.startPanX = e.touches[0].clientX; g.startPanY = e.touches[0].clientY
        g.startStateX = s.panX; g.startStateY = s.panY; g.isPanning = true
        g.longPressTimer = setTimeout(() => {
          if (g.isPanning && onLongPress) {
            const rect = el.getBoundingClientRect()
            onLongPress((e.touches[0].clientX - rect.left - s.panX) / s.zoom, (e.touches[0].clientY - rect.top - s.panY) / s.zoom)
          }
        }, 500)
      }
      if (e.touches.length === 2) {
        g.isPanning = false; g.isPinching = true
        g.initialPinchDist = dist(e.touches); g.initialZoom = s.zoom; e.preventDefault()
      }
      g.lastTouchCount = e.touches.length
    }

    const onMove = (e: TouchEvent) => {
      const g = gRef.current; const s = stateRef.current
      if (g.longPressTimer) { clearTimeout(g.longPressTimer); g.longPressTimer = null }
      if (g.isPanning && e.touches.length === 1) {
        setState(p => ({ ...p, panX: g.startStateX + e.touches[0].clientX - g.startPanX, panY: g.startStateY + e.touches[0].clientY - g.startPanY }))
      }
      if (g.isPinching && e.touches.length === 2) {
        e.preventDefault()
        const d = dist(e.touches), scale = d / g.initialPinchDist
        const nz = Math.min(maxZoom, Math.max(minZoom, g.initialZoom * scale))
        const cx2 = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const cy2 = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const rect = el.getBoundingClientRect()
        const cx = cx2 - rect.left, cy = cy2 - rect.top, zr = nz / s.zoom
        setState({ zoom: nz, panX: cx - (cx - s.panX) * zr, panY: cy - (cy - s.panY) * zr })
      }
    }

    const onEnd = (e: TouchEvent) => {
      const g = gRef.current
      if (g.longPressTimer) { clearTimeout(g.longPressTimer); g.longPressTimer = null }
      if (e.touches.length === 0) {
        if (g.lastTouchCount === 1 && !g.isPinching) {
          const lt = e.changedTouches[0], moved = Math.abs(lt.clientX - g.startPanX) + Math.abs(lt.clientY - g.startPanY)
          if (moved < 10) {
            const now = Date.now(), rect = el.getBoundingClientRect(), s = stateRef.current
            const x = (lt.clientX - rect.left - s.panX) / s.zoom, y = (lt.clientY - rect.top - s.panY) / s.zoom
            if (now - g.lastTapTime < 300) {
              onDoubleTap?.(x, y)
              setState(p => { const nz = Math.min(maxZoom, p.zoom * 2); const zr = nz / p.zoom; return { zoom: nz, panX: lt.clientX - rect.left - (lt.clientX - rect.left - p.panX) * zr, panY: lt.clientY - rect.top - (lt.clientY - rect.top - p.panY) * zr } })
            } else { onTap?.(x, y) }
            g.lastTapTime = now
          }
        }
        g.isPanning = false; g.isPinching = false
      }
      if (e.touches.length === 1) {
        g.isPinching = false; g.isPanning = true; const s = stateRef.current
        g.startPanX = e.touches[0].clientX; g.startPanY = e.touches[0].clientY
        g.startStateX = s.panX; g.startStateY = s.panY
      }
      g.lastTouchCount = e.touches.length
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); const s = stateRef.current
      const delta = e.deltaY > 0 ? 0.9 : 1.1, nz = Math.min(maxZoom, Math.max(minZoom, s.zoom * delta))
      const rect = el.getBoundingClientRect(), cx = e.clientX - rect.left, cy = e.clientY - rect.top, zr = nz / s.zoom
      setState({ zoom: nz, panX: cx - (cx - s.panX) * zr, panY: cy - (cy - s.panY) * zr })
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); el.removeEventListener('wheel', onWheel) }
  }, [containerRef, minZoom, maxZoom, onTap, onLongPress, onDoubleTap])

  const resetView = useCallback(() => setState({ zoom: 1, panX: 0, panY: 0 }), [])
  return { ...state, resetView, setZoom: (z: number) => setState(s => ({ ...s, zoom: z })) }
}
