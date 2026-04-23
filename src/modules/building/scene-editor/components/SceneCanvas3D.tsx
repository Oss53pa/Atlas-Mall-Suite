// ═══ SceneCanvas3D — Canvas Three.js interactif ═══

import { useEffect, useRef, useCallback } from 'react'
import { useSceneEditorStore } from '../store/sceneEditorStore'
import { SceneRenderer } from '../engines/sceneRenderer'
import { getFurnitureById } from '../store/furnitureCatalog'
import type { SceneObject } from '../store/sceneEditorTypes'

export function SceneCanvas3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SceneRenderer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scene = useSceneEditorStore(s => s.scene)
  const selectedObjectId = useSceneEditorStore(s => s.selectedObjectId)
  const activeTool = useSceneEditorStore(s => s.activeTool)
  const selectObject = useSceneEditorStore(s => s.selectObject)
  const addObject = useSceneEditorStore(s => s.addObject)
  const updateObject = useSceneEditorStore(s => s.updateObject)
  const removeObject = useSceneEditorStore(s => s.removeObject)

  // Initialisation du renderer
  useEffect(() => {
    if (!canvasRef.current) return
    const renderer = new SceneRenderer(canvasRef.current)
    rendererRef.current = renderer

    renderer.onObjectSelected = (id) => selectObject(id)
    renderer.onObjectTransformed = (id, pos, rot) => {
      updateObject(id, {
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
      })
    }

    renderer.startLoop()

    // Resize observer
    const container = containerRef.current
    if (container) {
      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        renderer.resize(width, height)
      })
      ro.observe(container)
      renderer.resize(container.clientWidth, container.clientHeight)
      return () => { ro.disconnect(); renderer.dispose() }
    }

    return () => renderer.dispose()
  }, [])

  // Synchroniser les objets de la scene
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return

    // Ajouter les objets manquants
    for (const obj of scene.objects) {
      renderer.addObjectToScene(obj)
    }
  }, [scene.objects.length])

  // Synchroniser la selection
  useEffect(() => {
    rendererRef.current?.selectMesh(selectedObjectId)
  }, [selectedObjectId])

  // Synchroniser le mode de transformation
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (activeTool === 'move') renderer.setTransformMode('translate')
    else if (activeTool === 'rotate') renderer.setTransformMode('rotate')
    else if (activeTool === 'scale') renderer.setTransformMode('scale')
  }, [activeTool])

  // Synchroniser l'eclairage
  useEffect(() => {
    rendererRef.current?.applyLighting(scene.ambiance.timeOfDay)
  }, [scene.ambiance.timeOfDay])

  // Supprimer avec la touche Delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
        rendererRef.current?.removeObjectFromScene(selectedObjectId)
        removeObject(selectedObjectId)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedObjectId, removeObject])

  // Drag and drop depuis la bibliotheque
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const catalogId = e.dataTransfer.getData('text/catalog-id')
    const itemType = e.dataTransfer.getData('text/item-type') as SceneObject['type']
    if (!catalogId) return

    const renderer = rendererRef.current
    if (!renderer) return

    const pos = renderer.getDropPosition(e.clientX, e.clientY)
    if (!pos) return

    const catalogItem = getFurnitureById(catalogId)
    const name = catalogItem?.name ?? catalogId

    const obj: SceneObject = {
      id: crypto.randomUUID(),
      catalogId,
      name,
      type: itemType || 'furniture',
      position: { x: pos.x, y: 0, z: pos.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      isDecoration: itemType === 'decoration',
    }

    addObject(obj)
    renderer.addObjectToScene(obj)
  }, [addObject])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  return (
    <div ref={containerRef} className="flex-1 relative bg-surface-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />
      {scene.objects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-600 text-sm">
            Glissez des objets depuis la bibliotheque pour commencer
          </p>
        </div>
      )}
    </div>
  )
}
