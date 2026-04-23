// ═══ PLAN DRAW EDITOR ═══
//
// Éditeur SVG 2D pour dessiner de nouveaux espaces sur le plan importé :
//   - Outils : sélection, polygone libre, rectangle, ligne parking,
//              place parking (template 2.5 × 5 m), flèche sens
//   - Plan importé en fond (image ou vectoriel)
//   - Snap sur grille (25 cm par défaut, configurable)
//   - Preview en direct pendant le tracé
//   - Chaque espace tracé reçoit un typeKey + est ajouté à parsedPlan.spaces
//   - Undo / redo (historique interne)
//
// Note : pour éditer la GÉOMÉTRIE d'un espace existant (déplacer sommets,
// split, merge), un mode édition dédié sera ajouté ultérieurement.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MousePointer, Square, Pentagon, ArrowRight,
  Undo2, Redo2, Trash2, Save, X, ZoomIn, ZoomOut, Maximize,
  Car, Accessibility, Zap, Bike, Package, Users2,
  Move, Scissors, GitMerge, Edit3,
} from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import type { DetectedSpace, ParsedPlan } from '../planReader/planEngineTypes'
import {
  SPACE_TYPE_META, autoDetectSpaceType,
  type SpaceTypeKey,
} from '../proph3t/libraries/spaceTypeLibrary'
import {
  moveVertex, translatePolygon, insertVertexOnSegment, removeVertex,
  splitPolygonByLine, mergePolygonsConvexHull, nearestEdge, pointInPolygon,
  polygonArea, polygonBounds,
  type Pt,
} from '../planReader/polygonOps'
import { FURNITURE_CATALOG } from '../../scene-editor/store/furnitureCatalog'

type Tool =
  | 'select'
  | 'edit-vertex'     // édit sommets d'un espace sélectionné
  | 'move-space'      // déplacer un espace entier
  | 'split'           // coupe un espace en 2 par une ligne
  | 'merge'           // sélection multiple + fusion
  | 'polygon'
  | 'rectangle'
  | 'parking-standard'
  | 'parking-pmr'
  | 'parking-ve'
  | 'parking-moto'
  | 'parking-livraison'
  | 'parking-famille'
  | 'arrow-flow'

// Templates pré-dimensionnés (dimensions en mètres)
const PARKING_TEMPLATES: Record<string, { w: number; h: number; typeKey: SpaceTypeKey; icon: React.ComponentType<any>; label: string; color: string }> = {
  'parking-standard':  { w: 2.5, h: 5,   typeKey: 'parking_place_standard',  icon: Car,           label: 'Place std',  color: '#60a5fa' },
  'parking-pmr':       { w: 3.3, h: 5,   typeKey: 'parking_place_pmr',       icon: Accessibility, label: 'Place PMR',  color: '#3b82f6' },
  'parking-ve':        { w: 2.5, h: 5,   typeKey: 'parking_place_ve',        icon: Zap,           label: 'Borne VE',   color: '#22c55e' },
  'parking-moto':      { w: 1,   h: 2,   typeKey: 'parking_place_moto',      icon: Bike,          label: 'Moto',       color: '#7dd3fc' },
  'parking-livraison': { w: 3,   h: 7,   typeKey: 'parking_place_livraison', icon: Package,       label: 'Livraison',  color: '#f59e0b' },
  'parking-famille':   { w: 3,   h: 5,   typeKey: 'parking_place_famille',   icon: Users2,        label: 'Famille',    color: '#f472b6' },
}

interface Props {
  onClose: () => void
  /** floorId courant (rattachement des nouveaux espaces). */
  floorId?: string
}

interface DrawnShape {
  id: string
  typeKey: SpaceTypeKey
  label: string
  polygon: [number, number][]  // coordonnées monde (m)
  isArrow?: boolean
  /** Flag : cet élément est un meuble déposé depuis FurnitureLibrary (pas un espace) */
  isFurniture?: boolean
  /** Id catalogue du meuble (quand isFurniture=true) */
  furnitureCatalogId?: string
  /** Couleur catégorie (affichage) */
  color?: string
  createdAt: number
}

export function PlanDrawEditor({ onClose, floorId }: Props) {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [snapGrid, setSnapGrid] = useState(0.25) // mètres
  const [showGrid, setShowGrid] = useState(true)
  const [customTypeKey, setCustomTypeKey] = useState<SpaceTypeKey>('local_commerce')
  const [customLabel, setCustomLabel] = useState('')

  // Viewport (world→screen)
  const [scale, setScale] = useState(30) // px par mètre
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Shapes en cours de dessin
  const [currentVerts, setCurrentVerts] = useState<[number, number][]>([])
  const [hoverPoint, setHoverPoint] = useState<[number, number] | null>(null)
  const [drawStart, setDrawStart] = useState<[number, number] | null>(null)

  // Historique (drawn + edits)
  const [drawn, setDrawn] = useState<DrawnShape[]>([])
  // Patches sur les spaces existants (polygons modifiés ou supprimés)
  const [spacePatches, setSpacePatches] = useState<Record<string, { polygon?: Pt[]; deleted?: boolean }>>({})
  const [history, setHistory] = useState<Array<{ drawn: DrawnShape[]; patches: typeof spacePatches }>>([{ drawn: [], patches: {} }])
  const [historyIdx, setHistoryIdx] = useState(0)

  // États mode édition
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [draggingVertex, setDraggingVertex] = useState<{ spaceId: string; vertexIdx: number; isDrawn: boolean } | null>(null)
  const [draggingSpaceStart, setDraggingSpaceStart] = useState<{ spaceId: string; startWorld: Pt; origPoly: Pt[]; isDrawn: boolean } | null>(null)
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set())

  const pushHistory = useCallback((nextDrawn?: DrawnShape[], nextPatches?: typeof spacePatches) => {
    const snapshot = {
      drawn: nextDrawn ?? drawn,
      patches: nextPatches ?? spacePatches,
    }
    const newHist = history.slice(0, historyIdx + 1)
    newHist.push(snapshot)
    setHistory(newHist)
    setHistoryIdx(newHist.length - 1)
    if (nextDrawn !== undefined) setDrawn(nextDrawn)
    if (nextPatches !== undefined) setSpacePatches(nextPatches)
  }, [history, historyIdx, drawn, spacePatches])

  const undo = () => {
    if (historyIdx <= 0) return
    const idx = historyIdx - 1
    setHistoryIdx(idx)
    setDrawn(history[idx].drawn)
    setSpacePatches(history[idx].patches)
  }
  const redo = () => {
    if (historyIdx >= history.length - 1) return
    const idx = historyIdx + 1
    setHistoryIdx(idx)
    setDrawn(history[idx].drawn)
    setSpacePatches(history[idx].patches)
  }

  const bounds = parsedPlan?.bounds ?? { minX: 0, minY: 0, width: 100, height: 80 }

  // Initial fit
  useEffect(() => {
    if (!containerRef.current || !parsedPlan) return
    const rect = containerRef.current.getBoundingClientRect()
    const fit = Math.min(rect.width / bounds.width, rect.height / bounds.height) * 0.85
    setScale(fit)
    setOffset({
      x: (rect.width - bounds.width * fit) / 2 - bounds.minX * fit,
      y: (rect.height - bounds.height * fit) / 2 - bounds.minY * fit,
    })

  }, [parsedPlan])

  const worldToScreen = useCallback((x: number, y: number) => ({
    x: x * scale + offset.x,
    y: y * scale + offset.y,
  }), [scale, offset])

  const screenToWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - offset.x) / scale,
    y: (sy - offset.y) / scale,
  }), [scale, offset])

  const snapPoint = useCallback((x: number, y: number): [number, number] => {
    if (snapGrid <= 0) return [x, y]
    return [
      Math.round(x / snapGrid) * snapGrid,
      Math.round(y / snapGrid) * snapGrid,
    ]
  }, [snapGrid])

  /** Retourne le polygone courant d'un space existant (avec patches appliqués). */
  const effectivePolygon = useCallback((spaceId: string): Pt[] | null => {
    const patched = spacePatches[spaceId]?.polygon
    if (patched) return patched
    const sp = parsedPlan?.spaces.find(s => s.id === spaceId)
    return sp?.polygon as Pt[] | undefined ?? null
  }, [parsedPlan, spacePatches])

  /** Trouve quel espace (existant ou dessiné) contient un point. */
  const findSpaceAtPoint = useCallback((pt: Pt): { id: string; isDrawn: boolean; polygon: Pt[] } | null => {
    // Priorité aux drawn (en dernier dessinés)
    for (let i = drawn.length - 1; i >= 0; i--) {
      const s = drawn[i]
      if (s.isArrow) continue
      if (pointInPolygon(pt, s.polygon)) return { id: s.id, isDrawn: true, polygon: s.polygon }
    }
    for (const s of parsedPlan?.spaces ?? []) {
      if (spacePatches[s.id]?.deleted) continue
      const poly = effectivePolygon(s.id)
      if (poly && pointInPolygon(pt, poly)) return { id: s.id, isDrawn: false, polygon: poly }
    }
    return null
  }, [drawn, parsedPlan, spacePatches, effectivePolygon])

  // ─── Événements souris ───
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const snapped = snapPoint(w.x, w.y)
    setHoverPoint(snapped)

    // Drag d'un sommet en cours
    if (draggingVertex) {
      const poly = effectivePolygon(draggingVertex.spaceId)
      if (poly) {
        const newPoly = moveVertex(poly, draggingVertex.vertexIdx, snapped)
        if (draggingVertex.isDrawn) {
          setDrawn(drawn.map(s => s.id === draggingVertex.spaceId ? { ...s, polygon: newPoly } : s))
        } else {
          setSpacePatches({ ...spacePatches, [draggingVertex.spaceId]: { ...spacePatches[draggingVertex.spaceId], polygon: newPoly } })
        }
      }
      return
    }

    // Drag d'un espace entier
    if (draggingSpaceStart) {
      const dx = snapped[0] - draggingSpaceStart.startWorld[0]
      const dy = snapped[1] - draggingSpaceStart.startWorld[1]
      const newPoly = translatePolygon(draggingSpaceStart.origPoly, dx, dy)
      if (draggingSpaceStart.isDrawn) {
        setDrawn(drawn.map(s => s.id === draggingSpaceStart.spaceId ? { ...s, polygon: newPoly } : s))
      } else {
        setSpacePatches({ ...spacePatches, [draggingSpaceStart.spaceId]: { ...spacePatches[draggingSpaceStart.spaceId], polygon: newPoly } })
      }
      return
    }
  }

  const handleMouseUp = () => {
    // Commit du drag vertex dans l'historique
    if (draggingVertex) {
      const poly = effectivePolygon(draggingVertex.spaceId)
      if (poly) {
        commitPolygonEdit(draggingVertex.spaceId, poly, draggingVertex.isDrawn)
      }
      setDraggingVertex(null)
    }
    if (draggingSpaceStart) {
      const poly = effectivePolygon(draggingSpaceStart.spaceId)
      if (poly) {
        commitPolygonEdit(draggingSpaceStart.spaceId, poly, draggingSpaceStart.isDrawn)
      }
      setDraggingSpaceStart(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const snapped = snapPoint(w.x, w.y)

    // Mode sélection / édition : cliquer sélectionne l'espace sous le curseur
    if (tool === 'select' || tool === 'edit-vertex' || tool === 'move-space' || tool === 'merge') {
      const hit = findSpaceAtPoint(snapped)
      if (tool === 'merge' && hit) {
        setMergeSelection(prev => {
          const next = new Set(prev)
          if (next.has(hit.id)) next.delete(hit.id)
          else next.add(hit.id)
          return next
        })
        return
      }
      if (hit) {
        setSelectedSpaceId(hit.id)
        if (tool === 'move-space') {
          setDraggingSpaceStart({
            spaceId: hit.id, isDrawn: hit.isDrawn,
            startWorld: snapped, origPoly: hit.polygon,
          })
        }
        // Vertex drag est géré par mousedown sur les handles (pas ici)
      } else {
        setSelectedSpaceId(null)
      }
      return
    }

    // Mode split : trace une ligne (2 clics) qui coupe le polygone sélectionné
    if (tool === 'split') {
      if (!selectedSpaceId) {
        const hit = findSpaceAtPoint(snapped)
        if (hit) setSelectedSpaceId(hit.id)
        return
      }
      if (!drawStart) setDrawStart(snapped)
      else {
        splitSelectedSpace(drawStart, snapped)
        setDrawStart(null)
      }
      return
    }

    // Modes dessin classiques
    if (tool === 'polygon') {
      setCurrentVerts(prev => [...prev, snapped])
    } else if (tool === 'rectangle') {
      if (!drawStart) setDrawStart(snapped)
      else {
        commitRectangle(drawStart, snapped)
        setDrawStart(null)
      }
    } else if (tool.startsWith('parking-')) {
      commitParkingStamp(tool, snapped)
    } else if (tool === 'arrow-flow') {
      if (!drawStart) setDrawStart(snapped)
      else {
        commitArrow(drawStart, snapped)
        setDrawStart(null)
      }
    }
  }

  const handleDoubleClick = () => {
    if (tool === 'polygon' && currentVerts.length >= 3) {
      commitPolygon(currentVerts)
      setCurrentVerts([])
    }
  }

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCurrentVerts([])
      setDrawStart(null)
      setTool('select')
    } else if (e.key === 'Enter' && tool === 'polygon' && currentVerts.length >= 3) {
      commitPolygon(currentVerts)
      setCurrentVerts([])
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault()
      redo()
    }

  }, [tool, currentVerts, undo, redo])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldBefore = screenToWorld(mx, my)
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const nextScale = Math.max(2, Math.min(500, scale * factor))
    setScale(nextScale)
    setOffset({
      x: mx - worldBefore.x * nextScale,
      y: my - worldBefore.y * nextScale,
    })
  }

  const zoomTo = (mult: number) => {
    const nextScale = Math.max(2, Math.min(500, scale * mult))
    setScale(nextScale)
  }
  const fitView = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const fit = Math.min(rect.width / bounds.width, rect.height / bounds.height) * 0.85
    setScale(fit)
    setOffset({
      x: (rect.width - bounds.width * fit) / 2 - bounds.minX * fit,
      y: (rect.height - bounds.height * fit) / 2 - bounds.minY * fit,
    })
  }

  // ─── Commits ───
  const commitPolygon = (verts: [number, number][]) => {
    const shape: DrawnShape = {
      id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      typeKey: customTypeKey,
      label: customLabel || SPACE_TYPE_META[customTypeKey].label,
      polygon: verts,
      createdAt: Date.now(),
    }
    pushHistory([...drawn, shape], undefined)
  }

  const commitRectangle = (p1: [number, number], p2: [number, number]) => {
    const [x1, y1] = p1, [x2, y2] = p2
    const polygon: [number, number][] = [
      [Math.min(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.max(y1, y2)],
      [Math.min(x1, x2), Math.max(y1, y2)],
    ]
    const shape: DrawnShape = {
      id: `draw-${Date.now()}`,
      typeKey: customTypeKey,
      label: customLabel || SPACE_TYPE_META[customTypeKey].label,
      polygon,
      createdAt: Date.now(),
    }
    pushHistory([...drawn, shape], undefined)
  }

  const commitParkingStamp = (t: Tool, center: [number, number]) => {
    const tpl = PARKING_TEMPLATES[t as keyof typeof PARKING_TEMPLATES]
    if (!tpl) return
    const [cx, cy] = center
    const polygon: [number, number][] = [
      [cx - tpl.w / 2, cy - tpl.h / 2],
      [cx + tpl.w / 2, cy - tpl.h / 2],
      [cx + tpl.w / 2, cy + tpl.h / 2],
      [cx - tpl.w / 2, cy + tpl.h / 2],
    ]
    const shape: DrawnShape = {
      id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      typeKey: tpl.typeKey,
      label: tpl.label,
      polygon,
      createdAt: Date.now(),
    }
    pushHistory([...drawn, shape], undefined)
  }

  /** Drop HTML5 : FurnitureLibrary pose un meuble au point de drop */
  const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault()
    const catalogId = e.dataTransfer.getData('text/catalog-id')
    const itemType = e.dataTransfer.getData('text/item-type')
    if (!catalogId || !itemType) return

    // Cherche l'item dans le catalogue mobilier
    let item: { id: string; name: string; w: number; d: number; category: string } | null = null
    let catColor = '#64748b'
    for (const [, cat] of Object.entries(FURNITURE_CATALOG)) {
      const found = cat.items.find(i => i.id === catalogId)
      if (found) {
        item = { id: found.id, name: found.name, w: found.w, d: found.d, category: found.category }
        catColor = cat.color
        break
      }
    }
    if (!item) return

    // Point de drop en coordonnées monde
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const snapped = snapPoint(world.x, world.y)
    const [cx, cy] = snapped

    // Rectangle au point de drop aux dimensions du meuble (w × d = largeur × profondeur)
    const polygon: Pt[] = [
      [cx - item.w / 2, cy - item.d / 2],
      [cx + item.w / 2, cy - item.d / 2],
      [cx + item.w / 2, cy + item.d / 2],
      [cx - item.w / 2, cy + item.d / 2],
    ]
    const shape: DrawnShape = {
      id: `furn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      typeKey: 'autre',
      label: item.name,
      polygon,
      isFurniture: true,
      furnitureCatalogId: item.id,
      color: catColor,
      createdAt: Date.now(),
    }
    pushHistory([...drawn, shape], undefined)
  }

  const commitArrow = (p1: [number, number], p2: [number, number]) => {
    const shape: DrawnShape = {
      id: `draw-${Date.now()}`,
      typeKey: 'parking_fleche_sens',
      label: 'Flèche sens',
      polygon: [p1, p2],
      isArrow: true,
      createdAt: Date.now(),
    }
    pushHistory([...drawn, shape], undefined)
  }

  const deleteShape = (id: string) => {
    pushHistory(drawn.filter(s => s.id !== id), undefined)
  }

  // ─── Actions sur les espaces EXISTANTS ───

  const commitPolygonEdit = (spaceId: string, newPoly: Pt[], isDrawn: boolean) => {
    if (isDrawn) {
      const nextDrawn = drawn.map(s => s.id === spaceId ? { ...s, polygon: newPoly } : s)
      pushHistory(nextDrawn, undefined)
    } else {
      const nextPatches = { ...spacePatches, [spaceId]: { ...spacePatches[spaceId], polygon: newPoly } }
      pushHistory(undefined, nextPatches)
    }
  }

  const deleteExistingSpace = (spaceId: string) => {
    const nextPatches = { ...spacePatches, [spaceId]: { ...spacePatches[spaceId], deleted: true } }
    pushHistory(undefined, nextPatches)
    if (selectedSpaceId === spaceId) setSelectedSpaceId(null)
  }

  const splitSelectedSpace = (lineA: Pt, lineB: Pt) => {
    if (!selectedSpaceId) return
    const poly = effectivePolygon(selectedSpaceId)
    if (!poly) return
    const result = splitPolygonByLine(poly, lineA, lineB)
    if (!result) {
      alert('La ligne ne traverse pas correctement le polygone. Essayez de tracer une ligne qui coupe 2 arêtes différentes.')
      return
    }
    const [partA, partB] = result

    // Déterminer si c'est un espace drawn ou existing
    const isDrawn = drawn.some(s => s.id === selectedSpaceId)
    const sourceLabel = isDrawn
      ? drawn.find(s => s.id === selectedSpaceId)?.label
      : parsedPlan?.spaces.find(s => s.id === selectedSpaceId)?.label
    const sourceType = isDrawn
      ? drawn.find(s => s.id === selectedSpaceId)?.typeKey
      : (parsedPlan?.spaces.find(s => s.id === selectedSpaceId)?.type as SpaceTypeKey)

    // Espace A = remplace l'original, espace B = nouveau
    const shapeB: DrawnShape = {
      id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      typeKey: sourceType ?? 'a_definir',
      label: `${sourceLabel ?? 'Espace'} (2)`,
      polygon: partB,
      createdAt: Date.now(),
    }

    if (isDrawn) {
      const nextDrawn = drawn.map(s => s.id === selectedSpaceId ? { ...s, polygon: partA } : s).concat(shapeB)
      pushHistory(nextDrawn, undefined)
    } else {
      const nextPatches = { ...spacePatches, [selectedSpaceId]: { ...spacePatches[selectedSpaceId], polygon: partA } }
      const nextDrawn = [...drawn, shapeB]
      pushHistory(nextDrawn, nextPatches)
    }
  }

  const mergeSelectedSpaces = () => {
    if (mergeSelection.size < 2) return
    const polys: Pt[][] = []
    const idsArr = Array.from(mergeSelection)
    for (const id of idsArr) {
      const p = effectivePolygon(id)
      if (p) polys.push(p)
    }
    if (polys.length < 2) return

    const merged = mergePolygonsConvexHull(polys)
    if (merged.length < 3) {
      alert('La fusion a produit un polygone dégénéré.')
      return
    }

    // Premier id = reçoit le polygone fusionné (ou deviens drawn si existing)
    const primary = idsArr[0]
    const others = idsArr.slice(1)

    const primaryIsDrawn = drawn.some(s => s.id === primary)
    const othersDrawn = others.filter(id => drawn.some(s => s.id === id))
    const othersExisting = others.filter(id => !drawn.some(s => s.id === id))

    let nextDrawn = drawn.filter(s => !othersDrawn.includes(s.id))
    let nextPatches = { ...spacePatches }

    if (primaryIsDrawn) {
      nextDrawn = nextDrawn.map(s => s.id === primary ? { ...s, polygon: merged } : s)
    } else {
      nextPatches[primary] = { ...nextPatches[primary], polygon: merged }
    }
    for (const id of othersExisting) {
      nextPatches[id] = { ...nextPatches[id], deleted: true }
    }

    pushHistory(nextDrawn, nextPatches)
    setMergeSelection(new Set())
    setSelectedSpaceId(primary)
  }

  const addVertexOnEdge = (spaceId: string, world: Pt) => {
    const poly = effectivePolygon(spaceId)
    if (!poly) return
    const { index } = nearestEdge(poly, world)
    const isDrawn = drawn.some(s => s.id === spaceId)
    const newPoly = insertVertexOnSegment(poly, index, world)
    commitPolygonEdit(spaceId, newPoly, isDrawn)
  }

  const removeVertexAt = (spaceId: string, vertexIdx: number) => {
    const poly = effectivePolygon(spaceId)
    if (!poly || poly.length <= 3) return
    const isDrawn = drawn.some(s => s.id === spaceId)
    commitPolygonEdit(spaceId, removeVertex(poly, vertexIdx), isDrawn)
  }

  // ─── Commit final : injecter dans parsedPlan ───
  const saveAndClose = () => {
    if (!parsedPlan) { onClose(); return }
    const noChanges = drawn.length === 0 && Object.keys(spacePatches).length === 0
    if (noChanges) { onClose(); return }

    // 1. Appliquer les patches aux spaces existants (polygon modifié + deleted)
    const patchedExisting: DetectedSpace[] = parsedPlan.spaces
      .filter(sp => !spacePatches[sp.id]?.deleted)
      .map(sp => {
        const patchedPoly = spacePatches[sp.id]?.polygon
        if (!patchedPoly) return sp
        const b = polygonBounds(patchedPoly)
        return {
          ...sp,
          polygon: patchedPoly as [number, number][],
          bounds: {
            minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY,
            width: b.width, height: b.height,
            centerX: b.minX + b.width / 2, centerY: b.minY + b.height / 2,
          },
          areaSqm: polygonArea(patchedPoly),
        }
      })

    // 2. Convertir les shapes dessinées en DetectedSpace — EXCLUT les meubles
    // (les meubles vont dans placedObjects, pas dans spaces)
    const newSpaces = drawn
      .filter(s => !s.isArrow && !s.isFurniture)
      .map(s => {
        const b = polygonBounds(s.polygon)
        const sp: DetectedSpace = {
          id: s.id,
          label: s.label,
          type: autoDetectSpaceType(s.label, s.typeKey) as unknown as DetectedSpace['type'],
          polygon: s.polygon as [number, number][],
          bounds: {
            minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY,
            width: b.width, height: b.height,
            centerX: b.minX + b.width / 2, centerY: b.minY + b.height / 2,
          },
          areaSqm: polygonArea(s.polygon),
          color: null,
          floorId,
          layer: '__drawn__',
          metadata: { drawnAt: s.createdAt, typeKey: s.typeKey },
        }
        return sp
      })

    const next: ParsedPlan = {
      ...parsedPlan,
      spaces: [...patchedExisting, ...newSpaces],
    }
    setParsedPlan(next)

    // 3. Meubles déposés via drag → placedObjects du store
    const addObject = usePlanEngineStore.getState().addObject
    for (const s of drawn) {
      if (!s.isFurniture) continue
      const b = polygonBounds(s.polygon)
      addObject({
        id: s.id,
        type: 'furniture',
        spaceId: '',  // pas forcément lié à un space
        x: b.minX + b.width / 2,
        y: b.minY + b.height / 2,
        rotation: 0,
        catalogId: s.furnitureCatalogId,
        label: s.label,
      } as any)
    }

    onClose()
  }

  // ═══ Rendu SVG ═══════════════════════════════════════
  const gridPixelStep = snapGrid * scale
  const viewW = containerRef.current?.clientWidth ?? 800
  const viewH = containerRef.current?.clientHeight ?? 600

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white m-0">Éditeur de dessin</h2>
          <span className="text-[10px] text-slate-500">
            {drawn.length} forme{drawn.length > 1 ? 's' : ''} · snap {(snapGrid * 100).toFixed(0)} cm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveAndClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90">
            <Save size={12} /> Enregistrer ({drawn.filter(s => !s.isArrow).length} espace{drawn.filter(s => !s.isArrow).length > 1 ? 's' : ''})
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Barre d'outils */}
        <aside className="w-52 flex-shrink-0 border-r border-white/10 bg-surface-1/60 overflow-y-auto p-2 space-y-3">
          <ToolSection title="Sélection">
            <ToolBtn icon={MousePointer} label="Sélection simple" active={tool === 'select'} onClick={() => setTool('select')} hint="Cliquer un espace pour le sélectionner" />
          </ToolSection>

          <ToolSection title="Modifier géométrie">
            <ToolBtn icon={Edit3} label="Éditer sommets"
              active={tool === 'edit-vertex'}
              onClick={() => setTool('edit-vertex')}
              hint="Clic = sélectionner · drag sommet vert = déplacer · double-clic sur arête = ajouter sommet · clic droit sommet = retirer" />
            <ToolBtn icon={Move} label="Déplacer espace"
              active={tool === 'move-space'}
              onClick={() => setTool('move-space')}
              hint="Drag pour déplacer l'espace entier" />
            <ToolBtn icon={Scissors} label="Couper (split)"
              active={tool === 'split'}
              onClick={() => { setTool('split'); setDrawStart(null) }}
              hint="1) Sélectionner un espace · 2) Tracer une ligne qui le coupe" />
            <ToolBtn icon={GitMerge} label="Fusionner (merge)"
              active={tool === 'merge'}
              onClick={() => setTool('merge')}
              hint="Clic sur 2+ espaces puis bouton Fusionner" />
            {selectedSpaceId && (
              <button
                onClick={() => {
                  const isDrawn = drawn.some(s => s.id === selectedSpaceId)
                  if (isDrawn) deleteShape(selectedSpaceId)
                  else deleteExistingSpace(selectedSpaceId)
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] bg-red-900/40 hover:bg-red-900/60 text-red-200"
              >
                <Trash2 size={11} /> Supprimer l'espace sélectionné
              </button>
            )}
            {tool === 'merge' && mergeSelection.size >= 2 && (
              <button
                onClick={mergeSelectedSpaces}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold bg-atlas-600 hover:bg-atlas-500 text-white"
              >
                <GitMerge size={11} /> Fusionner {mergeSelection.size} espaces
              </button>
            )}
            {tool === 'merge' && mergeSelection.size > 0 && (
              <button
                onClick={() => setMergeSelection(new Set())}
                className="w-full px-2 py-1 rounded text-[9px] text-slate-400 hover:text-white"
              >
                Désélectionner tout
              </button>
            )}
          </ToolSection>

          <ToolSection title="Formes libres">
            <ToolBtn icon={Pentagon} label="Polygone" active={tool === 'polygon'} onClick={() => setTool('polygon')} hint="Clic = sommet · 2× = fermer · Échap = annuler" />
            <ToolBtn icon={Square} label="Rectangle" active={tool === 'rectangle'} onClick={() => setTool('rectangle')} hint="Clic 2× (2 coins)" />
          </ToolSection>

          {(tool === 'polygon' || tool === 'rectangle') && (
            <div className="space-y-2 px-2">
              <div>
                <label className="text-[9px] uppercase text-slate-500">Type d'espace</label>
                <select value={customTypeKey}
                  onChange={(e) => setCustomTypeKey(e.target.value as SpaceTypeKey)}
                  className="w-full bg-slate-800 text-white rounded px-2 py-1 text-[10px] border border-white/10 mt-1">
                  {(Object.keys(SPACE_TYPE_META) as SpaceTypeKey[]).map(k => (
                    <option key={k} value={k}>
                      {SPACE_TYPE_META[k].icon} {SPACE_TYPE_META[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase text-slate-500">Nom (optionnel)</label>
                <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={SPACE_TYPE_META[customTypeKey].label}
                  className="w-full bg-slate-800 text-white rounded px-2 py-1 text-[10px] border border-white/10 mt-1" />
              </div>
            </div>
          )}

          <ToolSection title="Places de parking">
            {Object.entries(PARKING_TEMPLATES).map(([t, tpl]) => (
              <ToolBtn key={t}
                icon={tpl.icon}
                label={`${tpl.label} (${tpl.w}×${tpl.h}m)`}
                active={tool === t}
                onClick={() => setTool(t as Tool)}
                iconColor={tpl.color}
                hint="Clic = poser la place" />
            ))}
          </ToolSection>

          <ToolSection title="Circulation">
            <ToolBtn icon={ArrowRight} label="Flèche sens" active={tool === 'arrow-flow'}
              onClick={() => setTool('arrow-flow')} hint="Clic 2× (origine → pointe)" />
          </ToolSection>

          <ToolSection title="Grille">
            <label className="flex items-center gap-2 text-[10px] text-slate-300 px-1">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              Afficher la grille
            </label>
            <div className="px-1">
              <div className="text-[9px] text-slate-500 uppercase">Snap</div>
              <div className="flex gap-1 mt-1">
                {[0, 0.1, 0.25, 0.5, 1].map(v => (
                  <button key={v} onClick={() => setSnapGrid(v)}
                    className={`flex-1 px-1 py-0.5 rounded text-[9px] font-mono ${
                      snapGrid === v ? 'bg-atlas-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                    {v === 0 ? 'off' : v >= 1 ? `${v}m` : `${v*100}cm`}
                  </button>
                ))}
              </div>
            </div>
          </ToolSection>

          <div className="border-t border-white/10 pt-2 px-1 flex gap-1">
            <button onClick={undo} disabled={historyIdx <= 0}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              title="Annuler (Ctrl+Z)">
              <Undo2 size={11} /> Undo
            </button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              title="Refaire (Ctrl+Y)">
              <Redo2 size={11} /> Redo
            </button>
          </div>
          <button onClick={() => pushHistory([])}
            disabled={drawn.length === 0}
            className="w-full flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-red-900/40 hover:bg-red-900/60 text-red-200 disabled:opacity-40"
            title="Tout supprimer">
            <Trash2 size={11} /> Tout effacer
          </button>
        </aside>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-800 cursor-crosshair"
             style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
          <svg ref={svgRef} width="100%" height="100%"
               onMouseMove={handleMouseMove}
               onMouseDown={handleMouseDown}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
               onDoubleClick={handleDoubleClick}
               onWheel={handleWheel}
               onDragOver={handleDragOver}
               onDrop={handleDrop}
               onContextMenu={(e) => e.preventDefault()}>
            {/* Fond plan importé */}
            {parsedPlan?.planImageUrl && (
              <image
                href={parsedPlan.planImageUrl}
                x={bounds.minX * scale + offset.x}
                y={bounds.minY * scale + offset.y}
                width={bounds.width * scale}
                height={bounds.height * scale}
                opacity={0.4}
                preserveAspectRatio="none"
              />
            )}

            {/* Grille */}
            {showGrid && gridPixelStep >= 5 && (
              <g opacity={0.25}>
                {Array.from({ length: Math.ceil(viewW / gridPixelStep) + 2 }, (_, i) => {
                  const x = (i * gridPixelStep) + (offset.x % gridPixelStep)
                  return <line key={`vx-${i}`} x1={x} y1={0} x2={x} y2={viewH} stroke="#64748b" strokeWidth={0.5} />
                })}
                {Array.from({ length: Math.ceil(viewH / gridPixelStep) + 2 }, (_, i) => {
                  const y = (i * gridPixelStep) + (offset.y % gridPixelStep)
                  return <line key={`hy-${i}`} x1={0} y1={y} x2={viewW} y2={y} stroke="#64748b" strokeWidth={0.5} />
                })}
              </g>
            )}

            {/* Espaces existants du plan (avec patches) */}
            {parsedPlan?.spaces.map(sp => {
              if (spacePatches[sp.id]?.deleted) return null
              const poly = effectivePolygon(sp.id)
              if (!poly || poly.length < 3) return null
              const d = polyToPath(poly, worldToScreen)
              const isSelected = selectedSpaceId === sp.id
              const inMerge = mergeSelection.has(sp.id)
              const patched = !!spacePatches[sp.id]?.polygon
              return (
                <g key={sp.id}>
                  <path d={d}
                    fill={inMerge ? 'rgba(179,138,90,0.25)' : isSelected ? 'rgba(52,211,153,0.20)' : patched ? 'rgba(251,191,36,0.12)' : 'rgba(179,138,90,0.06)'}
                    stroke={inMerge ? '#b38a5a' : isSelected ? '#10b981' : patched ? '#fbbf24' : 'rgba(179,138,90,0.35)'}
                    strokeWidth={isSelected || inMerge ? 2 : patched ? 1.5 : 1}
                    style={{ cursor: (tool === 'select' || tool === 'edit-vertex' || tool === 'move-space' || tool === 'split' || tool === 'merge') ? 'pointer' : 'default' }}
                  />
                  {/* Double-clic = ajouter sommet si mode edit-vertex */}
                  <path d={d} fill="transparent" stroke="transparent" strokeWidth={8}
                    onDoubleClick={(e) => {
                      if (tool === 'edit-vertex' && hoverPoint) {
                        e.stopPropagation()
                        addVertexOnEdge(sp.id, hoverPoint)
                      }
                    }} />
                </g>
              )
            })}

            {/* Poignées de sommets pour l'espace sélectionné (mode edit-vertex) */}
            {tool === 'edit-vertex' && selectedSpaceId && (() => {
              const poly = effectivePolygon(selectedSpaceId)
              if (!poly) return null
              const isDrawn = drawn.some(s => s.id === selectedSpaceId)
              return (
                <g>
                  {poly.map((v, i) => {
                    const s = worldToScreen(v[0], v[1])
                    return (
                      <g key={i}>
                        <circle cx={s.x} cy={s.y} r={6}
                          fill="#10b981" stroke="white" strokeWidth={2}
                          style={{ cursor: 'move' }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            setDraggingVertex({ spaceId: selectedSpaceId, vertexIdx: i, isDrawn })
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            if (poly.length > 3) removeVertexAt(selectedSpaceId, i)
                          }}
                        >
                          <title>Glisser pour déplacer · clic droit pour supprimer</title>
                        </circle>
                        <text x={s.x + 8} y={s.y - 4} fontSize={9} fill="#10b981"
                              style={{ pointerEvents: 'none' }}>
                          {i + 1}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })()}

            {/* Shapes dessinées */}
            {drawn.map(s => {
              if (s.isArrow) {
                return <DrawnArrow key={s.id} shape={s} worldToScreen={worldToScreen}
                                   onDelete={() => deleteShape(s.id)} selectable={tool === 'select'} />
              }
              const d = polyToPath(s.polygon, worldToScreen)
              const meta = SPACE_TYPE_META[s.typeKey]
              const isSelected = selectedSpaceId === s.id
              const inMerge = mergeSelection.has(s.id)
              const renderColor = s.isFurniture ? (s.color ?? '#64748b') : meta.color
              return (
                <g key={s.id}>
                  <path d={d}
                    fill={inMerge ? 'rgba(179,138,90,0.35)' : `${renderColor}${s.isFurniture ? '90' : '60'}`}
                    stroke={inMerge ? '#b38a5a' : isSelected ? '#10b981' : renderColor}
                    strokeWidth={isSelected || inMerge ? 3 : 2}
                    strokeDasharray={s.isFurniture ? '4,2' : undefined}
                    style={{ cursor: (tool === 'select' || tool === 'edit-vertex' || tool === 'move-space' || tool === 'split' || tool === 'merge') ? 'pointer' : 'default' }}
                  />
                  {/* Double-clic = ajouter sommet (mode edit-vertex) */}
                  <path d={d} fill="transparent" stroke="transparent" strokeWidth={8}
                    onDoubleClick={(e) => {
                      if (tool === 'edit-vertex' && isSelected && hoverPoint) {
                        e.stopPropagation()
                        addVertexOnEdge(s.id, hoverPoint)
                      }
                    }} />
                  {(() => {
                    const xs = s.polygon.map(p => p[0])
                    const ys = s.polygon.map(p => p[1])
                    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
                    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
                    const sc = worldToScreen(cx, cy)
                    return (
                      <text x={sc.x} y={sc.y} textAnchor="middle" dy="0.35em"
                            fontSize={s.isFurniture ? 9 : 11} fill="white" style={{ pointerEvents: 'none' }}>
                        {s.isFurniture ? `🪑 ${s.label.slice(0, 14)}` : s.label.slice(0, 18)}
                      </text>
                    )
                  })()}
                  {tool === 'select' && (() => {
                    const xs = s.polygon.map(p => p[0])
                    const ys = s.polygon.map(p => p[1])
                    const sc = worldToScreen(Math.max(...xs), Math.min(...ys))
                    return (
                      <circle cx={sc.x} cy={sc.y} r={8} fill="#ef4444"
                              className="cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); deleteShape(s.id) }}>
                        <title>Supprimer</title>
                      </circle>
                    )
                  })()}
                </g>
              )
            })}

            {/* Preview ligne de split */}
            {tool === 'split' && drawStart && hoverPoint && (() => {
              const p1 = worldToScreen(drawStart[0], drawStart[1])
              const p2 = worldToScreen(hoverPoint[0], hoverPoint[1])
              return (
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="#ef4444" strokeWidth={2} strokeDasharray="6,4" />
              )
            })()}

            {/* Preview polygone en cours */}
            {tool === 'polygon' && currentVerts.length > 0 && (
              <g>
                <polyline
                  points={currentVerts.map(v => {
                    const s = worldToScreen(v[0], v[1])
                    return `${s.x},${s.y}`
                  }).concat(hoverPoint ? [`${worldToScreen(hoverPoint[0], hoverPoint[1]).x},${worldToScreen(hoverPoint[0], hoverPoint[1]).y}`] : []).join(' ')}
                  fill="rgba(179,138,90,0.15)" stroke="#b38a5a" strokeWidth={2} strokeDasharray="5,3"
                />
                {currentVerts.map((v, i) => {
                  const s = worldToScreen(v[0], v[1])
                  return <circle key={i} cx={s.x} cy={s.y} r={4} fill="#b38a5a" />
                })}
              </g>
            )}

            {/* Preview rectangle en cours */}
            {tool === 'rectangle' && drawStart && hoverPoint && (() => {
              const p1 = worldToScreen(drawStart[0], drawStart[1])
              const p2 = worldToScreen(hoverPoint[0], hoverPoint[1])
              return (
                <rect x={Math.min(p1.x, p2.x)} y={Math.min(p1.y, p2.y)}
                      width={Math.abs(p2.x - p1.x)} height={Math.abs(p2.y - p1.y)}
                      fill="rgba(179,138,90,0.15)" stroke="#b38a5a" strokeWidth={2} strokeDasharray="5,3" />
              )
            })()}

            {/* Preview place parking sous le curseur */}
            {tool.startsWith('parking-') && hoverPoint && (() => {
              const tpl = PARKING_TEMPLATES[tool as keyof typeof PARKING_TEMPLATES]
              if (!tpl) return null
              const [cx, cy] = hoverPoint
              const p1 = worldToScreen(cx - tpl.w / 2, cy - tpl.h / 2)
              const p2 = worldToScreen(cx + tpl.w / 2, cy + tpl.h / 2)
              return (
                <rect x={p1.x} y={p1.y} width={p2.x - p1.x} height={p2.y - p1.y}
                      fill={`${tpl.color}55`} stroke={tpl.color} strokeWidth={2} strokeDasharray="4,2" />
              )
            })()}

            {/* Preview flèche en cours */}
            {tool === 'arrow-flow' && drawStart && hoverPoint && (() => {
              const p1 = worldToScreen(drawStart[0], drawStart[1])
              const p2 = worldToScreen(hoverPoint[0], hoverPoint[1])
              return (
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="#f59e0b" strokeWidth={3} strokeDasharray="5,3"
                      markerEnd="url(#arrowhead-preview)" />
              )
            })()}

            {/* Point de hover (feedback snap) */}
            {hoverPoint && tool !== 'select' && (() => {
              const s = worldToScreen(hoverPoint[0], hoverPoint[1])
              return <circle cx={s.x} cy={s.y} r={3} fill="#b38a5a" opacity={0.9} />
            })()}

            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
              <marker id="arrowhead-preview" viewBox="0 0 10 10" refX="8" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
            </defs>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button onClick={() => zoomTo(1.25)} className="p-2 rounded bg-surface-1/90 text-white hover:bg-slate-800" title="Zoom +">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => zoomTo(0.8)} className="p-2 rounded bg-surface-1/90 text-white hover:bg-slate-800" title="Zoom -">
              <ZoomOut size={14} />
            </button>
            <button onClick={fitView} className="p-2 rounded bg-surface-1/90 text-white hover:bg-slate-800" title="Recadrer (F)">
              <Maximize size={14} />
            </button>
          </div>

          {/* Status bar */}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-surface-1/95 text-[10px] text-slate-300 flex items-center gap-3 border border-white/10">
            {hoverPoint && (
              <span className="font-mono tabular-nums">
                ({hoverPoint[0].toFixed(2)}, {hoverPoint[1].toFixed(2)}) m
              </span>
            )}
            <span>Zoom : {(scale).toFixed(0)} px/m</span>
            {tool !== 'select' && (
              <span className="text-atlas-300">
                Outil : {tool}
                {tool === 'polygon' && currentVerts.length > 0 && ` · ${currentVerts.length} sommet(s)`}
              </span>
            )}
          </div>

          {/* Aide raccourcis */}
          <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-surface-1/90 text-[10px] text-slate-400 border border-white/10 max-w-xs">
            <div className="font-bold text-white mb-1">Raccourcis</div>
            <div>• <kbd className="bg-slate-800 px-1 rounded">Esc</kbd> annuler l'outil en cours</div>
            <div>• <kbd className="bg-slate-800 px-1 rounded">Enter</kbd> fermer le polygone</div>
            <div>• <kbd className="bg-slate-800 px-1 rounded">Ctrl+Z</kbd> / <kbd className="bg-slate-800 px-1 rounded">Ctrl+Y</kbd></div>
            <div>• Molette = zoom</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ Helpers ═══════════════════════════════════════════

function DrawnArrow({ shape, worldToScreen, onDelete, selectable }: {
  shape: DrawnShape
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  onDelete: () => void
  selectable: boolean
}) {
  const p1 = worldToScreen(shape.polygon[0][0], shape.polygon[0][1])
  const p2 = worldToScreen(shape.polygon[1][0], shape.polygon[1][1])
  return (
    <g>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="#f59e0b" strokeWidth={4} markerEnd="url(#arrowhead)" />
      {selectable && (
        <circle cx={p2.x} cy={p2.y} r={8} fill="#ef4444"
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onDelete() }}>
          <title>Supprimer flèche</title>
        </circle>
      )}
    </g>
  )
}

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-slate-500 tracking-wider px-1 mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function ToolBtn({
  icon: Icon, label, active, onClick, hint, iconColor,
}: {
  icon: React.ComponentType<any>
  label: string
  active: boolean
  onClick: () => void
  hint?: string
  iconColor?: string
}) {
  return (
    <button onClick={onClick} title={hint}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-left transition ${
        active
          ? 'bg-atlas-500/30 text-white border border-atlas-500/50'
          : 'text-slate-300 hover:bg-white/5 border border-transparent'
      }`}>
      <Icon size={12} style={{ color: active ? undefined : iconColor }} />
      {label}
    </button>
  )
}

function polyToPath(polygon: [number, number][], worldToScreen: (x: number, y: number) => { x: number; y: number }): string {
  if (polygon.length === 0) return ''
  const first = worldToScreen(polygon[0][0], polygon[0][1])
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < polygon.length; i++) {
    const p = worldToScreen(polygon[i][0], polygon[i][1])
    d += ` L ${p.x} ${p.y}`
  }
  d += ' Z'
  return d
}

