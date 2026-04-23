// ═══ SPACE EDITOR CANVAS ═══
//
// Canvas SVG interactif pour dessiner / éditer les espaces du plan Vol.3.
// 5 modes de dessin (spec PROPH3T Vol.3) :
//   - select : sélection + drag vertex + insert on edge + delete on dblclick
//   - poly   : clic points, double-clic pour fermer
//   - rect   : drag rectangle, snap grid
//   - curve  : clic points + smoothing Catmull-Rom automatique
//   - wall   : tracer ligne → polygone rectangulaire épais (épaisseur configurable)
//
// Opérations avancées :
//   - Fusion (union) de plusieurs polygones
//   - Découpe (split) d'un polygone par ligne
//   - Duplication (Ctrl+D)
//   - Supprimer (Del/Backspace)
//   - Escape : annule l'opération en cours

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  MousePointer,
  Hexagon,
  Square,
  Spline,
  MoveHorizontal,
  Merge,
  Scissors,
  Copy,
  Trash2,
  Grid3X3,
  Check,
  AlertTriangle,
  Car,
  Accessibility,
  Zap,
  Bike,
  Package,
  Users2,
  ArrowRight,
  DoorOpen,
  DoorClosed,
  AlertOctagon,
  RectangleVertical,
  Undo2,
  StickyNote,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react'
import { AnnotationsLayer }     from './AnnotationsLayer'
import type { AnnotationType }  from '../stores/annotationsStore'
import * as Geo from '../engines/plan-analysis/spaceGeometryEngine'
import {
  SPACE_TYPE_META,
  SPACE_TYPES_BY_CATEGORY,
  SPACE_CATEGORY_META,
  FLOOR_LEVEL_META,
  type SpaceTypeKey,
  type SpaceTypeCategory,
  type FloorLevelKey,
  autoDetectSpaceType,
  checkSurfaceAnomaly
} from '../proph3t/libraries/spaceTypeLibrary'

// ─── Types ─────────────────────────────────────────

export type DrawMode =
  | 'select' | 'poly' | 'rect' | 'curve' | 'wall'
  // Templates parking (clic = pose)
  | 'parking-standard' | 'parking-pmr' | 'parking-ve'
  | 'parking-moto' | 'parking-livraison' | 'parking-famille'
  // Templates portes (clic = pose)
  | 'door-entree' | 'door-double' | 'door-automatique'
  | 'door-interieure' | 'door-secours' | 'door-service'
  // Flèche sens (2 clics)
  | 'arrow-flow'
  // Annotations texte libres (Phase 1 cartographie)
  | 'annotate'

// Templates parking (dimensions en mètres)
const PARKING_TEMPLATES: Record<string, { w: number; h: number; typeKey: SpaceTypeKey; label: string; color: string }> = {
  'parking-standard':  { w: 2.5, h: 5,   typeKey: 'parking_place_standard',  label: 'Place std',  color: '#60a5fa' },
  'parking-pmr':       { w: 3.3, h: 5,   typeKey: 'parking_place_pmr',       label: 'Place PMR',  color: '#3b82f6' },
  'parking-ve':        { w: 2.5, h: 5,   typeKey: 'parking_place_ve',        label: 'Borne VE',   color: '#22c55e' },
  'parking-moto':      { w: 1,   h: 2,   typeKey: 'parking_place_moto',      label: 'Moto',       color: '#7dd3fc' },
  'parking-livraison': { w: 3,   h: 7,   typeKey: 'parking_place_livraison', label: 'Livraison',  color: '#f59e0b' },
  'parking-famille':   { w: 3,   h: 5,   typeKey: 'parking_place_famille',   label: 'Famille',    color: '#f472b6' },
}

// Templates portes & accès (dimensions en mètres)
// Largeur = passage utile, hauteur = épaisseur (dans le plan)
const DOOR_TEMPLATES: Record<string, { w: number; h: number; typeKey: SpaceTypeKey; label: string; color: string }> = {
  'door-entree':       { w: 1.0, h: 0.2, typeKey: 'porte_entree',      label: 'Porte entrée',   color: '#10b981' },
  'door-double':       { w: 1.8, h: 0.2, typeKey: 'porte_double',      label: 'Porte double',   color: '#059669' },
  'door-automatique':  { w: 1.5, h: 0.2, typeKey: 'porte_automatique', label: 'Porte auto',     color: '#14b8a6' },
  'door-interieure':   { w: 0.9, h: 0.15, typeKey: 'porte_interieure', label: 'Porte int.',     color: '#64748b' },
  'door-secours':      { w: 1.2, h: 0.2, typeKey: 'porte_secours',     label: 'Porte secours',  color: '#ef4444' },
  'door-service':      { w: 1.0, h: 0.2, typeKey: 'porte_service',     label: 'Porte service',  color: '#0d9488' },
}

export interface EditableSpace {
  id: string
  name: string
  type: SpaceTypeKey
  polygon: Geo.Polygon
  floorLevel: FloorLevelKey
  validated: boolean
  notes?: string
  // ── Champs commerciaux (locaux commerciaux) ──
  /** Numéro de local : ex "A-012", "RDC-24" */
  localNumber?: string
  /** Nom de l'occupant. Vide = vacant. */
  tenant?: string
  /** true = vacant (par défaut), false = occupé */
  vacant?: boolean
  // ── Multi-niveau & mezzanine ──
  /** ID d'unité fonctionnelle commune à plusieurs niveaux (ex : Big Box sur 2 étages). */
  unitId?: string
  /** Ce local possède-t-il une mezzanine intérieure ? */
  hasMezzanine?: boolean
  /** Surface de la mezzanine en m² (informative). */
  mezzanineSqm?: number
}

interface Props {
  /** Bounds du plan en mètres. */
  planBounds: { width: number; height: number }
  /** Spaces actuels. */
  spaces: EditableSpace[]
  /** Callback changement de spaces. */
  onSpacesChange: (spaces: EditableSpace[]) => void
  /** Image/plan de fond (URL blob/img data). */
  backgroundUrl?: string
  /** Niveau actif. */
  activeFloor: FloorLevelKey
  /** Callback pour changer le niveau actif. */
  onFloorChange: (floor: FloorLevelKey) => void
}

// ─── Helpers portes ──────────────────────────────────

/** Types qui se rendent comme un trait (ouverture) et non comme un polygone rempli. */
function isDoorType(type: SpaceTypeKey): boolean {
  return type.startsWith('porte_') || type === 'sortie_secours'
}

/** Hit-test d'un espace avec tolérance étendue pour les portes.
 *  Les portes étant des polygones très fins (0,2 m), un clic pixel-perfect
 *  est impossible à faible zoom. On étend la zone cliquable à `toleranceM`
 *  mètres autour des arêtes. */
function pointHitsSpace(
  world: { x: number; y: number },
  space: EditableSpace,
  toleranceM: number,
): boolean {
  // Intérieur polygone = hit normal
  if (Geo.pointInPolygon(world.x, world.y, space.polygon)) return true
  // Pour les portes (ou si tolérance > 0), on teste aussi la distance aux arêtes
  if (!isDoorType(space.type) && toleranceM <= 0) return false
  const pts = space.polygon
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    const d = Geo.distancePointToSegment(world, pts[i], pts[j])
    if (d <= toleranceM) return true
  }
  return false
}

/**
 * Rend une porte comme un trait architectural :
 *   ─ tiret central = feuille/vantail (le passage)
 *   ├ petits jambages perpendiculaires aux extrémités = tableau de porte
 * On repère le bord le plus long du polygone = l'ouverture.
 */
function DoorLineSymbol({
  screenPts,
  color,
  strokeWidth,
}: {
  screenPts: { x: number; y: number }[]
  color: string
  strokeWidth: number
}) {
  if (screenPts.length < 2) return null

  // Trouver l'arête la plus longue = ouverture
  let maxLen = 0
  let bestI = 0
  for (let i = 0; i < screenPts.length; i++) {
    const j = (i + 1) % screenPts.length
    const d = Math.hypot(screenPts[j].x - screenPts[i].x, screenPts[j].y - screenPts[i].y)
    if (d > maxLen) { maxLen = d; bestI = i }
  }
  const p1 = screenPts[bestI]
  const p2 = screenPts[(bestI + 1) % screenPts.length]
  if (maxLen < 1) return null

  // Vecteur unitaire le long de l'ouverture
  const ux = (p2.x - p1.x) / maxLen
  const uy = (p2.y - p1.y) / maxLen
  // Perpendiculaire (jambages) — longueur fixe 6 px indépendamment du zoom
  const jambLen = 6
  const nx = -uy * jambLen
  const ny =  ux * jambLen

  return (
    <g>
      {/* Trait principal = feuille/vantail */}
      <line
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      />
      {/* Jambage gauche */}
      <line
        x1={p1.x - nx} y1={p1.y - ny} x2={p1.x + nx} y2={p1.y + ny}
        stroke={color} strokeWidth={strokeWidth * 0.75} strokeLinecap="round"
      />
      {/* Jambage droit */}
      <line
        x1={p2.x - nx} y1={p2.y - ny} x2={p2.x + nx} y2={p2.y + ny}
        stroke={color} strokeWidth={strokeWidth * 0.75} strokeLinecap="round"
      />
    </g>
  )
}

const GRID_STEP_M = 0.5       // pas de grille de 50 cm
const VERTEX_HIT_PX = 10       // tolérance de hit-test vertex en px
const EDGE_HIT_PX = 8          // tolérance edge

// ─── Composant principal ─────────────────────────

export function SpaceEditorCanvas({
  planBounds, spaces, onSpacesChange, backgroundUrl, activeFloor, onFloorChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<DrawMode>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredVertex, setHoveredVertex] = useState<{ spaceId: string; idx: number } | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<{ spaceId: string; idx: number; point: Geo.Point } | null>(null)
  const [draftPoints, setDraftPoints] = useState<Geo.Point[]>([])
  const [dragStart, setDragStart] = useState<Geo.Point | null>(null)
  // draggingVertex déclaré plus bas dans le bloc Pan (refs + state combinés)
  const [splitLine, setSplitLine] = useState<[Geo.Point, Geo.Point] | null>(null)
  const [viewport, setViewport] = useState({ scale: 4, offsetX: 20, offsetY: 20 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [wallThicknessCm, setWallThicknessCm] = useState(20)
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [showOnlyActiveFloor, setShowOnlyActiveFloor] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [cursorWorld, setCursorWorld] = useState<Geo.Point | null>(null)
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null)
  const [annotateType, setAnnotateType]   = useState<AnnotationType>('note')
  /** Dernier espace survolé — NE s'efface PAS sur mouseLeave.
   *  Reste actif jusqu'au prochain survol d'un autre espace ou clic vide.
   *  Permet à Delete de fonctionner même si la souris a quitté l'espace. */
  const lastFocusedSpaceIdRef = useRef<string | null>(null)

  // ─── Historique Undo (Ctrl+Z) ────────────────────
  const historyRef = useRef<EditableSpace[][]>([])
  const [canUndo, setCanUndo] = useState(false)

  // ─── Refs live pour les keyboard handlers (évite stale closures + TDZ) ──────
  const spacesRef = useRef(spaces)
  const selectedIdsRef = useRef(selectedIds)
  const editingSpaceIdRef = useRef(editingSpaceId)
  // Refs pour les fonctions définies plus bas (évite TDZ dans le useEffect)
  const duplicateSelectedRef = useRef<() => void>(() => {})
  const mergeSelectedRef = useRef<() => void>(() => {})
  const rotateSelectedRef = useRef<(angle: number) => void>(() => {})
  const flipSelectedHRef = useRef<() => void>(() => {})
  const flipSelectedVRef = useRef<() => void>(() => {})
  spacesRef.current = spaces
  selectedIdsRef.current = selectedIds
  editingSpaceIdRef.current = editingSpaceId

  /** Wrapper autour de onSpacesChange qui sauvegarde l'état courant dans l'historique. */
  const changeSpaces = useCallback((newSpaces: EditableSpace[]) => {
    historyRef.current = [...historyRef.current.slice(-49), [...spacesRef.current]]
    setCanUndo(true)
    onSpacesChange(newSpaces)
  }, [onSpacesChange])

  const undoChange = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setCanUndo(historyRef.current.length > 0)
    onSpacesChange(prev)
    setSelectedIds(new Set())
    setEditingSpaceId(null)
  }, [onSpacesChange])

  // Filtré par niveau
  const visibleSpaces = useMemo(
    () => showOnlyActiveFloor ? spaces.filter(s => s.floorLevel === activeFloor) : spaces,
    [spaces, activeFloor, showOnlyActiveFloor],
  )

  // ─── Conversion screen ↔ monde ────────────────
  // Fonctions simples (pas de useCallback) — toujours recréées avec le viewport courant.

  const screenToWorld = (sx: number, sy: number): Geo.Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = (sx - rect.left - viewport.offsetX) / viewport.scale
    const y = (sy - rect.top - viewport.offsetY) / viewport.scale
    return snapEnabled ? Geo.snapToGrid({ x, y }, GRID_STEP_M) : { x, y }
  }

  const worldToScreen = (x: number, y: number): Geo.Point => ({
    x: x * viewport.scale + viewport.offsetX,
    y: y * viewport.scale + viewport.offsetY,
  })

  // Wrapper for AnnotationsLayer — receives container-relative coords (no rect subtraction)
  const annScreenToWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - viewport.offsetX) / viewport.scale,
    y: (sy - viewport.offsetY) / viewport.scale,
  }), [viewport])

  // ─── Gestion clavier — enregistré UNE SEULE FOIS (toutes les valeurs via refs) ──

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return

      if (e.key === 'Escape') {
        setDraftPoints([])
        setDragStart(null)
        setSplitLine(null)
        setDraggingVertex(null)
        setEditingSpaceId(null)
        setSelectedIds(new Set())
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undoChange()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateSelectedRef.current()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const curSel = selectedIdsRef.current
        const curSpaces = spacesRef.current
        if (curSel.size > 0) {
          changeSpaces(curSpaces.filter(s => !curSel.has(s.id)))
          setSelectedIds(new Set())
          setEditingSpaceId(null)
          lastFocusedSpaceIdRef.current = null
        } else if (lastFocusedSpaceIdRef.current) {
          const idToDelete = lastFocusedSpaceIdRef.current
          changeSpaces(curSpaces.filter(s => s.id !== idToDelete))
          lastFocusedSpaceIdRef.current = null
          setHoveredSpaceId(null)
          setEditingSpaceId(null)
        }
        return
      }
      if (e.key === 'm' && !editingSpaceIdRef.current) {
        mergeSelectedRef.current()
      }
      // Rotation / flip — pratiques pour les portes (orientation + sens d'ouverture)
      if (e.key === 'r' && !editingSpaceIdRef.current) {
        // Shift+R = rotation anti-horaire (−90°), R = rotation horaire (+90°)
        rotateSelectedRef.current(e.shiftKey ? -90 : 90)
      }
      if (e.key === 'h' && !editingSpaceIdRef.current && !e.ctrlKey && !e.metaKey) {
        flipSelectedHRef.current()
      }
      if (e.key === 'v' && !editingSpaceIdRef.current && !e.ctrlKey && !e.metaKey) {
        flipSelectedVRef.current()
      }
      // Toggle panneau raccourcis
      if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !editingSpaceIdRef.current) {
        setShowShortcuts(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // undoChange et changeSpaces sont stables (useCallback + onSpacesChange stable)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoChange, changeSpaces])

  // ─── Wheel zoom — centré sur le curseur ─────────────

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = -e.deltaY * 0.0015
    // setViewport fonctionnel : lit le viewport courant sans closure stale
    setViewport(v => {
      const worldX = (mx - v.offsetX) / v.scale
      const worldY = (my - v.offsetY) / v.scale
      const newScale = Math.max(0.3, Math.min(80, v.scale * (1 + delta)))
      return {
        scale: newScale,
        offsetX: mx - worldX * newScale,
        offsetY: my - worldY * newScale,
      }
    })
  }

  // ─── Pan — middle-click OU Space + drag OU clic-gauche zone vide ───
  //
  // Tout l'état impératif des gestes est en REFS (lecture synchrone, jamais stale).
  // Les états React correspondants servent uniquement à l'affichage du curseur.

  /** Ref pan — set synchrone dans startPan, lu dans doPan/endPan */
  const isPanningRef  = useRef(false)
  const panStartRef   = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null)
  /** Ref drag vertex — set dans handleMouseDown, lu dans handleMouseMove/Up */
  const draggingVertexRef  = useRef<{ spaceId: string; idx: number } | null>(null)
  /** Ref drag espaces entiers (translation de la sélection) */
  const draggingSpacesRef  = useRef<{ ids: Set<string>; startWorld: { x: number; y: number }; originalPolygons: Map<string, Geo.Polygon> } | null>(null)
  /** Ref threshold drag (distance écran avant de considérer que c'est un drag et pas un clic). */
  const dragSpacesThresholdRef = useRef<{ startX: number; startY: number; triggered: boolean } | null>(null)
  /** Snapshot avant le début d'un drag → un seul step d'historique en fin de drag */
  const preDragSpacesRef   = useRef<EditableSpace[]>([])
  /** Ref space key — évite la stale closure dans le useEffect */
  const spaceDownRef       = useRef(false)

  // États visuels uniquement (curseur, rendu vertex actif)
  const [isPanning,      setIsPanning]      = useState(false)
  const [draggingVertex, setDraggingVertex] = useState<{ spaceId: string; idx: number } | null>(null)
  const [spaceDown,      setSpaceDown]      = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
      if (e.code === 'Space' && !spaceDownRef.current) {
        e.preventDefault()
        spaceDownRef.current = true
        setSpaceDown(true)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        fitToScreen()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomBy(1.25)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomBy(0.8)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceDownRef.current = false; setSpaceDown(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // Enregistré une seule fois — fitToScreen/zoomBy utilisent setViewport(v=>) (pas de stale)

  const startPan = (clientX: number, clientY: number) => {
    isPanningRef.current = true
    panStartRef.current  = { x: clientX, y: clientY, offX: viewport.offsetX, offY: viewport.offsetY }
    setIsPanning(true)
  }

  const doPan = (clientX: number, clientY: number) => {
    const start = panStartRef.current
    if (!start) return
    setViewport(v => ({
      ...v,
      offsetX: start.offX + (clientX - start.x),
      offsetY: start.offY + (clientY - start.y),
    }))
  }

  const endPan = () => {
    isPanningRef.current = false
    panStartRef.current  = null
    setIsPanning(false)
  }

  // ─── Zoom buttons + fit ─────────────────────────
  // setViewport(v=>) : toujours le viewport courant sans closure stale.

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = rect.width / 2
    const my = rect.height / 2
    setViewport(v => {
      const worldX = (mx - v.offsetX) / v.scale
      const worldY = (my - v.offsetY) / v.scale
      const newScale = Math.max(0.3, Math.min(80, v.scale * factor))
      return {
        scale: newScale,
        offsetX: mx - worldX * newScale,
        offsetY: my - worldY * newScale,
      }
    })
  }

  const fitToScreen = () => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const padding = 40
    const fit = Math.min(
      (rect.width - padding * 2) / Math.max(1, planBounds.width),
      (rect.height - padding * 2) / Math.max(1, planBounds.height),
    )
    setViewport({
      scale: fit,
      offsetX: (rect.width - planBounds.width * fit) / 2,
      offsetY: (rect.height - planBounds.height * fit) / 2,
    })
  }

  // ─── Événements souris ───────────────────────

  // ─── Gestionnaires souris — fonctions simples (PAS de useCallback) ─────────
  // Sans useCallback, chaque render fournit une closure fraîche sur tout l'état.
  // Les gestes impératifs (pan, drag vertex) passent par des refs pour une
  // lecture synchrone même entre deux renders React.

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan : middle-click (1), ou clic gauche + Space maintenu
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault()
      startPan(e.clientX, e.clientY)
      return
    }
    if (e.button !== 0) return
    const world = screenToWorld(e.clientX, e.clientY)

    if (mode === 'select') {
      // Clic sur un vertex ?
      for (const s of visibleSpaces) {
        const vi = Geo.findClosestVertex(s.polygon, world, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) {
          // Snapshot avant drag (un seul step d'undo pour tout le drag)
          preDragSpacesRef.current = [...spacesRef.current]
          draggingVertexRef.current = { spaceId: s.id, idx: vi }
          setDraggingVertex({ spaceId: s.id, idx: vi })
          return
        }
      }
      // Clic sur une edge pour insérer un vertex
      for (const s of visibleSpaces) {
        const hit = Geo.findClosestEdge(s.polygon, world, EDGE_HIT_PX / viewport.scale)
        if (hit) {
          const newPoly = Geo.insertVertex(s.polygon, hit.edgeIdx, hit.point)
          // Snapshot puis update direct (pas de changeSpaces → pas de history spam)
          preDragSpacesRef.current = [...spacesRef.current]
          onSpacesChange(spaces.map(sp => sp.id === s.id ? { ...sp, polygon: newPoly } : sp))
          draggingVertexRef.current = { spaceId: s.id, idx: hit.edgeIdx + 1 }
          setDraggingVertex({ spaceId: s.id, idx: hit.edgeIdx + 1 })
          return
        }
      }
      // Clic sur un polygone = sélection (si nécessaire) + ARMER un drag
      // différé (démarre seulement si le curseur bouge > 3 px écran). Gère
      // d'un seul geste : 1 clic sans bouger = select pur, 1 clic+glisser
      // = select + translate.
      // Tolérance étendue pour les portes (sinon impossibles à cliquer à faible zoom).
      const clickTolM = 12 / viewport.scale
      for (const s of visibleSpaces) {
        if (pointHitsSpace(world, s, clickTolM)) {
          // Si espace non sélectionné (et pas Shift), on sélectionne d'abord
          let ids: Set<string>
          if (e.shiftKey) {
            const next = new Set(selectedIdsRef.current)
            if (next.has(s.id)) next.delete(s.id)
            else next.add(s.id)
            setSelectedIds(next)
            ids = next
          } else {
            const wasSelected = selectedIdsRef.current.has(s.id)
            if (!wasSelected) {
              setSelectedIds(new Set([s.id]))
              ids = new Set([s.id])
            } else {
              ids = new Set(selectedIdsRef.current)
            }
          }
          // Armer le drag (il démarrera réellement après un seuil dans mousemove)
          const originalPolygons = new Map<string, Geo.Polygon>()
          for (const sp of spacesRef.current) {
            if (ids.has(sp.id)) originalPolygons.set(sp.id, sp.polygon.map(p => ({ ...p })))
          }
          draggingSpacesRef.current = { ids, startWorld: world, originalPolygons }
          dragSpacesThresholdRef.current = { startX: e.clientX, startY: e.clientY, triggered: false }
          preDragSpacesRef.current = spacesRef.current
          return
        }
      }
      // Clic sur zone vide = pan du plan + désélection + reset focus sticky
      setSelectedIds(new Set())
      lastFocusedSpaceIdRef.current = null
      e.preventDefault()
      startPan(e.clientX, e.clientY)
      return
    }

    if (mode === 'poly' || mode === 'curve') {
      setDraftPoints([...draftPoints, world])
      return
    }

    if (mode === 'rect') {
      setDragStart(world)
      return
    }

    if (mode === 'wall') {
      if (!dragStart) {
        setDragStart(world)
      } else {
        const snapped = e.shiftKey ? Geo.snapAngle(dragStart, world, 45) : world
        const poly = Geo.wallSegmentToPoly(dragStart, snapped, wallThicknessCm / 100)
        createSpace(poly)
        setDragStart(null)
      }
      return
    }

    // Templates parking — clic unique = rectangle centré sur le clic
    if (mode.startsWith('parking-')) {
      const tpl = PARKING_TEMPLATES[mode as keyof typeof PARKING_TEMPLATES]
      if (tpl) {
        const poly: Geo.Polygon = [
          { x: world.x - tpl.w / 2, y: world.y - tpl.h / 2 },
          { x: world.x + tpl.w / 2, y: world.y - tpl.h / 2 },
          { x: world.x + tpl.w / 2, y: world.y + tpl.h / 2 },
          { x: world.x - tpl.w / 2, y: world.y + tpl.h / 2 },
        ]
        createSpaceWithType(poly, tpl.typeKey, tpl.label)
      }
      return
    }

    // Templates portes — clic unique = rectangle fin centré sur le clic
    if (mode.startsWith('door-')) {
      const tpl = DOOR_TEMPLATES[mode as keyof typeof DOOR_TEMPLATES]
      if (tpl) {
        const poly: Geo.Polygon = [
          { x: world.x - tpl.w / 2, y: world.y - tpl.h / 2 },
          { x: world.x + tpl.w / 2, y: world.y - tpl.h / 2 },
          { x: world.x + tpl.w / 2, y: world.y + tpl.h / 2 },
          { x: world.x - tpl.w / 2, y: world.y + tpl.h / 2 },
        ]
        createSpaceWithType(poly, tpl.typeKey, tpl.label)
      }
      return
    }

    // Flèche sens — 2 clics
    if (mode === 'arrow-flow') {
      if (!dragStart) {
        setDragStart(world)
      } else {
        const dx = world.x - dragStart.x
        const dy = world.y - dragStart.y
        const len = Math.hypot(dx, dy)
        if (len < 0.2) { setDragStart(null); return }
        const nx = -dy / len, ny = dx / len
        const t = 0.15
        const headL = Math.min(0.8, len * 0.3)
        const headW = 0.35
        const bx = world.x - dx / len * headL
        const by = world.y - dy / len * headL
        const poly: Geo.Polygon = [
          { x: dragStart.x + nx * t, y: dragStart.y + ny * t },
          { x: bx + nx * t,           y: by + ny * t },
          { x: bx + nx * headW,       y: by + ny * headW },
          { x: world.x,               y: world.y },
          { x: bx - nx * headW,       y: by - ny * headW },
          { x: bx - nx * t,           y: by - ny * t },
          { x: dragStart.x - nx * t,  y: dragStart.y - ny * t },
        ]
        createSpaceWithType(poly, 'parking_fleche_sens', 'Flèche sens')
        setDragStart(null)
      }
      return
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Pan en cours — lu depuis la ref, toujours synchrone
    if (isPanningRef.current) { doPan(e.clientX, e.clientY); return }

    const world = screenToWorld(e.clientX, e.clientY)
    setCursorWorld(world)

    // Drag vertex — lu depuis la ref (set synchronement dans mouseDown)
    if (draggingVertexRef.current) {
      const dv = draggingVertexRef.current
      const s = spaces.find(sp => sp.id === dv.spaceId)
      if (s) {
        // onSpacesChange direct : PAS de changeSpaces → PAS d'histoire spammée
        // L'historique est commité en UN seul step dans handleMouseUp.
        onSpacesChange(spaces.map(sp =>
          sp.id === dv.spaceId
            ? { ...sp, polygon: Geo.moveVertex(sp.polygon, dv.idx, world) }
            : sp
        ))
      }
      return
    }

    // Drag espaces entiers (translation sélection — portes, zones)
    if (draggingSpacesRef.current) {
      // Seuil de 3 px écran avant de déclencher le drag : évite le drift
      // d'un clic simple (sélection pure).
      const thr = dragSpacesThresholdRef.current
      if (thr && !thr.triggered) {
        const dScreen = Math.hypot(e.clientX - thr.startX, e.clientY - thr.startY)
        if (dScreen < 3) return
        thr.triggered = true
      }
      const { ids, startWorld, originalPolygons } = draggingSpacesRef.current
      const dx = world.x - startWorld.x
      const dy = world.y - startWorld.y
      onSpacesChange(spaces.map(sp => {
        if (!ids.has(sp.id)) return sp
        const orig = originalPolygons.get(sp.id)
        if (!orig) return sp
        return { ...sp, polygon: orig.map(p => ({ x: p.x + dx, y: p.y + dy })) }
      }))
      return
    }

    // Hover detection en mode select
    if (mode === 'select') {
      let foundVertex: typeof hoveredVertex = null
      let foundEdge: typeof hoveredEdge = null
      for (const s of visibleSpaces) {
        const vi = Geo.findClosestVertex(s.polygon, world, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) { foundVertex = { spaceId: s.id, idx: vi }; break }
        const eh = Geo.findClosestEdge(s.polygon, world, EDGE_HIT_PX / viewport.scale)
        if (eh) { foundEdge = { spaceId: s.id, idx: eh.edgeIdx, point: eh.point }; break }
      }
      setHoveredVertex(foundVertex)
      setHoveredEdge(foundEdge)
    }

    // Split line preview
    if (splitLine) {
      setSplitLine([splitLine[0], world])
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanningRef.current) { endPan(); return }

    if (draggingVertexRef.current) {
      // Commit l'historique : on sauvegarde l'état d'AVANT le drag en UN seul step.
      if (preDragSpacesRef.current.length > 0) {
        historyRef.current = [...historyRef.current.slice(-49), preDragSpacesRef.current]
        setCanUndo(true)
        preDragSpacesRef.current = []
      }
      draggingVertexRef.current = null
      setDraggingVertex(null)
      return
    }

    if (draggingSpacesRef.current) {
      const moved = dragSpacesThresholdRef.current?.triggered === true
      // On ne commit l'historique que si le drag a vraiment eu lieu
      // (évite de spam l'historique pour un simple clic de sélection).
      if (moved && preDragSpacesRef.current.length > 0) {
        historyRef.current = [...historyRef.current.slice(-49), preDragSpacesRef.current]
        setCanUndo(true)
      }
      preDragSpacesRef.current = []
      draggingSpacesRef.current = null
      dragSpacesThresholdRef.current = null
      return
    }

    if (mode === 'rect' && dragStart) {
      const end = screenToWorld(e.clientX, e.clientY)
      const minX = Math.min(dragStart.x, end.x), maxX = Math.max(dragStart.x, end.x)
      const minY = Math.min(dragStart.y, end.y), maxY = Math.max(dragStart.y, end.y)
      if ((maxX - minX) > 0.5 && (maxY - minY) > 0.5) {
        createSpace([
          { x: minX, y: minY }, { x: maxX, y: minY },
          { x: maxX, y: maxY }, { x: minX, y: maxY },
        ])
      }
      setDragStart(null)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mode === 'select') {
      const world = screenToWorld(e.clientX, e.clientY)
      // Double-clic sur un vertex = suppression
      for (const s of visibleSpaces) {
        const vi = Geo.findClosestVertex(s.polygon, world, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) {
          updateSpace(s.id, { polygon: Geo.removeVertex(s.polygon, vi) })
          return
        }
      }
      // Double-clic sur un espace = ouvre éditeur métadata
      // Tolérance étendue pour les portes
      const dblTolM = 12 / viewport.scale
      for (const s of visibleSpaces) {
        if (pointHitsSpace(world, s, dblTolM)) {
          setEditingSpaceId(s.id)
          return
        }
      }
    }
    if (mode === 'poly' && draftPoints.length >= 3) {
      createSpace(draftPoints)
      setDraftPoints([])
    }
    if (mode === 'curve' && draftPoints.length >= 3) {
      const smoothed = Geo.catmullRomSmooth(draftPoints, 8, 0.5)
      createSpace(smoothed)
      setDraftPoints([])
    }
  }

  // ─── Operations ──────────────────────────────

  const createSpace = (poly: Geo.Polygon) => {
    const normalized = Geo.normalizePolygon(poly)
    if (normalized.length < 3) return
    const id = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const autoType = autoDetectSpaceType('Nouveau espace')
    const newSpace: EditableSpace = {
      id,
      name: `Nouveau espace ${spaces.length + 1}`,
      type: autoType,
      polygon: normalized,
      floorLevel: activeFloor,
      validated: false,
    }
    changeSpaces([...spaces, newSpace])
    setSelectedIds(new Set([id]))
    setEditingSpaceId(id)
    // Auto-switch en mode "select" pour éviter que le prochain clic sur le
    // même espace redessine un nouveau rectangle par-dessus.
    setMode('select')
    setDraftPoints([])
    setDragStart(null)
  }

  /** Variante : crée un espace avec un type et un nom imposés (templates, drag). */
  const createSpaceWithType = (poly: Geo.Polygon, typeKey: SpaceTypeKey, name: string) => {
    const normalized = Geo.normalizePolygon(poly)
    if (normalized.length < 3) return
    const id = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newSpace: EditableSpace = {
      id,
      name,
      type: typeKey,
      polygon: normalized,
      floorLevel: activeFloor,
      validated: false,
    }
    changeSpaces([...spaces, newSpace])
    setSelectedIds(new Set([id]))
    // Auto-switch en select après templates/portes/parking/flèches pour
    // que l'utilisateur puisse immédiatement éditer l'espace créé.
    setMode('select')
    setDraftPoints([])
    setDragStart(null)
  }

  /** Drop HTML5 : pose un meuble/item depuis FurnitureLibrary. */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const catalogId = e.dataTransfer.getData('text/catalog-id')
    if (!catalogId) return
    const dropClientX = e.clientX
    const dropClientY = e.clientY
    void import('../../scene-editor/store/furnitureCatalog').then(({ FURNITURE_CATALOG }) => {
      let item: { id: string; name: string; w: number; d: number } | null = null
      for (const [, cat] of Object.entries(FURNITURE_CATALOG)) {
        const found = cat.items.find(i => i.id === catalogId)
        if (found) { item = { id: found.id, name: found.name, w: found.w, d: found.d }; break }
      }
      if (!item) return
      const world = screenToWorld(dropClientX, dropClientY)
      const poly: Geo.Polygon = [
        { x: world.x - item.w / 2, y: world.y - item.d / 2 },
        { x: world.x + item.w / 2, y: world.y - item.d / 2 },
        { x: world.x + item.w / 2, y: world.y + item.d / 2 },
        { x: world.x - item.w / 2, y: world.y + item.d / 2 },
      ]
      createSpaceWithType(poly, 'autre', `🪑 ${item.name}`)
    }).catch(() => {})
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const updateSpace = (id: string, changes: Partial<EditableSpace>) => {
    changeSpaces(spaces.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  const duplicateSelected = () => {
    const toDuplicate = spacesRef.current.filter(s => selectedIdsRef.current.has(s.id))
    const copies: EditableSpace[] = toDuplicate.map(s => ({
      ...s,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${s.name} (copie)`,
      validated: false,
      polygon: Geo.duplicatePolygon(s.polygon, 2, 2),
    }))
    changeSpaces([...spacesRef.current, ...copies])
    setSelectedIds(new Set(copies.map(c => c.id)))
  }
  duplicateSelectedRef.current = duplicateSelected

  const mergeSelected = () => {
    const toMerge = spacesRef.current.filter(s => selectedIdsRef.current.has(s.id))
    if (toMerge.length < 2) return
    const merged = Geo.unionPolygons(toMerge.map(s => s.polygon), 20)
    if (merged.length === 0) return
    const main = toMerge[0]
    const newPoly = merged[0]
    const newSpace: EditableSpace = {
      ...main,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${main.name} (fusion)`,
      polygon: newPoly,
      validated: false,
    }
    const remaining = spacesRef.current.filter(s => !selectedIdsRef.current.has(s.id))
    changeSpaces([...remaining, newSpace])
    setSelectedIds(new Set([newSpace.id]))
  }
  mergeSelectedRef.current = mergeSelected

  /** Rotation 90° horaire. Utile pour les portes (orientation mur H↔V) mais
   *  fonctionne sur n'importe quel espace sélectionné. */
  const rotateSelected = (angleDeg: number) => {
    const selectedIds = selectedIdsRef.current
    if (selectedIds.size === 0) return
    changeSpaces(spacesRef.current.map(s =>
      selectedIds.has(s.id) ? { ...s, polygon: Geo.rotatePolygon(s.polygon, angleDeg) } : s,
    ))
  }
  rotateSelectedRef.current = rotateSelected

  /** Flip horizontal (inverse gauche↔droite du vantail porte). */
  const flipSelectedH = () => {
    const selectedIds = selectedIdsRef.current
    if (selectedIds.size === 0) return
    changeSpaces(spacesRef.current.map(s =>
      selectedIds.has(s.id) ? { ...s, polygon: Geo.flipPolygonH(s.polygon) } : s,
    ))
  }
  flipSelectedHRef.current = flipSelectedH
  /** Flip vertical (inverse intérieur↔extérieur du sens d'ouverture). */
  const flipSelectedV = () => {
    const selectedIds = selectedIdsRef.current
    if (selectedIds.size === 0) return
    changeSpaces(spacesRef.current.map(s =>
      selectedIds.has(s.id) ? { ...s, polygon: Geo.flipPolygonV(s.polygon) } : s,
    ))
  }
  flipSelectedVRef.current = flipSelectedV

  const splitSelected = () => {
    if (selectedIds.size !== 1) return
    // Active le mode split : le prochain trait dessiné coupera le polygone
    const id = Array.from(selectedIds)[0]
    const s = spaces.find(sp => sp.id === id)
    if (!s) return
    setSplitLine([{ x: 0, y: 0 }, { x: 0, y: 0 }])
    // On attend 2 clics pour définir la ligne de coupe
    const handler = (e: MouseEvent) => {
      const w1 = screenToWorld(e.clientX, e.clientY)
      const handler2 = (e2: MouseEvent) => {
        const w2 = screenToWorld(e2.clientX, e2.clientY)
        const split = Geo.splitPolygonByLine(s.polygon, w1, w2)
        setSplitLine(null)
        window.removeEventListener('click', handler2)
        if (split) {
          const [left, right] = split
          const newSpaces: EditableSpace[] = [
            { ...s, polygon: left, id: `sp-${Date.now()}-l`, name: `${s.name} (A)`, validated: false },
            { ...s, polygon: right, id: `sp-${Date.now()}-r`, name: `${s.name} (B)`, validated: false },
          ]
          changeSpaces([...spaces.filter(sp => sp.id !== s.id), ...newSpaces])
        }
      }
      window.addEventListener('click', handler2, { once: true })
      window.removeEventListener('click', handler)
    }
    window.addEventListener('click', handler, { once: true })
  }

  // ─── Rendu SVG ────────────────────────────────

  const cursor = isPanning ? 'grabbing'
    : spaceDown ? 'grab'
    : draggingSpacesRef.current ? 'grabbing'
    : mode === 'select'
      ? (draggingVertex ? 'grabbing' : hoveredVertex ? 'grab' : 'grab')
    : mode === 'wall' && dragStart ? 'crosshair'
    : 'crosshair'

  const screenPlanW = planBounds.width * viewport.scale
  const screenPlanH = planBounds.height * viewport.scale

  const gridLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  if (showGrid) {
    const gridMeters = 5
    for (let x = 0; x <= planBounds.width; x += gridMeters) {
      gridLines.push({
        x1: x * viewport.scale + viewport.offsetX, y1: viewport.offsetY,
        x2: x * viewport.scale + viewport.offsetX, y2: screenPlanH + viewport.offsetY,
      })
    }
    for (let y = 0; y <= planBounds.height; y += gridMeters) {
      gridLines.push({
        x1: viewport.offsetX, y1: y * viewport.scale + viewport.offsetY,
        x2: screenPlanW + viewport.offsetX, y2: y * viewport.scale + viewport.offsetY,
      })
    }
  }

  const editingSpace = editingSpaceId ? spaces.find(s => s.id === editingSpaceId) : null

  return (
    <div className="h-full w-full flex flex-col bg-surface-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-surface-1">
        {/* Mode selectors */}
        <div className="flex items-center gap-0.5 p-0.5 bg-surface-0 rounded">
          {([
            { m: 'select', icon: MousePointer, label: 'Sélection' },
            { m: 'poly',   icon: Hexagon,      label: 'Polygone (dble-clic ferme)' },
            { m: 'rect',   icon: Square,       label: 'Rectangle' },
            { m: 'curve',  icon: Spline,       label: 'Courbe (dble-clic ferme)' },
            { m: 'wall',   icon: MoveHorizontal,label: `Mur (${wallThicknessCm} cm)` },
          ] as Array<{ m: DrawMode; icon: any; label: string }>).map(o => (
            <button key={o.m}
              onClick={() => { setMode(o.m); setDraftPoints([]); setDragStart(null); setSplitLine(null) }}
              className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
                mode === o.m ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={o.label}
            >
              <o.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {mode === 'wall' && (
          <select
            value={wallThicknessCm}
            onChange={(e) => setWallThicknessCm(Number(e.target.value))}
            className="bg-surface-0 text-[10px] text-slate-300 rounded px-1.5 py-1 border border-white/10"
          >
            <option value={15}>15 cm</option>
            <option value={20}>20 cm</option>
            <option value={30}>30 cm</option>
          </select>
        )}

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* ─── Templates parking (clic = pose) ─── */}
        <div className="flex items-center gap-0.5 p-0.5 bg-surface-0 rounded" title="Places de parking (clic = pose un rectangle aux dimensions)">
          {([
            { m: 'parking-standard',  icon: Car,           title: 'Place standard 2.5×5 m',    color: '#60a5fa' },
            { m: 'parking-pmr',       icon: Accessibility, title: 'Place PMR 3.3×5 m',         color: '#3b82f6' },
            { m: 'parking-ve',        icon: Zap,           title: 'Borne VE 2.5×5 m',          color: '#22c55e' },
            { m: 'parking-moto',      icon: Bike,          title: 'Place moto 1×2 m',          color: '#7dd3fc' },
            { m: 'parking-livraison', icon: Package,       title: 'Livraison 3×7 m',           color: '#f59e0b' },
            { m: 'parking-famille',   icon: Users2,        title: 'Famille 3×5 m',             color: '#f472b6' },
          ] as Array<{ m: DrawMode; icon: any; title: string; color: string }>).map(o => (
            <button key={o.m}
              onClick={() => { setMode(o.m); setDraftPoints([]); setDragStart(null); setSplitLine(null) }}
              className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
                mode === o.m ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={o.title}
            >
              <o.icon className="w-3.5 h-3.5" style={{ color: mode === o.m ? undefined : o.color }} />
            </button>
          ))}
        </div>

        {/* ─── Flèche sens (2 clics) ─── */}
        <button
          onClick={() => { setMode('arrow-flow'); setDraftPoints([]); setDragStart(null); setSplitLine(null) }}
          className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
            mode === 'arrow-flow' ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
          title="Flèche de sens (2 clics : origine → pointe)"
        >
          <ArrowRight className="w-3.5 h-3.5" style={{ color: mode === 'arrow-flow' ? undefined : '#f59e0b' }} />
        </button>

        {/* ─── Annotations texte libres ─── */}
        <button
          onClick={() => { setMode('annotate'); setDraftPoints([]); setDragStart(null) }}
          className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
            mode === 'annotate' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
          title="Annoter (texte libre)"
        >
          <StickyNote className="w-3.5 h-3.5" style={{ color: mode === 'annotate' ? undefined : '#22d3ee' }} />
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* ─── Templates portes (clic = pose) ─── */}
        <div className="flex items-center gap-0.5 p-0.5 bg-surface-0 rounded" title="Portes & ouvertures (clic = pose rectangle)">
          {([
            { m: 'door-entree',      icon: DoorOpen,          title: 'Porte d\'entrée 1m × 20cm',       color: '#10b981' },
            { m: 'door-double',      icon: DoorOpen,          title: 'Porte double 1.8m × 20cm',        color: '#059669' },
            { m: 'door-automatique', icon: RectangleVertical, title: 'Porte automatique 1.5m × 20cm',   color: '#14b8a6' },
            { m: 'door-interieure',  icon: DoorClosed,        title: 'Porte intérieure 0.9m × 15cm',    color: '#64748b' },
            { m: 'door-secours',     icon: AlertOctagon,      title: 'Porte secours 1.2m × 20cm (anti-panique)', color: '#ef4444' },
            { m: 'door-service',     icon: DoorClosed,        title: 'Porte service 1m × 20cm',         color: '#0d9488' },
          ] as Array<{ m: DrawMode; icon: any; title: string; color: string }>).map(o => (
            <button key={o.m}
              onClick={() => { setMode(o.m); setDraftPoints([]); setDragStart(null); setSplitLine(null) }}
              className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
                mode === o.m ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={o.title}
            >
              <o.icon className="w-3.5 h-3.5" style={{ color: mode === o.m ? undefined : o.color }} />
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Opérations avancées */}
        <button
          onClick={mergeSelected}
          disabled={selectedIds.size < 2}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          title="Fusionner zones sélectionnées (M)"
        >
          <Merge className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={splitSelected}
          disabled={selectedIds.size !== 1}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          title="Découper (X) — 2 clics pour tracer la ligne de coupe"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={duplicateSelected}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          title="Dupliquer (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* ─── Rotation & flip (essentiel pour les portes) ─── */}
        <button
          onClick={() => rotateSelected(90)}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          title="Rotation 90° horaire — raccourci : R  (Shift+R = anti-horaire)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <kbd className="hidden md:inline text-[9px] font-mono px-1 py-px bg-slate-800 rounded border border-white/10 leading-none">R</kbd>
        </button>
        <button
          onClick={flipSelectedH}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          title="Miroir horizontal — inverse gauche/droite — raccourci : H"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <kbd className="hidden md:inline text-[9px] font-mono px-1 py-px bg-slate-800 rounded border border-white/10 leading-none">H</kbd>
        </button>
        <button
          onClick={flipSelectedV}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          title="Miroir vertical — inverse intérieur/extérieur — raccourci : V"
        >
          <FlipVertical className="w-3.5 h-3.5" />
          <kbd className="hidden md:inline text-[9px] font-mono px-1 py-px bg-slate-800 rounded border border-white/10 leading-none">V</kbd>
        </button>
        <button
          onClick={() => {
            if (selectedIds.size === 0) return
            changeSpaces(spaces.filter(s => !selectedIds.has(s.id)))
            setSelectedIds(new Set())
            setEditingSpaceId(null)
          }}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-30"
          title="Supprimer (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={undoChange}
          disabled={!canUndo}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          title="Annuler (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Options */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded ${showGrid ? 'text-atlas-400' : 'text-slate-500'}`}
          title="Afficher grille"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${snapEnabled ? 'bg-atlas-500 text-white' : 'text-slate-500'}`}
          title="Snap grille 50 cm"
        >
          SNAP
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Zoom / Fit */}
        <button
          onClick={() => zoomBy(1.25)}
          className="p-1.5 rounded text-slate-400 hover:text-white"
          title="Zoom + (molette)"
        >
          <span className="text-[12px] font-bold">+</span>
        </button>
        <button
          onClick={() => zoomBy(0.8)}
          className="p-1.5 rounded text-slate-400 hover:text-white"
          title="Zoom − (molette)"
        >
          <span className="text-[12px] font-bold">−</span>
        </button>
        <button
          onClick={fitToScreen}
          className="p-1.5 rounded text-slate-400 hover:text-white"
          title="Recadrer (F)"
        >
          <span className="text-[11px] font-bold">⤢</span>
        </button>
        <span className="text-[10px] text-slate-500 tabular-nums px-1">
          {Math.round(viewport.scale * 100) / 100}×
        </span>

        <button
          onClick={() => setShowShortcuts(v => !v)}
          className={`ml-1 w-7 h-7 rounded text-[12px] font-bold flex items-center justify-center border transition-colors ${
            showShortcuts
              ? 'bg-atlas-500 text-white border-atlas-500'
              : 'text-slate-400 hover:text-white border-white/10 hover:border-white/25'
          }`}
          title="Raccourcis clavier"
        >
          ?
        </button>

        <div className="flex-1" />

        {/* Niveau actif */}
        <select
          value={activeFloor}
          onChange={(e) => onFloorChange(e.target.value as FloorLevelKey)}
          className="bg-surface-0 text-[11px] text-slate-300 rounded px-2 py-1 border border-white/10"
        >
          {(Object.keys(FLOOR_LEVEL_META) as FloorLevelKey[])
            .sort((a, b) => FLOOR_LEVEL_META[a].order - FLOOR_LEVEL_META[b].order)
            .map(f => (
              <option key={f} value={f}>{FLOOR_LEVEL_META[f].label}</option>
            ))}
        </select>
        <button
          onClick={() => setShowOnlyActiveFloor(!showOnlyActiveFloor)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${showOnlyActiveFloor ? 'bg-atlas-500 text-white' : 'bg-slate-800 text-slate-400'}`}
          title="Filtrer sur niveau actif"
        >
          {showOnlyActiveFloor ? '◉ Niv actif' : '◎ Tous niv.'}
        </button>

        <span className="text-[10px] text-slate-500 tabular-nums">
          Zoom {(viewport.scale).toFixed(1)}× · {visibleSpaces.length} espace(s)
        </span>
      </div>

      {/* Canvas SVG */}
      <div className="flex-1 overflow-hidden relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor, background: '#2a2d33' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Background plan */}
          {backgroundUrl && (
            <image
              href={backgroundUrl}
              x={viewport.offsetX}
              y={viewport.offsetY}
              width={screenPlanW}
              height={screenPlanH}
              opacity={0.4}
              preserveAspectRatio="none"
            />
          )}

          {/* Grille */}
          {showGrid && gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#3a3d44" strokeWidth={0.5} />
          ))}

          {/* Contour plan */}
          <rect
            x={viewport.offsetX} y={viewport.offsetY}
            width={screenPlanW} height={screenPlanH}
            fill="none" stroke="#334155" strokeWidth={1} strokeDasharray="4 2"
          />

          {/* Espaces */}
          {visibleSpaces.map(s => {
            const meta = SPACE_TYPE_META[s.type]
            const isSelected = selectedIds.has(s.id)
            const screenPts = s.polygon.map(p => worldToScreen(p.x, p.y))
            const d = screenPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

            // Centroid pour le label
            let cx = 0, cy = 0
            for (const p of screenPts) { cx += p.x; cy += p.y }
            cx /= screenPts.length; cy /= screenPts.length

            const areaSqm = Geo.polyArea(s.polygon)
            const anomaly = checkSurfaceAnomaly(s.type, areaSqm)

            return (
              <g
                key={s.id}
                onMouseEnter={() => { setHoveredSpaceId(s.id); lastFocusedSpaceIdRef.current = s.id }}
                onMouseLeave={() => setHoveredSpaceId(null)}
              >
                {isDoorType(s.type) ? (
                  /* ── Porte = trait + jambages ── */
                  <>
                    {/* Zone de clic invisible ÉPAISSE (~16 px) pour que les portes soient cliquables à tout zoom */}
                    <path d={d} fill="transparent" stroke="transparent" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }} />
                    {/* Contour sélection */}
                    {isSelected && (
                      <path d={d} fill="none"
                        stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.35} />
                    )}
                    <DoorLineSymbol
                      screenPts={screenPts}
                      color={isSelected ? '#fff' : hoveredSpaceId === s.id ? '#ffffffcc' : meta.color}
                      strokeWidth={isSelected ? 3 : hoveredSpaceId === s.id ? 2.5 : 2}
                    />
                  </>
                ) : (
                  /* ── Espace normal = polygone rempli ── */
                  <path
                    d={d}
                    fill={meta.color}
                    fillOpacity={s.validated ? 0.25 : 0.15}
                    stroke={isSelected ? '#fff' : hoveredSpaceId === s.id ? '#ffffff' : meta.color}
                    strokeWidth={isSelected ? 2.5 : hoveredSpaceId === s.id ? 1.8 : 1.2}
                    strokeDasharray={s.validated ? 'none' : '4 2'}
                    strokeOpacity={hoveredSpaceId === s.id && !isSelected ? 0.7 : 1}
                  />
                )}
                {/* Vertices en mode select */}
                {mode === 'select' && isSelected && screenPts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y} r={5}
                    fill={hoveredVertex?.spaceId === s.id && hoveredVertex.idx === i ? '#fff' : meta.color}
                    stroke="#fff" strokeWidth={1.5}
                  />
                ))}
                {/* Edge insert indicator */}
                {mode === 'select' && isSelected && hoveredEdge?.spaceId === s.id && (
                  <circle
                    cx={worldToScreen(hoveredEdge.point.x, hoveredEdge.point.y).x}
                    cy={worldToScreen(hoveredEdge.point.x, hoveredEdge.point.y).y}
                    r={4} fill="#fff" opacity={0.6}
                  />
                )}

                {/* ── Badge icône — masqué pour les portes (trait seul suffit) ── */}
                {!isDoorType(s.type) && (
                  <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
                    <circle
                      r={13}
                      fill="rgba(15,23,42,0.88)"
                      stroke={isSelected ? '#ffffff' : meta.color}
                      strokeWidth={isSelected ? 1.5 : 1}
                      strokeOpacity={0.7}
                    />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={13} y={1}>
                      {meta.icon}
                    </text>
                    {s.validated && (
                      <circle cx={9} cy={-9} r={4} fill="#10b981" stroke="rgba(15,23,42,0.9)" strokeWidth={1} />
                    )}
                    {anomaly.aberrant && (
                      <>
                        <circle cx={9} cy={-9} r={5} fill="#f59e0b" stroke="rgba(15,23,42,0.9)" strokeWidth={1} />
                        <text x={9} y={-9} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#000" fontWeight="bold">!</text>
                      </>
                    )}
                  </g>
                )}

                {/* ── Tooltip au survol ── */}
                {hoveredSpaceId === s.id && (
                  (() => {
                    const displayName = s.name || '(sans nom)'
                    const isCommercial = meta.category === 'commerces-services'
                    const localTag = isCommercial && s.localNumber ? `#${s.localNumber}` : ''
                    const occupantTag = isCommercial
                      ? (s.vacant !== false ? '🔴 vacant' : `🟢 ${s.tenant || '—'}`)
                      : ''
                    const line1 = [displayName, localTag].filter(Boolean).join(' · ')
                    const line2 = `${meta.label} · ${areaSqm.toFixed(0)} m²${anomaly.aberrant ? ' ⚠' : ''}`
                    const extraLine = isCommercial
                    const lineCount = extraLine ? 4 : 3
                    const ttH = lineCount * 11 + 10
                    const ttW = Math.max(120, Math.max(line1.length, line2.length, occupantTag.length) * 5.2 + 24)
                    const yTop = -(ttH)
                    return (
                      <g transform={`translate(${cx}, ${cy - 20})`} style={{ pointerEvents: 'none' }}>
                        <rect
                          x={-ttW / 2} y={yTop}
                          width={ttW} height={ttH}
                          fill="rgba(10,14,26,0.97)"
                          stroke={meta.color}
                          strokeWidth={0.8}
                          strokeOpacity={0.55}
                          rx={5}
                        />
                        <text textAnchor="middle" fontSize={9} fontWeight="600" fill="#f1f5f9" y={yTop + 12}>
                          {line1.length > 34 ? line1.slice(0, 33) + '…' : line1}
                        </text>
                        <text textAnchor="middle" fontSize={7.5} fill={meta.color} y={yTop + 23}>
                          {line2}
                        </text>
                        {isCommercial && (
                          <text textAnchor="middle" fontSize={7.5}
                            fill={s.vacant !== false ? '#f87171' : '#34d399'}
                            y={yTop + 34}>
                            {occupantTag}
                          </text>
                        )}
                        <text textAnchor="middle" fontSize={6.5} fill="rgba(148,163,184,0.6)"
                          y={yTop + ttH - 4}>
                          {isCommercial ? '↖ clic · ✦ double-clic pour éditer' : '↖ clic · ✦ double-clic · Suppr'}
                        </text>
                      </g>
                    )
                  })()
                )}

                {/* ── Boutons d'action — sélection active, mode select ── */}
                {mode === 'select' && isSelected && (
                  <g transform={`translate(${cx}, ${cy + 26})`}>
                    <rect x={-52} y={0} width={104} height={22} fill="rgba(10,14,26,0.95)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} rx={4} />
                    {/* ✓ Valider */}
                    <g transform="translate(-38, 11)" style={{ cursor: 'pointer' }}
                       onClick={(e) => { e.stopPropagation(); updateSpace(s.id, { validated: !s.validated }) }}>
                      <title>{s.validated ? 'Annuler la validation' : 'Valider'}</title>
                      <circle r={9} fill={s.validated ? '#10b981' : '#475569'} />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#fff">✓</text>
                    </g>
                    {/* ⧉ Dupliquer */}
                    <g transform="translate(-14, 11)" style={{ cursor: 'pointer' }}
                       onClick={(e) => {
                         e.stopPropagation()
                         changeSpaces([...spaces, {
                           ...s,
                           id: `sp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                           name: `${s.name} (copie)`,
                           polygon: s.polygon.map(p => ({ x: p.x + 1, y: p.y + 1 })),
                           validated: false,
                         }])
                       }}>
                      <title>Dupliquer (Ctrl+D)</title>
                      <circle r={9} fill="#0ea5e9" />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#fff">⧉</text>
                    </g>
                    {/* ✏ Éditer (double-clic = raccourci) */}
                    <g transform="translate(14, 11)" style={{ cursor: 'pointer' }}
                       onClick={(e) => { e.stopPropagation(); setEditingSpaceId(s.id) }}>
                      <title>Éditer — ou double-clic sur l'espace</title>
                      <circle r={9} fill="#b38a5a" />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#fff">✏</text>
                    </g>
                    {/* × Supprimer */}
                    <g transform="translate(38, 11)" style={{ cursor: 'pointer' }}
                       onClick={(e) => {
                         e.stopPropagation()
                         changeSpaces(spaces.filter(x => x.id !== s.id))
                         setSelectedIds(new Set())
                         setEditingSpaceId(null)
                       }}>
                      <title>Supprimer (Del)</title>
                      <circle r={9} fill="#ef4444" />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={12} fill="#fff">×</text>
                    </g>
                  </g>
                )}
              </g>
            )
          })}

          {/* Draft poly/curve en cours */}
          {draftPoints.length > 0 && (
            <g>
              <polyline
                points={draftPoints.map(p => worldToScreen(p.x, p.y)).map(s => `${s.x},${s.y}`).join(' ')}
                fill="none" stroke="#c9a068" strokeWidth={1.5} strokeDasharray="4 2"
              />
              {draftPoints.map((p, i) => {
                const s = worldToScreen(p.x, p.y)
                return <circle key={i} cx={s.x} cy={s.y} r={3} fill="#c9a068" />
              })}
            </g>
          )}

          {/* Draft rectangle en cours */}
          {mode === 'rect' && dragStart && (
            <rect
              x={Math.min(worldToScreen(dragStart.x, 0).x,
                Math.min(...[0]))
              }
              y={0}
              width={10}
              height={10}
              fill="none" stroke="#c9a068" strokeWidth={1.5} strokeDasharray="4 2"
            />
          )}

          {/* Draft wall en cours */}
          {mode === 'wall' && dragStart && (
            <circle
              cx={worldToScreen(dragStart.x, dragStart.y).x}
              cy={worldToScreen(dragStart.x, dragStart.y).y}
              r={5} fill="#c9a068"
            />
          )}

          {/* Split line preview */}
          {splitLine && (
            <line
              x1={worldToScreen(splitLine[0].x, splitLine[0].y).x}
              y1={worldToScreen(splitLine[0].x, splitLine[0].y).y}
              x2={worldToScreen(splitLine[1].x, splitLine[1].y).x}
              y2={worldToScreen(splitLine[1].x, splitLine[1].y).y}
              stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3"
            />
          )}

          {/* Preview template parking sous le curseur */}
          {mode.startsWith('parking-') && cursorWorld && (() => {
            const tpl = PARKING_TEMPLATES[mode as keyof typeof PARKING_TEMPLATES]
            if (!tpl) return null
            const p1 = worldToScreen(cursorWorld.x - tpl.w / 2, cursorWorld.y - tpl.h / 2)
            const p2 = worldToScreen(cursorWorld.x + tpl.w / 2, cursorWorld.y + tpl.h / 2)
            return (
              <rect
                x={p1.x} y={p1.y}
                width={p2.x - p1.x} height={p2.y - p1.y}
                fill={`${tpl.color}55`}
                stroke={tpl.color}
                strokeWidth={2}
                strokeDasharray="4 2"
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          {/* Preview porte sous le curseur */}
          {mode.startsWith('door-') && cursorWorld && (() => {
            const tpl = DOOR_TEMPLATES[mode as keyof typeof DOOR_TEMPLATES]
            if (!tpl) return null
            const p1 = worldToScreen(cursorWorld.x - tpl.w / 2, cursorWorld.y - tpl.h / 2)
            const p2 = worldToScreen(cursorWorld.x + tpl.w / 2, cursorWorld.y + tpl.h / 2)
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={p1.x} y={p1.y}
                  width={p2.x - p1.x} height={p2.y - p1.y}
                  fill={`${tpl.color}70`}
                  stroke={tpl.color}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                {/* Arc de battement (indication de la porte qui s'ouvre) */}
                <path
                  d={`M ${p1.x} ${p2.y} A ${p2.x - p1.x} ${p2.x - p1.x} 0 0 1 ${p2.x} ${p2.y + (p2.x - p1.x)}`}
                  fill="none"
                  stroke={tpl.color}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
              </g>
            )
          })()}

          {/* Preview flèche sens en cours */}
          {mode === 'arrow-flow' && dragStart && cursorWorld && (() => {
            const p1 = worldToScreen(dragStart.x, dragStart.y)
            const p2 = worldToScreen(cursorWorld.x, cursorWorld.y)
            return (
              <line
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 3"
                markerEnd="url(#arrow-preview-head)"
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          <defs>
            <marker id="arrow-preview-head" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
          </defs>
        </svg>

        {/* ─── Annotation type selector (annotate mode) ─── */}
        {mode === 'annotate' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-[#2a2d33]/95 backdrop-blur border border-white/15 rounded-xl px-3 py-2 shadow-xl z-20">
            {(['note', 'title', 'promo', 'works', 'info'] as AnnotationType[]).map((t) => (
              <button
                key={t}
                onClick={() => setAnnotateType(t)}
                className={[
                  'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all',
                  annotateType === t
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'border-white/10 text-white/40 hover:text-white/60',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* ─── Annotations overlay ─── */}
        <AnnotationsLayer
          floorId={`floor-${activeFloor}`}
          worldToScreen={worldToScreen}
          screenToWorld={annScreenToWorld}
          addMode={mode === 'annotate'}
          defaultType={annotateType}
          onAddDone={() => { /* stay in annotate mode for multiple placements */ }}
        />

        {/* Aide flottante en mode select */}
        {mode === 'select' && selectedIds.size === 0 && spaces.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-surface-1/95 border border-white/10 text-[10px] text-slate-300 shadow-xl pointer-events-none">
            💡 Clic = sélect · Clic+glisser = déplacer · Sommet = déformer · Double-clic = éditer · <kbd className="bg-slate-800 px-1 rounded border border-white/10">?</kbd> raccourcis
          </div>
        )}

        {/* ═══ Panneau Raccourcis clavier ═══ */}
        {showShortcuts && (
          <div className="absolute top-4 right-4 w-[340px] max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-surface-1/95 backdrop-blur border border-white/15 shadow-2xl text-[11px] text-slate-300 z-30">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface-1/95 backdrop-blur">
              <div>
                <div className="text-[13px] font-semibold text-white">Raccourcis clavier</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Cliquez dans le canvas d'abord, pas dans un champ texte</div>
              </div>
              <button onClick={() => setShowShortcuts(false)}
                className="p-1 text-slate-400 hover:text-white text-[14px] leading-none">✕</button>
            </div>

            <div className="p-4 space-y-5">
              {[
                {
                  title: 'Outils de dessin',
                  items: [
                    { k: ['Esc'],          desc: 'Sortir du mode en cours / annuler l\'outil' },
                    { k: ['Double-clic'],  desc: 'En mode Polygone/Courbe : fermer la forme' },
                    { k: ['Molette'],      desc: 'Zoom centré curseur' },
                    { k: ['Clic + glisser'], desc: 'Déplacer le plan (pan)' },
                    { k: ['F'],            desc: 'Recadrer tout le plan' },
                  ],
                },
                {
                  title: 'Sélection & édition',
                  items: [
                    { k: ['Clic'],                desc: 'Sélectionner un espace' },
                    { k: ['Clic', '+', 'Glisser'], desc: 'Déplacer l\'espace (ou toute la sélection multi)' },
                    { k: ['Shift', '+', 'Clic'],  desc: 'Ajouter à la sélection' },
                    { k: ['Double-clic'],         desc: 'Éditer métadonnées (dimensions, type…)' },
                    { k: ['Delete'],              desc: 'Supprimer la sélection' },
                    { k: ['Ctrl', '+', 'Z'],      desc: 'Annuler (undo)' },
                    { k: ['Ctrl', '+', 'D'],      desc: 'Dupliquer la sélection' },
                  ],
                },
                {
                  title: 'Portes & géométrie (sur sélection)',
                  items: [
                    { k: ['R'],                desc: 'Rotation 90° horaire', hi: true },
                    { k: ['Shift', '+', 'R'],  desc: 'Rotation 90° anti-horaire', hi: true },
                    { k: ['H'],                desc: 'Miroir horizontal (inverse gauche / droite)', hi: true },
                    { k: ['V'],                desc: 'Miroir vertical (inverse intérieur / extérieur)', hi: true },
                    { k: ['M'],                desc: 'Fusionner 2+ espaces sélectionnés' },
                    { k: ['X'],                desc: 'Découper — tracer la ligne de coupe' },
                  ],
                },
                {
                  title: 'Astuces',
                  items: [
                    { k: ['SNAP'],  desc: 'Alignement 50 cm activable/désactivable' },
                    { k: ['Grille'], desc: 'Affiche le quadrillage 5 m' },
                  ],
                },
              ].map(group => (
                <div key={group.title}>
                  <div className="text-[9px] uppercase tracking-widest font-semibold text-atlas-400 mb-2">{group.title}</div>
                  <div className="space-y-1.5">
                    {group.items.map((item, i) => (
                      <div key={i} className={`flex items-center justify-between gap-3 ${item.hi ? 'bg-atlas-500/[0.06] px-2 -mx-2 py-1 rounded' : ''}`}>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {item.k.map((k, j) => (
                            k === '+' ? (
                              <span key={j} className="text-slate-600 text-[10px] mx-0.5">+</span>
                            ) : (
                              <kbd key={j} className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[10px] font-mono text-slate-200 min-w-[22px] text-center">{k}</kbd>
                            )
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-400 text-right leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 px-4 py-2 border-t border-white/10 bg-surface-1/95 backdrop-blur text-[10px] text-slate-500">
              Astuce : <kbd className="bg-slate-800 px-1 rounded border border-white/10">?</kbd> pour ouvrir/fermer ce panneau
            </div>
          </div>
        )}
        {mode === 'select' && spaces.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-surface-1/95 border border-white/10 text-[10px] text-slate-300 shadow-xl pointer-events-none">
            💡 Glisser pour déplacer le plan · Molette = zoom · F = recadrer · Passer en mode Rect/Polygone pour dessiner
          </div>
        )}
        {mode === 'select' && selectedIds.size > 0 && !editingSpace && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-indigo-900/80 border border-atlas-500/40 text-[10px] text-atlas-200 shadow-xl pointer-events-none flex items-center gap-3">
            <span><strong>{selectedIds.size}</strong> espace{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
            <span className="text-slate-400">·</span>
            <span>✏ bouton bleu = infos · ✓ vert = valider · ⧉ = dupliquer · × = supprimer · <kbd className="bg-slate-800 px-1 rounded">Delete</kbd> = effacer</span>
          </div>
        )}

        {/* Panel édition espace */}
        {editingSpace && (
          <SpaceMetadataPanel
            space={editingSpace}
            onSave={(changes) => {
              updateSpace(editingSpace.id, changes)
              setEditingSpaceId(null)
            }}
            onClose={() => setEditingSpaceId(null)}
            onDelete={() => {
              changeSpaces(spaces.filter(s => s.id !== editingSpace.id))
              setSelectedIds(new Set())
              setEditingSpaceId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Panel metadata ───────────────────────────────

function SpaceMetadataPanel({
  space, onSave, onClose, onDelete,
}: {
  space: EditableSpace
  onSave: (changes: Partial<EditableSpace>) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(space.name)
  const [type, setTypeLocal] = useState<SpaceTypeKey>(space.type)
  const [floorLevel, setFloorLevelLocal] = useState<FloorLevelKey>(space.floorLevel)
  const [notes, setNotes] = useState(space.notes ?? '')
  const [validated, setValidatedLocal] = useState(space.validated)
  // ── Champs commerciaux ──
  const [localNumber, setLocalNumber]   = useState(space.localNumber ?? '')
  const [tenant, setTenant]             = useState(space.tenant ?? '')
  const [vacant, setVacantLocal]             = useState(space.vacant !== false) // default true
  const [unitId, setUnitId]             = useState(space.unitId ?? '')
  const [hasMezzanine, setHasMezzanineLocal] = useState(space.hasMezzanine ?? false)
  const [mezzanineSqm, setMezzanineSqm] = useState(space.mezzanineSqm ?? 0)
  const [showMultiNiveau, setShowMultiNiveau] = useState(!!(space.unitId || space.hasMezzanine))

  // ─── Auto-save helpers : chaque changement discret persiste immédiatement ───
  const setType = (k: SpaceTypeKey) => { setTypeLocal(k); onSave({ type: k }) }
  const setFloorLevel = (f: FloorLevelKey) => { setFloorLevelLocal(f); onSave({ floorLevel: f }) }
  const setValidated = (v: boolean) => { setValidatedLocal(v); onSave({ validated: v }) }
  const setVacant = (v: boolean) => {
    setVacantLocal(v)
    const patch: Partial<EditableSpace> = { vacant: v }
    if (v) { setTenant(''); patch.tenant = undefined }
    onSave(patch)
  }
  const setHasMezzanine = (m: boolean) => {
    setHasMezzanineLocal(m)
    onSave({ hasMezzanine: m || undefined, mezzanineSqm: m ? mezzanineSqm : undefined })
  }

  const areaSqm = Geo.polyArea(space.polygon)
  const anomaly = checkSurfaceAnomaly(type, areaSqm)
  const isCommercial = SPACE_TYPE_META[type]?.category === 'commerces-services'
  const showMultiNiveauSection = showMultiNiveau
    || type === 'big_box' || type === 'grande_surface' || type === 'loisirs'

  return (
    <div className="absolute right-4 top-4 w-[340px] bg-surface-1 border border-white/10 rounded-lg shadow-2xl flex flex-col max-h-[calc(100%-2rem)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-white">Éditer espace</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      {/* min-h-0 critique : permet au flex-1 de shrink et au overflow-y-auto de fonctionner */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {/* Nom — auto-save au blur */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Nom précis <span className="text-emerald-400 normal-case tracking-normal font-normal">· sauvé auto à la validation</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== space.name) onSave({ name })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
            }}
            placeholder="ex: Entrée principale Nord, Local A12 Restauration"
            className="w-full px-2 py-1.5 rounded bg-surface-0 border border-white/10 text-sm text-white focus:border-atlas-500 outline-none"
            autoFocus
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Type sémantique
          </label>
          <div className="space-y-2 max-h-52 overflow-y-auto bg-surface-0 rounded border border-white/5 p-2">
            {(Object.keys(SPACE_TYPES_BY_CATEGORY) as SpaceTypeCategory[]).map(cat => {
              const catMeta = SPACE_CATEGORY_META[cat]
              return (
                <div key={cat}>
                  <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: catMeta.color }}>
                    {catMeta.icon} {catMeta.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SPACE_TYPES_BY_CATEGORY[cat].map(k => {
                      const meta = SPACE_TYPE_META[k]
                      return (
                        <button
                          key={k}
                          onClick={() => setType(k)}
                          className={`text-left px-2 py-1 rounded text-[10px] border ${
                            type === k
                              ? 'border-white bg-white/10 text-white'
                              : 'border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span className="mr-1" style={{ color: meta.color }}>{meta.icon}</span>
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-1">{SPACE_TYPE_META[type].description}</p>
        </div>

        {/* ── Dimensions porte — visible uniquement pour les portes / ouvertures ── */}
        {isDoorType(type) && (
          <DoorDimensionsPanel space={space} onSave={onSave} />
        )}

        {/* ── Section commerciale — visible uniquement pour les locaux commerciaux ── */}
        {isCommercial && (
          <div className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden">
            {/* En-tête segment avec couleur */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10"
                 style={{ background: `${SPACE_TYPE_META[type].color}18` }}>
              <span className="text-base leading-none">{SPACE_TYPE_META[type].icon}</span>
              <div className="flex-1">
                <div className="text-[10px] font-bold" style={{ color: SPACE_TYPE_META[type].color }}>
                  Local commercial · {SPACE_TYPE_META[type].label}
                </div>
              </div>
              {/* Badge occupé / vacant */}
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                vacant
                  ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                  : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
              }`}>
                {vacant ? '🔴 VACANT' : '🟢 OCCUPÉ'}
              </span>
            </div>

            <div className="p-3 space-y-3">
              {/* Numéro de local */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Numéro de local
                </label>
                <input
                  value={localNumber}
                  onChange={(e) => setLocalNumber(e.target.value)}
                  onBlur={() => {
                    const next = localNumber.trim() || undefined
                    if (next !== space.localNumber) onSave({ localNumber: next })
                  }}
                  placeholder="ex: A-012, RDC-24, B2-007"
                  className="w-full px-2 py-1.5 rounded bg-surface-1 border border-white/10 text-sm text-white font-mono focus:border-atlas-500 outline-none"
                />
              </div>

              {/* Toggle vacant / occupé */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !vacant
                      setVacant(next)
                      if (next) setTenant('') // effacer l'occupant si on repasse en vacant
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      vacant ? 'bg-red-700' : 'bg-emerald-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      vacant ? 'left-0.5' : 'left-[18px]'
                    }`} />
                  </button>
                  <span className="text-[11px] text-slate-300">
                    {vacant ? 'Vacant (disponible)' : 'Occupé'}
                  </span>
                </label>
              </div>

              {/* Occupant — visible seulement si pas vacant */}
              {!vacant && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Occupant / Enseigne
                  </label>
                  <input
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    onBlur={() => {
                      const next = tenant.trim() || undefined
                      if (next !== space.tenant) onSave({ tenant: next })
                    }}
                    placeholder="ex: H&M, McDonald's, Pharmacie Centrale…"
                    className="w-full px-2 py-1.5 rounded bg-surface-1 border border-white/10 text-sm text-white focus:border-atlas-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Niveau */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Niveau
          </label>
          <select
            value={floorLevel}
            onChange={(e) => setFloorLevel(e.target.value as FloorLevelKey)}
            className="w-full px-2 py-1.5 rounded bg-surface-0 border border-white/10 text-sm text-white"
          >
            {(Object.keys(FLOOR_LEVEL_META) as FloorLevelKey[])
              .sort((a, b) => FLOOR_LEVEL_META[a].order - FLOOR_LEVEL_META[b].order)
              .map(f => (
                <option key={f} value={f}>{FLOOR_LEVEL_META[f].label}</option>
              ))}
          </select>
        </div>

        {/* Surface */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="px-2 py-1.5 rounded bg-surface-0 border border-white/5">
            <div className="text-[9px] text-slate-600 uppercase">Surface</div>
            <div className="text-white font-bold tabular-nums">{areaSqm.toFixed(1)} m²</div>
          </div>
          <div className="px-2 py-1.5 rounded bg-surface-0 border border-white/5">
            <div className="text-[9px] text-slate-600 uppercase">Vertex</div>
            <div className="text-white font-bold tabular-nums">{space.polygon.length}</div>
          </div>
        </div>

        {/* Anomalie */}
        {anomaly.aberrant && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-950/40 border border-amber-900/50 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
            {anomaly.reason}
          </div>
        )}

        {/* ── Multi-niveau & mezzanine (Big Box, locaux sur plusieurs niveaux) ── */}
        {showMultiNiveauSection && (
          <div className="rounded-lg border border-indigo-900/40 bg-surface-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5 bg-indigo-950/20">
              <div className="text-[10px] font-bold text-atlas-300">🏢 Multi-niveau / Mezzanine</div>
            </div>
            <div className="p-3 space-y-3">
              {/* ID d'unité (lien entre niveaux) */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  ID d'unité (relie plusieurs niveaux)
                </label>
                <input
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  onBlur={() => {
                    const next = unitId.trim() || undefined
                    if (next !== space.unitId) onSave({ unitId: next })
                  }}
                  placeholder="ex: BIGBOX-CARREFOUR, IKEA-NORD"
                  className="w-full px-2 py-1.5 rounded bg-surface-1 border border-white/10 text-sm text-white font-mono focus:border-atlas-500 outline-none"
                />
                <p className="text-[9px] text-slate-600 mt-1">
                  Les espaces avec le même ID sont considérés comme un seul tenant multi-niveaux.
                </p>
              </div>
              {/* Mezzanine */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasMezzanine}
                  onChange={(e) => setHasMezzanine(e.target.checked)}
                  className="accent-atlas-500"
                />
                <span className="text-[11px] text-slate-300">Ce local possède une mezzanine</span>
              </label>
              {hasMezzanine && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Surface mezzanine (m²)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mezzanineSqm || ''}
                    onChange={(e) => setMezzanineSqm(Number(e.target.value))}
                    onBlur={() => {
                      const next = mezzanineSqm > 0 ? mezzanineSqm : undefined
                      if (next !== space.mezzanineSqm) onSave({ mezzanineSqm: next })
                    }}
                    placeholder="ex: 45"
                    className="w-full px-2 py-1.5 rounded bg-surface-1 border border-white/10 text-sm text-white tabular-nums focus:border-atlas-500 outline-none"
                  />
                  {mezzanineSqm > 0 && (
                    <p className="text-[10px] text-atlas-300 mt-1">
                      Surface totale avec mezzanine : <strong>{(areaSqm + mezzanineSqm).toFixed(0)} m²</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Bouton d'activation multi-niveau si section pas encore ouverte */}
        {!showMultiNiveauSection && (
          <button
            onClick={() => setShowMultiNiveau(true)}
            className="w-full text-left text-[10px] text-slate-600 hover:text-atlas-400 py-1 flex items-center gap-1.5 transition-colors"
          >
            <span className="opacity-60">+</span> Ajouter info multi-niveau / mezzanine
          </button>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Notes
          </label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              const next = notes.trim() || undefined
              if (next !== space.notes) onSave({ notes: next })
            }}
            rows={2}
            placeholder="Informations complémentaires…"
            className="w-full px-2 py-1.5 rounded bg-surface-0 border border-white/10 text-xs text-white resize-none"
          />
        </div>

        {/* Validated */}
        <label className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer bg-surface-0 border border-white/5">
          <input
            type="checkbox"
            checked={validated}
            onChange={(e) => setValidated(e.target.checked)}
            className="accent-emerald-500"
          />
          <span className="text-[11px] text-slate-300">
            <Check className="w-3 h-3 inline mr-1" />
            Valider pour PROPH3T
          </span>
        </label>
      </div>

      {/* Actions — sticky en bas */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/10 bg-surface-0/40">
        <button onClick={onDelete}
          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Sauvegardé auto
          </span>
          <button
            onClick={() => {
              // Flush : commit tout changement text non encore blurré avant de fermer
              onSave({
                name, type, floorLevel, notes: notes.trim() || undefined, validated,
                ...(isCommercial ? {
                  localNumber: localNumber.trim() || undefined,
                  tenant: (!vacant && tenant.trim()) ? tenant.trim() : undefined,
                  vacant,
                } : {}),
                unitId: unitId.trim() || undefined,
                hasMezzanine: hasMezzanine || undefined,
                mezzanineSqm: (hasMezzanine && mezzanineSqm > 0) ? mezzanineSqm : undefined,
              })
              onClose()
            }}
            className="px-4 py-1.5 rounded text-[11px] font-semibold bg-gradient-to-r from-atlas-500 to-blue-600 text-white hover:opacity-90"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel dimensions porte ───────────────────────────────

function DoorDimensionsPanel({
  space,
  onSave,
}: {
  space: EditableSpace
  onSave: (changes: Partial<EditableSpace>) => void
}) {
  const dims = Geo.rectDimensions(space.polygon)
  const [widthCm, setWidthCm] = useState(Math.round(dims.long * 100))
  const [thickCm, setThickCm] = useState(Math.round(dims.short * 100))

  useEffect(() => {
    const d = Geo.rectDimensions(space.polygon)
    setWidthCm(Math.round(d.long * 100))
    setThickCm(Math.round(d.short * 100))
  }, [space.polygon])

  const applyResize = (newW: number, newT: number) => {
    const newPoly = Geo.resizeRectPolygon(space.polygon, newW / 100, newT / 100)
    onSave({ polygon: newPoly })
  }

  const WIDTH_PRESETS: Array<{ w: number; label: string }> = [
    { w: 70,  label: '70' },
    { w: 80,  label: '80' },
    { w: 90,  label: '90' },
    { w: 100, label: '1m' },
    { w: 120, label: '1,2m' },
    { w: 150, label: '1,5m' },
    { w: 180, label: '1,8m (double)' },
    { w: 240, label: '2,4m (SAS)' },
  ]

  return (
    <div className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2"
        style={{ background: 'rgba(16,185,129,0.12)' }}>
        <span className="text-base leading-none">🚪</span>
        <div className="flex-1">
          <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Dimensions porte</div>
          <div className="text-[10px] text-slate-500">Passage utile × épaisseur (tableau)</div>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {Math.round(dims.angleRad * 180 / Math.PI)}°
        </span>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Largeur (passage)</label>
            <span className="text-[11px] text-emerald-300 font-mono tabular-nums">{widthCm} cm</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input type="range" min={50} max={400} step={5} value={widthCm}
              onChange={(e) => { const w = Number(e.target.value); setWidthCm(w); applyResize(w, thickCm) }}
              className="flex-1 accent-emerald-500" />
            <input type="number" min={30} max={600} value={widthCm}
              onChange={(e) => { const w = Math.max(30, Math.min(600, Number(e.target.value) || 0)); setWidthCm(w); applyResize(w, thickCm) }}
              className="w-16 px-2 py-1 rounded bg-surface-1 border border-white/10 text-[11px] text-white font-mono text-right" />
          </div>
          <div className="flex flex-wrap gap-1">
            {WIDTH_PRESETS.map(p => (
              <button key={p.w}
                onClick={() => { setWidthCm(p.w); applyResize(p.w, thickCm) }}
                className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                  widthCm === p.w
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'text-slate-500 border-white/10 hover:text-white hover:border-white/20'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Épaisseur (tableau mur)</label>
            <span className="text-[11px] text-emerald-300 font-mono tabular-nums">{thickCm} cm</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={60} step={1} value={thickCm}
              onChange={(e) => { const t = Number(e.target.value); setThickCm(t); applyResize(widthCm, t) }}
              className="flex-1 accent-emerald-500" />
            <input type="number" min={5} max={100} value={thickCm}
              onChange={(e) => { const t = Math.max(5, Math.min(100, Number(e.target.value) || 0)); setThickCm(t); applyResize(widthCm, t) }}
              className="w-16 px-2 py-1 rounded bg-surface-1 border border-white/10 text-[11px] text-white font-mono text-right" />
          </div>
        </div>

        <div className="text-[9px] text-slate-600 leading-relaxed pt-1 border-t border-white/5">
          💡 L'orientation est conservée. <kbd className="bg-slate-800 px-1 rounded border border-white/10">R</kbd> pivote,
          <kbd className="bg-slate-800 px-1 rounded border border-white/10 ml-1">H</kbd>/<kbd className="bg-slate-800 px-1 rounded border border-white/10">V</kbd> inverse le sens,
          clic+glisser dans le canvas pour déplacer.
        </div>
      </div>
    </div>
  )
}
