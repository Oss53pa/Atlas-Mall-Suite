// ═══ PLAN 3D VIEW — Standalone Three.js 3D renderer for architectural plans ═══
// Takes parsed plan data (wall segments, spaces, bounds) and renders
// a fully volumetric 3D scene with walls, floor slabs, and zones.

import React, { useEffect, useRef, useState } from 'react'

interface WallSeg { x1: number; y1: number; x2: number; y2: number; layer: string; floorId?: string }
interface Space3D {
  id: string
  label: string
  type: string
  bounds: { minX: number; minY: number; width: number; height: number; maxX?: number; maxY?: number; centerX?: number; centerY?: number }
  areaSqm: number
  color: string | null
  floorId?: string
}
interface DetectedFloor3D {
  id: string
  label: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  entityCount: number
  stackOrder: number
}

interface Dim3D {
  id: string
  p1: [number, number]
  p2: [number, number]
  textPos: [number, number]
  valueM: number
  text: string
  floorId?: string
}

// ── Vol.2 Sécuritaire 3D entities ──
export interface Camera3D {
  id: string
  floorId: string
  label: string
  /** Position in metres (normalized plan coords) */
  x: number
  y: number
  /** Horizontal heading in degrees (0 = +X) */
  angle: number
  /** Field-of-view angle in degrees */
  fov: number
  /** FOV depth in metres */
  rangeM: number
  color: string
  priority?: 'normale' | 'haute' | 'critique'
}

export interface Door3D {
  id: string
  floorId: string
  label: string
  x: number
  y: number
  isExit?: boolean
  hasBadge?: boolean
}

export interface BlindSpot3D {
  id: string
  floorId: string
  x: number
  y: number
  w: number
  h: number
  severity?: 'normal' | 'elevee' | 'critique'
}

// ── Vol.3 Parcours Client 3D entities ──
export interface POI3D {
  id: string
  floorId: string
  label: string
  x: number
  y: number
  /** icon key: food, shop, info, wc, atm, etc. */
  icon?: string
  color: string
}

export interface Signage3D {
  id: string
  floorId: string
  ref: string
  x: number
  y: number
  type: 'directionnel' | 'identifiant' | 'info' | 'reglementaire'
  content?: string
}

export interface Moment3D {
  id: string
  floorId: string
  number: number
  name: string
  x: number
  y: number
}

export interface JourneyPath3D {
  id: string
  floorId: string
  points: Array<{ x: number; y: number }>
  color?: string
}

interface Plan3DViewProps {
  wallSegments: WallSeg[]
  spaces: Space3D[]
  planBounds: { width: number; height: number }
  mode: '3d' | '3d-advanced'
  detectedFloors?: DetectedFloor3D[]
  dimensions?: Dim3D[]
  activeFloorId?: string | 'all'
  onSpaceClick?: (space: Space3D) => void
  /** Vol.2 Securitaire — cameras with FOV cones */
  cameras?: Camera3D[]
  /** Vol.2 Securitaire — doors and exits */
  doors?: Door3D[]
  /** Vol.2 Securitaire — blind spots */
  blindSpots?: BlindSpot3D[]
  /** Show FOV cones for cameras */
  showFov?: boolean
  /** Vol.3 Parcours Client — points of interest */
  pois?: POI3D[]
  /** Vol.3 — signage items */
  signage?: Signage3D[]
  /** Vol.3 — journey key moments */
  moments?: Moment3D[]
  /** Vol.3 — journey paths between moments/pois */
  journeys?: JourneyPath3D[]
  className?: string
}

const ZONE_COLORS: Record<string, string> = {
  commerce: '#3b82f6',
  restauration: '#f59e0b',
  parking: '#64748b',
  technique: '#ef4444',
  services: '#14b8a6',
  circulation: '#94a3b8',
  loisirs: '#06b6d4',
  backoffice: '#8b5cf6',
  sortie_secours: '#22c55e',
  hotel: '#a855f7',
  financier: '#dc2626',
  exterieur: '#84cc16',
}

export function Plan3DView({
  wallSegments, spaces, planBounds, mode,
  detectedFloors = [], dimensions = [], activeFloorId = 'all',
  onSpaceClick,
  cameras = [], doors = [], blindSpots = [], showFov: showFovProp,
  pois = [], signage = [], moments = [], journeys = [],
  className = '',
}: Plan3DViewProps) {
  const [selectedSpace, setSelectedSpace] = useState<Space3D | null>(null)
  const [hoveredSpace, setHoveredSpace] = useState<Space3D | null>(null)
  const [showCameras, setShowCameras] = useState(true)
  const [showFov, setShowFov] = useState(showFovProp ?? true)
  const [showDoors, setShowDoors] = useState(true)
  const [showBlindSpots, setShowBlindSpots] = useState(true)
  const [showPois, setShowPois] = useState(true)
  const [showSignage, setShowSignage] = useState(true)
  const [showMoments, setShowMoments] = useState(true)
  const [showJourneys, setShowJourneys] = useState(true)
  const [shadowsEnabled, setShadowsEnabled] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const fitViewRef = useRef<(() => void) | null>(null)
  const exportRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('Initialisation...')
  const [currentFloor, setCurrentFloor] = useState<string | 'all'>(activeFloorId)
  const [showDimensions, setShowDimensions] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [floorOpacity, setFloorOpacity] = useState<Record<string, number>>({})
  const [hiddenFloors, setHiddenFloors] = useState<Set<string>>(new Set())
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)

  // Discover unique layer names from wall segments
  const allLayers = React.useMemo(() => {
    const set = new Set<string>()
    for (const w of wallSegments) set.add(w.layer)
    return Array.from(set).sort()
  }, [wallSegments])

  // Filter walls/spaces by selected floor + hidden floors + hidden layers
  const filteredWalls = React.useMemo(() => {
    let ws = wallSegments
    if (hiddenLayers.size > 0) ws = ws.filter(w => !hiddenLayers.has(w.layer))
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      ws = ws.filter(w => !w.floorId || !hiddenFloors.has(w.floorId))
    } else if (currentFloor !== 'all' && detectedFloors.length > 0) {
      ws = ws.filter(w => !w.floorId || w.floorId === currentFloor)
    }
    return ws
  }, [wallSegments, currentFloor, detectedFloors.length, hiddenFloors, hiddenLayers])

  const filteredSpaces = React.useMemo(() => {
    let sp = spaces
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      sp = sp.filter(s => !s.floorId || !hiddenFloors.has(s.floorId))
    } else if (currentFloor !== 'all' && detectedFloors.length > 0) {
      sp = sp.filter(s => !s.floorId || s.floorId === currentFloor)
    }
    return sp
  }, [spaces, currentFloor, detectedFloors.length, hiddenFloors])

  const filteredDims = React.useMemo(() => {
    if (!showDimensions) return []
    if (currentFloor === 'all' || !detectedFloors.length) return dimensions
    return dimensions.filter(d => !d.floorId || d.floorId === currentFloor)
  }, [dimensions, currentFloor, detectedFloors.length, showDimensions])

  const filteredCameras = React.useMemo(() => {
    if (!showCameras) return []
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      return cameras.filter(c => !hiddenFloors.has(c.floorId))
    }
    if (currentFloor !== 'all' && detectedFloors.length > 0) {
      return cameras.filter(c => c.floorId === currentFloor)
    }
    return cameras
  }, [cameras, currentFloor, detectedFloors.length, showCameras, hiddenFloors])

  const filteredDoors = React.useMemo(() => {
    if (!showDoors) return []
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      return doors.filter(d => !hiddenFloors.has(d.floorId))
    }
    if (currentFloor !== 'all' && detectedFloors.length > 0) {
      return doors.filter(d => d.floorId === currentFloor)
    }
    return doors
  }, [doors, currentFloor, detectedFloors.length, showDoors, hiddenFloors])

  const filteredBlindSpots = React.useMemo(() => {
    if (!showBlindSpots) return []
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      return blindSpots.filter(b => !hiddenFloors.has(b.floorId))
    }
    if (currentFloor !== 'all' && detectedFloors.length > 0) {
      return blindSpots.filter(b => b.floorId === currentFloor)
    }
    return blindSpots
  }, [blindSpots, currentFloor, detectedFloors.length, showBlindSpots, hiddenFloors])

  const filterByFloor = <T extends { floorId: string }>(list: T[], enabled: boolean): T[] => {
    if (!enabled) return []
    if (currentFloor === 'all' && detectedFloors.length > 0) {
      return list.filter(x => !hiddenFloors.has(x.floorId))
    }
    if (currentFloor !== 'all' && detectedFloors.length > 0) {
      return list.filter(x => x.floorId === currentFloor)
    }
    return list
  }
  const filteredPois = React.useMemo(() => filterByFloor(pois, showPois),
    [pois, showPois, currentFloor, detectedFloors.length, hiddenFloors])
  const filteredSignage = React.useMemo(() => filterByFloor(signage, showSignage),
    [signage, showSignage, currentFloor, detectedFloors.length, hiddenFloors])
  const filteredMoments = React.useMemo(() => filterByFloor(moments, showMoments),
    [moments, showMoments, currentFloor, detectedFloors.length, hiddenFloors])
  const filteredJourneys = React.useMemo(() => filterByFloor(journeys, showJourneys),
    [journeys, showJourneys, currentFloor, detectedFloors.length, hiddenFloors])

  // Per-floor bounds (for better framing when a single floor is selected)
  const effectiveBounds = React.useMemo(() => {
    if (currentFloor === 'all' || !detectedFloors.length) return planBounds
    const f = detectedFloors.find(f => f.id === currentFloor)
    if (!f) return planBounds
    return { width: f.bounds.width, height: f.bounds.height, offsetX: f.bounds.minX, offsetY: f.bounds.minY }
  }, [currentFloor, detectedFloors, planBounds])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    const cleanupFns: Array<() => void> = []

    const init = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

        if (disposed) return

        // ── Size ──
        const w = container.clientWidth || 800
        const h = container.clientHeight || 600

        // ── Plan dimensions & stacking parameters ──
        const isMultiFloorMode = currentFloor === 'all' && detectedFloors.length > 1
        const offsetX = (effectiveBounds as { offsetX?: number }).offsetX ?? 0
        const offsetY = (effectiveBounds as { offsetY?: number }).offsetY ?? 0

        // When showing all floors stacked, recenter each floor and use average single-floor size
        let pw: number, ph: number, cx: number, cy: number
        if (isMultiFloorMode) {
          // Use the largest floor's dimensions as reference
          const maxFloor = detectedFloors.reduce((a, b) => a.bounds.width * a.bounds.height > b.bounds.width * b.bounds.height ? a : b)
          pw = maxFloor.bounds.width
          ph = maxFloor.bounds.height
          cx = pw / 2
          cy = ph / 2
        } else {
          pw = effectiveBounds.width || 100
          ph = effectiveBounds.height || 100
          cx = offsetX + pw / 2
          cy = offsetY + ph / 2
        }
        const diag = Math.sqrt(pw * pw + ph * ph)
        const wallHeight = diag * 0.015 // Wall height ~1.5% of diagonal
        const wallThick = Math.max(pw, ph) * 0.003
        // Stack spacing: wall height + small gap
        const FLOOR_SPACING = wallHeight * 1.5

        // Per-floor coordinate transform: recenter floor and lift to stack position
        const floorTransform = (floorId?: string): { dx: number; dy: number; dz: number; opacity: number } => {
          if (!isMultiFloorMode || !floorId) return { dx: 0, dy: 0, dz: 0, opacity: 1 }
          const f = detectedFloors.find(f => f.id === floorId)
          if (!f) return { dx: 0, dy: 0, dz: 0, opacity: 1 }
          // Translate floor so its center matches (cx, cy)
          const fCx = (f.bounds.minX + f.bounds.maxX) / 2
          const fCy = (f.bounds.minY + f.bounds.maxY) / 2
          return {
            dx: cx - fCx,
            dy: cy - fCy,
            dz: f.stackOrder * FLOOR_SPACING,
            opacity: floorOpacity[floorId] ?? 1,
          }
        }

        setStatus(`Rendu 3D: ${pw.toFixed(0)}×${ph.toFixed(0)}m, ${wallSegments.length} murs, ${spaces.length} zones`)

        // ── Renderer ──
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x0a0a14, 1)
        renderer.shadowMap.enabled = shadowsEnabled
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.1
        container.appendChild(renderer.domElement)
        cleanupFns.push(() => {
          if (renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement)
          }
          renderer.dispose()
        })

        // ── Scene ──
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0a14)

        // ── Camera ──
        // Camera with generous near/far range to avoid clipping at any zoom level
        const camera = new THREE.PerspectiveCamera(50, w / h, diag * 0.0005, diag * 50)
        if (mode === '3d-advanced') {
          // Isometric angle
          const d = diag * 0.7
          camera.position.set(cx + d, cy - d, d * 0.9)
        } else {
          // Perspective tilted
          camera.position.set(cx, cy - ph * 0.8, diag * 0.5)
        }
        camera.up.set(0, 0, 1) // Z-up (architectural convention)
        camera.lookAt(cx, cy, 0)

        // ── Lighting (with shadows) ──
        const ambient = new THREE.AmbientLight(0xffffff, 0.55)
        scene.add(ambient)

        // Main sunlight — casts shadows
        const dir1 = new THREE.DirectionalLight(0xfff5e0, 1.1)
        dir1.position.set(cx + pw * 0.6, cy - ph * 0.7, diag * 0.9)
        dir1.castShadow = shadowsEnabled
        if (shadowsEnabled) {
          dir1.shadow.mapSize.width = 2048
          dir1.shadow.mapSize.height = 2048
          dir1.shadow.camera.left = -pw * 0.8
          dir1.shadow.camera.right = pw * 0.8
          dir1.shadow.camera.top = ph * 0.8
          dir1.shadow.camera.bottom = -ph * 0.8
          dir1.shadow.camera.near = 0.1
          dir1.shadow.camera.far = diag * 3
          dir1.shadow.bias = -0.0005
          dir1.shadow.normalBias = 0.02
        }
        dir1.target.position.set(cx, cy, 0)
        scene.add(dir1)
        scene.add(dir1.target)

        // Fill light (cool, no shadows)
        const dir2 = new THREE.DirectionalLight(0xaabbdd, 0.35)
        dir2.position.set(cx - pw * 0.5, cy + ph * 0.8, diag * 0.5)
        scene.add(dir2)

        // Sky / ground hemisphere
        const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x202030, 0.35)
        scene.add(hemi)

        // ── Ground plane ──
        const groundGeo = new THREE.PlaneGeometry(pw * 1.4, ph * 1.4)
        const groundMat = new THREE.MeshStandardMaterial({
          color: 0x151a2a, roughness: 0.85, metalness: 0.0,
        })
        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.position.set(cx, cy, -0.2)
        ground.receiveShadow = shadowsEnabled
        scene.add(ground)

        // ── Plan base (slab showing the plan outline) ──
        const slabGeo = new THREE.BoxGeometry(pw, ph, 0.1)
        const slabMat = new THREE.MeshStandardMaterial({
          color: 0x2a3550, roughness: 0.75, metalness: 0.05,
        })
        const slab = new THREE.Mesh(slabGeo, slabMat)
        slab.position.set(cx, cy, -0.05)
        slab.receiveShadow = shadowsEnabled
        scene.add(slab)

        // ── Grid helper ──
        const gridSize = Math.max(pw, ph) * 1.4
        const divisions = 40
        const grid = new THREE.GridHelper(gridSize, divisions, 0x333344, 0x1a1a28)
        grid.rotation.x = Math.PI / 2
        grid.position.set(cx, cy, -0.15)
        scene.add(grid)

        // ── Zone floor slabs + floating labels ──
        // Helper: create a text sprite from a label
        const makeTextSprite = (label: string, surface: number, colorHex: string) => {
          const canvas = document.createElement('canvas')
          canvas.width = 512
          canvas.height = 160
          const ctx = canvas.getContext('2d')
          if (!ctx) return null

          // Rounded background
          ctx.fillStyle = 'rgba(10, 14, 26, 0.92)'
          const r = 20
          ctx.beginPath()
          ctx.moveTo(r, 0)
          ctx.lineTo(canvas.width - r, 0)
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r)
          ctx.lineTo(canvas.width, canvas.height - r)
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height)
          ctx.lineTo(r, canvas.height)
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r)
          ctx.lineTo(0, r)
          ctx.quadraticCurveTo(0, 0, r, 0)
          ctx.closePath()
          ctx.fill()

          // Left colored bar (zone color)
          ctx.fillStyle = colorHex
          ctx.fillRect(0, 0, 12, canvas.height)

          // Label text
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 52px system-ui, sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          const maxLabelLen = 22
          const displayLabel = label.length > maxLabelLen ? label.slice(0, maxLabelLen - 1) + '…' : label
          ctx.fillText(displayLabel, 28, 55)

          // Surface text
          ctx.fillStyle = '#9ca3af'
          ctx.font = '500 36px system-ui, sans-serif'
          ctx.fillText(`${surface.toFixed(0)} m²`, 28, 115)

          const texture = new THREE.CanvasTexture(canvas)
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
          const sprite = new THREE.Sprite(material)
          // Scale sprite: width ≈ 6% of plan width (readable but not overpowering)
          const sw = pw * 0.06
          const sh = sw * (canvas.height / canvas.width)
          sprite.scale.set(sw, sh, 1)
          sprite.renderOrder = 999 // Always on top
          return sprite
        }

        let slabCount = 0
        let labelCount = 0
        for (const sp of filteredSpaces) {
          const sw = sp.bounds.width
          const sh = sp.bounds.height
          if (!sw || !sh || sw < 0.5 || sh < 0.5) continue

          const colorHex = sp.color || ZONE_COLORS[sp.type] || '#3b82f6'
          const color = new THREE.Color(colorHex)
          const t = floorTransform(sp.floorId)

          const zoneGeo = new THREE.BoxGeometry(sw, sh, 0.15)
          const zoneMat = new THREE.MeshLambertMaterial({
            color,
            transparent: true,
            opacity: 0.5 * t.opacity,
          })
          const zone = new THREE.Mesh(zoneGeo, zoneMat)
          const zx = sp.bounds.minX + sw / 2 + t.dx
          const zy = sp.bounds.minY + sh / 2 + t.dy
          zone.position.set(zx, zy, 0.08 + t.dz)
          zone.userData = { spaceId: sp.id, spaceLabel: sp.label, floorId: sp.floorId }
          scene.add(zone)
          slabCount++

          if (showLabels && sp.label && sp.label !== `Zone ${slabCount}` && sw * sh > pw * ph * 0.0003) {
            const sprite = makeTextSprite(sp.label, sp.areaSqm, colorHex)
            if (sprite) {
              sprite.position.set(zx, zy, wallHeight + pw * 0.015 + t.dz)
              if (t.opacity < 1 && sprite.material) {
                (sprite.material as THREE.SpriteMaterial).opacity = t.opacity
              }
              scene.add(sprite)
              labelCount++
            }
          }
        }
        console.log(`[Plan3D] ${labelCount} labels flottants rendus`)

        // ── Vol.2: Blind spots (filter out mock/default entities) ──
        let blindCount = 0
        const planArea = pw * ph
        for (const bs of filteredBlindSpots) {
          // Skip invalid/mock default blind spots (too big, out of plan, or zero-sized)
          if (!bs.w || !bs.h || bs.w < 0.5 || bs.h < 0.5) continue
          if (bs.w * bs.h > planArea * 0.2) continue // Skip if > 20% of plan (not a real spot)
          if (bs.x < -pw * 0.1 || bs.x > pw * 1.1) continue
          if (bs.y < -ph * 0.1 || bs.y > ph * 1.1) continue

          const t = floorTransform(bs.floorId)
          const color = bs.severity === 'critique' ? 0xef4444
            : bs.severity === 'elevee' ? 0xf59e0b
            : 0xfb923c
          const geo = new THREE.BoxGeometry(bs.w, bs.h, 0.05)
          const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 * t.opacity })
          const mesh = new THREE.Mesh(geo, mat)
          mesh.position.set(bs.x + bs.w / 2 + t.dx, bs.y + bs.h / 2 + t.dy, 0.12 + t.dz)
          scene.add(mesh)
          blindCount++
        }

        // ── Vol.2: Doors (filter invalid positions) ──
        let doorCount = 0
        for (const d of filteredDoors) {
          // Skip if position is outside plan bounds (mock data / misaligned)
          if (d.x < -pw * 0.1 || d.x > pw * 1.1) continue
          if (d.y < -ph * 0.1 || d.y > ph * 1.1) continue
          const t = floorTransform(d.floorId)
          const color = d.isExit ? 0x22c55e : d.hasBadge ? 0x3b82f6 : 0x94a3b8
          const size = Math.max(pw, ph) * 0.008
          const geo = new THREE.BoxGeometry(size * 1.5, size * 0.5, size)
          const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 * t.opacity })
          const mesh = new THREE.Mesh(geo, mat)
          mesh.position.set(d.x + t.dx, d.y + t.dy, size / 2 + t.dz)
          scene.add(mesh)

          // Small door label
          if (d.label) {
            const canvas = document.createElement('canvas')
            canvas.width = 128
            canvas.height = 48
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = d.isExit ? 'rgba(34,197,94,0.9)' : 'rgba(59,130,246,0.9)'
              ctx.beginPath()
              ctx.roundRect(0, 0, canvas.width, canvas.height, 8)
              ctx.fill()
              ctx.fillStyle = '#fff'
              ctx.font = 'bold 28px system-ui'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(d.isExit ? 'SORTIE' : 'PORTE', canvas.width / 2, canvas.height / 2)
              const tex = new THREE.CanvasTexture(canvas)
              tex.minFilter = THREE.LinearFilter
              const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
              const sprite = new THREE.Sprite(spriteMat)
              const sw = pw * 0.02
              sprite.scale.set(sw, sw * (canvas.height / canvas.width), 1)
              sprite.position.set(d.x + t.dx, d.y + t.dy, size + pw * 0.01 + t.dz)
              sprite.renderOrder = 500
              scene.add(sprite)
            }
          }
          doorCount++
        }

        // ── Vol.2: Cameras (filter invalid positions) ──
        let camCount = 0
        for (const cam of filteredCameras) {
          if (cam.x < -pw * 0.1 || cam.x > pw * 1.1) continue
          if (cam.y < -ph * 0.1 || cam.y > ph * 1.1) continue
          const t = floorTransform(cam.floorId)
          const camZ = wallHeight * 0.85 + t.dz // Mount cameras near top of walls
          const cx2 = cam.x + t.dx
          const cy2 = cam.y + t.dy

          // Camera body (small dome/cone)
          const priorityColor = cam.priority === 'critique' ? 0xef4444
            : cam.priority === 'haute' ? 0xf97316
            : 0x3b82f6
          const bodySize = Math.max(pw, ph) * 0.006
          const bodyGeo = new THREE.ConeGeometry(bodySize, bodySize * 1.5, 6)
          const bodyMat = new THREE.MeshLambertMaterial({
            color: priorityColor,
            transparent: true,
            opacity: 0.95 * t.opacity,
          })
          const body = new THREE.Mesh(bodyGeo, bodyMat)
          body.rotation.x = Math.PI // Point down
          body.position.set(cx2, cy2, camZ)
          scene.add(body)

          // Mount bracket (small vertical line to ceiling)
          const mountGeo = new THREE.CylinderGeometry(bodySize * 0.2, bodySize * 0.2, wallHeight - camZ + t.dz + 0.1, 4)
          const mountMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
          const mount = new THREE.Mesh(mountGeo, mountMat)
          mount.rotation.x = Math.PI / 2
          mount.position.set(cx2, cy2, (wallHeight + camZ) / 2)
          scene.add(mount)

          // FOV cone (only if enabled)
          if (showFov) {
            const fovRad = (cam.fov * Math.PI) / 180
            const range = cam.rangeM || 10
            // Build a truncated cone (wedge) from camera position
            const segments = 12
            const coneGeo = new THREE.BufferGeometry()
            const vertices: number[] = []
            const indices: number[] = []

            // Apex
            vertices.push(0, 0, 0)
            // Arc at range
            for (let i = 0; i <= segments; i++) {
              const a = -fovRad / 2 + (fovRad * i) / segments
              vertices.push(Math.cos(a) * range, Math.sin(a) * range, 0)
            }
            // Triangles from apex to arc
            for (let i = 1; i <= segments; i++) {
              indices.push(0, i, i + 1)
            }
            coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
            coneGeo.setIndex(indices)
            coneGeo.computeVertexNormals()

            const coneMat = new THREE.MeshBasicMaterial({
              color: priorityColor,
              transparent: true,
              opacity: 0.18 * t.opacity,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
            const cone = new THREE.Mesh(coneGeo, coneMat)
            cone.rotation.z = (cam.angle * Math.PI) / 180
            cone.position.set(cx2, cy2, camZ - bodySize)
            scene.add(cone)

            // FOV outline
            const outlinePoints: number[] = []
            outlinePoints.push(0, 0, 0)
            for (let i = 0; i <= segments; i++) {
              const a = -fovRad / 2 + (fovRad * i) / segments
              outlinePoints.push(Math.cos(a) * range, Math.sin(a) * range, 0)
            }
            outlinePoints.push(0, 0, 0)
            const outlineGeo = new THREE.BufferGeometry()
            outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(outlinePoints, 3))
            const outlineMat = new THREE.LineBasicMaterial({
              color: priorityColor,
              transparent: true,
              opacity: 0.6 * t.opacity,
            })
            const outline = new THREE.Line(outlineGeo, outlineMat)
            outline.rotation.z = (cam.angle * Math.PI) / 180
            outline.position.set(cx2, cy2, camZ - bodySize)
            scene.add(outline)
          }
          camCount++
        }

        console.log(`[Plan3D] Vol2 entities: ${camCount} cameras, ${doorCount} doors, ${blindCount} blind spots`)

        // ── Vol.3 Parcours: POIs (filter invalid positions) ──
        let poiCount = 0
        for (const poi of filteredPois) {
          if (poi.x < -pw * 0.1 || poi.x > pw * 1.1) continue
          if (poi.y < -ph * 0.1 || poi.y > ph * 1.1) continue
          const t = floorTransform(poi.floorId)
          const size = Math.max(pw, ph) * 0.005
          // Inverted cone (pin) + sphere on top
          const pinGeo = new THREE.ConeGeometry(size, size * 2, 8)
          const pinMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(poi.color || '#10b981'),
            transparent: true,
            opacity: 0.95 * t.opacity,
          })
          const pin = new THREE.Mesh(pinGeo, pinMat)
          pin.rotation.x = Math.PI // Point down
          pin.position.set(poi.x + t.dx, poi.y + t.dy, size + t.dz)
          scene.add(pin)

          const ballGeo = new THREE.SphereGeometry(size * 0.8, 10, 10)
          const ball = new THREE.Mesh(ballGeo, pinMat)
          ball.position.set(poi.x + t.dx, poi.y + t.dy, size * 2.3 + t.dz)
          scene.add(ball)

          // POI label sprite
          if (poi.label) {
            const canvas = document.createElement('canvas')
            canvas.width = 200
            canvas.height = 56
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = 'rgba(10,14,26,0.85)'
              ctx.beginPath()
              ctx.roundRect(0, 0, canvas.width, canvas.height, 8)
              ctx.fill()
              ctx.strokeStyle = poi.color || '#10b981'
              ctx.lineWidth = 2
              ctx.stroke()
              ctx.fillStyle = '#fff'
              ctx.font = 'bold 30px system-ui'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(poi.label.slice(0, 18), canvas.width / 2, canvas.height / 2)
              const tex = new THREE.CanvasTexture(canvas)
              const sprMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
              const spr = new THREE.Sprite(sprMat)
              const ss = pw * 0.025
              spr.scale.set(ss, ss * (canvas.height / canvas.width), 1)
              spr.position.set(poi.x + t.dx, poi.y + t.dy, size * 3.5 + pw * 0.005 + t.dz)
              spr.renderOrder = 800
              scene.add(spr)
            }
          }
          poiCount++
        }

        // ── Vol.3 Parcours: Signage (flat panels) ──
        let sigCount = 0
        const sigTypeColors: Record<string, string> = {
          directionnel: '#f59e0b',
          identifiant: '#3b82f6',
          info: '#06b6d4',
          reglementaire: '#ef4444',
        }
        for (const sig of filteredSignage) {
          if (sig.x < -pw * 0.1 || sig.x > pw * 1.1) continue
          if (sig.y < -ph * 0.1 || sig.y > ph * 1.1) continue
          const t = floorTransform(sig.floorId)
          const size = Math.max(pw, ph) * 0.006
          const colorHex = sigTypeColors[sig.type] || '#8b5cf6'
          const geo = new THREE.BoxGeometry(size * 2, size * 0.2, size * 1.2)
          const mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(colorHex),
            transparent: true,
            opacity: 0.9 * t.opacity,
          })
          const panel = new THREE.Mesh(geo, mat)
          panel.position.set(sig.x + t.dx, sig.y + t.dy, wallHeight * 0.7 + t.dz)
          scene.add(panel)

          // Post
          const postGeo = new THREE.CylinderGeometry(size * 0.05, size * 0.05, wallHeight * 0.7, 4)
          const postMat = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: t.opacity })
          const post = new THREE.Mesh(postGeo, postMat)
          post.rotation.x = Math.PI / 2
          post.position.set(sig.x + t.dx, sig.y + t.dy, wallHeight * 0.35 + t.dz)
          scene.add(post)
          sigCount++
        }

        // ── Vol.3 Parcours: Moments (numbered badges on pedestals) ──
        let momentCount = 0
        for (const m of filteredMoments) {
          if (m.x < -pw * 0.1 || m.x > pw * 1.1) continue
          if (m.y < -ph * 0.1 || m.y > ph * 1.1) continue
          const t = floorTransform(m.floorId)
          const size = Math.max(pw, ph) * 0.008
          // Pedestal
          const pedestalGeo = new THREE.CylinderGeometry(size, size * 0.8, size * 0.3, 12)
          const pedestalMat = new THREE.MeshLambertMaterial({
            color: 0x065f46,
            transparent: true,
            opacity: 0.95 * t.opacity,
          })
          const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat)
          pedestal.rotation.x = Math.PI / 2
          pedestal.position.set(m.x + t.dx, m.y + t.dy, size * 0.15 + t.dz)
          scene.add(pedestal)

          // Number sprite above
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#059669'
            ctx.beginPath()
            ctx.arc(canvas.width / 2, canvas.height / 2, 56, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#34d399'
            ctx.lineWidth = 4
            ctx.stroke()
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 72px system-ui'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(m.number), canvas.width / 2, canvas.height / 2)
            const tex = new THREE.CanvasTexture(canvas)
            const sprMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
            const spr = new THREE.Sprite(sprMat)
            const ss = pw * 0.02
            spr.scale.set(ss, ss, 1)
            spr.position.set(m.x + t.dx, m.y + t.dy, size * 2 + t.dz)
            spr.renderOrder = 900
            scene.add(spr)
          }
          momentCount++
        }

        // ── Vol.3 Parcours: Journey paths (glowing lines) ──
        let journeyCount = 0
        for (const j of filteredJourneys) {
          if (j.points.length < 2) continue
          const t = floorTransform(j.floorId)
          const pts: THREE.Vector3[] = j.points.map(p => new THREE.Vector3(
            p.x + t.dx,
            p.y + t.dy,
            wallHeight * 0.05 + t.dz,
          ))
          const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.4)
          const tubeGeo = new THREE.TubeGeometry(curve, Math.max(16, pts.length * 4), Math.max(pw, ph) * 0.001, 6, false)
          const tubeMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(j.color || '#34d399'),
            transparent: true,
            opacity: 0.7 * t.opacity,
          })
          const tube = new THREE.Mesh(tubeGeo, tubeMat)
          scene.add(tube)
          journeyCount++
        }

        if (poiCount || sigCount || momentCount || journeyCount) {
          console.log(`[Plan3D] Vol3 entities: ${poiCount} POIs, ${sigCount} signage, ${momentCount} moments, ${journeyCount} journeys`)
        }

        // ── Walls (use InstancedMesh for performance with many walls) ──
        // Colors by layer type
        const wallColorByLayer = (layer: string): number => {
          const l = layer.toLowerCase()
          if (/mur|wall|struct|beton|facade|maconn/.test(l)) return 0xd4dae8 // structural = light
          if (/clois|partition/.test(l)) return 0xaab4cc // partitions = medium
          if (/porte|door|fenetre|window/.test(l)) return 0x88a8cc // openings = blue-tint
          if (/escalier|stair|ascens/.test(l)) return 0xb8a088 // stairs = warm
          return 0xa0a8b8 // default
        }

        // Group walls by color AND floor for instanced rendering with stacking
        type WallInstance = { x: number; y: number; z: number; len: number; angle: number; opacity: number }
        const wallsByGroup = new Map<string, { color: number; walls: WallInstance[] }>()
        for (const seg of filteredWalls) {
          const dx = seg.x2 - seg.x1
          const dy = seg.y2 - seg.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len < 0.05) continue

          const color = wallColorByLayer(seg.layer)
          const t = floorTransform(seg.floorId)
          const key = `${color}:${t.dz.toFixed(2)}:${t.opacity}`
          if (!wallsByGroup.has(key)) wallsByGroup.set(key, { color, walls: [] })
          wallsByGroup.get(key)!.walls.push({
            x: (seg.x1 + seg.x2) / 2 + t.dx,
            y: (seg.y1 + seg.y2) / 2 + t.dy,
            z: wallHeight / 2 + t.dz,
            len,
            angle: Math.atan2(dy, dx),
            opacity: t.opacity,
          })
        }

        let wallCount = 0
        for (const { color, walls } of wallsByGroup.values()) {
          const op = walls[0]?.opacity ?? 1
          const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.7,
            metalness: 0.05,
            transparent: op < 1,
            opacity: op,
          })
          const baseGeo = new THREE.BoxGeometry(1, 1, 1)
          const instancedMesh = new THREE.InstancedMesh(baseGeo, mat, walls.length)
          instancedMesh.castShadow = shadowsEnabled && op >= 1
          instancedMesh.receiveShadow = shadowsEnabled

          const dummy = new THREE.Object3D()
          for (let i = 0; i < walls.length; i++) {
            const w = walls[i]
            dummy.position.set(w.x, w.y, w.z)
            dummy.rotation.set(0, 0, w.angle)
            dummy.scale.set(w.len, wallThick, wallHeight)
            dummy.updateMatrix()
            instancedMesh.setMatrixAt(i, dummy.matrix)
          }
          instancedMesh.instanceMatrix.needsUpdate = true
          scene.add(instancedMesh)
          wallCount += walls.length
        }

        // ── If no walls, add boundary walls so user sees SOMETHING volumetric ──
        if (wallCount === 0) {
          const boundaryMat = new THREE.MeshLambertMaterial({ color: 0x6080a0, transparent: true, opacity: 0.6 })
          const boundaryWalls = [
            { x1: 0, y1: 0, x2: pw, y2: 0 },
            { x1: pw, y1: 0, x2: pw, y2: ph },
            { x1: pw, y1: ph, x2: 0, y2: ph },
            { x1: 0, y1: ph, x2: 0, y2: 0 },
          ]
          for (const seg of boundaryWalls) {
            const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1
            const len = Math.sqrt(dx * dx + dy * dy)
            const geo = new THREE.BoxGeometry(len, wallThick * 2, wallHeight)
            const m = new THREE.Mesh(geo, boundaryMat)
            m.position.set((seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, wallHeight / 2)
            m.rotation.z = Math.atan2(dy, dx)
            scene.add(m)
          }
          wallCount = 4
        }

        // ── Dimensions (cotations) — rendered ABOVE walls, discreet + on their own plane ──
        let dimCount = 0
        if (filteredDims.length > 0) {
          // Place dimensions well above walls so they don't overlap geometry
          const dimZ = wallHeight * 1.4
          const dimColor = 0xfbbf24 // amber (more discreet than red)
          const dimMat = new THREE.LineBasicMaterial({
            color: dimColor,
            transparent: true,
            opacity: 0.5,
          })

          // Collect all line points into a single geometry for performance (1 draw call)
          const linePoints: number[] = []

          const makeDimLabel = (text: string) => {
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (!ctx) return null
            // Subtle rounded background
            ctx.fillStyle = 'rgba(10, 14, 26, 0.75)'
            const r = 8
            ctx.beginPath()
            ctx.roundRect(0, 0, canvas.width, canvas.height, r)
            ctx.fill()
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
            ctx.lineWidth = 1.5
            ctx.stroke()
            // Amber text
            ctx.fillStyle = '#fbbf24'
            ctx.font = '500 36px monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, canvas.width / 2, canvas.height / 2)
            const texture = new THREE.CanvasTexture(canvas)
            texture.minFilter = THREE.LinearFilter
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85, depthTest: false })
            const sprite = new THREE.Sprite(mat)
            const sw = pw * 0.025 // Smaller labels (was 0.035)
            sprite.scale.set(sw, sw * (canvas.height / canvas.width), 1)
            sprite.renderOrder = 1001
            return sprite
          }

          for (const dim of filteredDims) {
            const t = floorTransform(dim.floorId)
            const [ox1, oy1] = dim.p1
            const [ox2, oy2] = dim.p2
            const [otx, oty] = dim.textPos
            const x1 = ox1 + t.dx, y1 = oy1 + t.dy
            const x2 = ox2 + t.dx, y2 = oy2 + t.dy
            const tx = (otx || (ox1 + ox2) / 2) + t.dx
            const ty = (oty || (oy1 + oy2) / 2) + t.dy
            const z = dimZ + t.dz
            if (dim.valueM < 0.1 || dim.valueM > Math.max(pw, ph) * 1.5) continue

            linePoints.push(x1, y1, z, x2, y2, z)

            const dx = x2 - x1, dy = y2 - y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len > 0.01) {
              const nx = -dy / len, ny = dx / len
              const tick = pw * 0.0025
              linePoints.push(x1 - nx * tick, y1 - ny * tick, z, x1 + nx * tick, y1 + ny * tick, z)
              linePoints.push(x2 - nx * tick, y2 - ny * tick, z, x2 + nx * tick, y2 + ny * tick, z)
            }

            const sprite = makeDimLabel(dim.text)
            if (sprite) {
              sprite.position.set(tx, ty, z + pw * 0.003)
              scene.add(sprite)
            }
            dimCount++
            if (dimCount > 500) break
          }

          // Single LineSegments for all dimension lines (massive perf boost)
          if (linePoints.length > 0) {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3))
            const allLines = new THREE.LineSegments(geo, dimMat)
            allLines.renderOrder = 1000
            scene.add(allLines)
          }
        }

        console.log(`[Plan3D] Built scene: ${slabCount} zones, ${wallCount} walls, ${labelCount} labels, ${dimCount} dims, ${pw.toFixed(0)}×${ph.toFixed(0)}m`)
        setStatus(`${wallCount} murs · ${slabCount} zones · ${labelCount} labels · ${dimCount} cotes`)

        // ── Raycaster for zone selection ──
        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        // Collect all zone meshes (those with userData.spaceId)
        const zoneMeshes: THREE.Mesh[] = []
        scene.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh && obj.userData?.spaceId) {
            zoneMeshes.push(obj as THREE.Mesh)
          }
        })

        // Hover highlight
        let hoveredMesh: THREE.Mesh | null = null
        const highlightMat = new THREE.MeshLambertMaterial({
          color: 0xfbbf24, transparent: true, opacity: 0.75,
        })
        const selectedOutlineMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.9, wireframe: true,
        })
        let selectedOutline: THREE.Mesh | null = null

        const onMove = (event: MouseEvent) => {
          if (!container) return
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hits = raycaster.intersectObjects(zoneMeshes, false)

          // Restore previously hovered
          if (hoveredMesh && (!hits.length || hits[0].object !== hoveredMesh)) {
            const origMat = hoveredMesh.userData.origMaterial as THREE.Material | undefined
            if (origMat) hoveredMesh.material = origMat
            hoveredMesh = null
            renderer.domElement.style.cursor = 'default'
            setHoveredSpace(null)
          }

          // Highlight new
          if (hits.length) {
            const mesh = hits[0].object as THREE.Mesh
            if (mesh !== hoveredMesh) {
              if (!mesh.userData.origMaterial) mesh.userData.origMaterial = mesh.material
              mesh.material = highlightMat
              hoveredMesh = mesh
              renderer.domElement.style.cursor = 'pointer'
              const spaceId = mesh.userData.spaceId as string
              const space = spaces.find(s => s.id === spaceId)
              if (space) setHoveredSpace(space)
            }
          }
        }

        const onClick = (event: MouseEvent) => {
          if (!container) return
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hits = raycaster.intersectObjects(zoneMeshes, false)
          if (hits.length) {
            const mesh = hits[0].object as THREE.Mesh
            const spaceId = mesh.userData.spaceId as string
            const space = spaces.find(s => s.id === spaceId)
            if (space) {
              setSelectedSpace(space)
              onSpaceClick?.(space)

              // Remove previous outline
              if (selectedOutline) {
                selectedOutline.geometry.dispose()
                scene.remove(selectedOutline)
              }
              // Create outline around selected mesh
              const geo = (mesh.geometry as THREE.BoxGeometry).clone()
              geo.scale(1.03, 1.03, 1.2)
              selectedOutline = new THREE.Mesh(geo, selectedOutlineMat)
              selectedOutline.position.copy(mesh.position)
              selectedOutline.rotation.copy(mesh.rotation)
              scene.add(selectedOutline)
            }
          }
        }

        renderer.domElement.addEventListener('pointermove', onMove)
        renderer.domElement.addEventListener('click', onClick)
        cleanupFns.push(() => {
          renderer.domElement.removeEventListener('pointermove', onMove)
          renderer.domElement.removeEventListener('click', onClick)
          highlightMat.dispose()
          selectedOutlineMat.dispose()
        })

        // ── OrbitControls with smooth pan/zoom ──
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(cx, cy, 0)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.maxPolarAngle = Math.PI / 2.05
        controls.minDistance = diag * 0.005  // Allow much closer zoom without clipping
        controls.maxDistance = diag * 20
        controls.screenSpacePanning = true  // Pan parallel to screen (more intuitive)
        controls.panSpeed = 1.5
        controls.zoomSpeed = 1.5
        controls.rotateSpeed = 0.8
        controls.enablePan = true
        controls.enableZoom = true
        controls.enableRotate = true
        // Mouse buttons: LEFT = rotate, MIDDLE = zoom, RIGHT = pan
        controls.mouseButtons = {
          LEFT: 0, // ROTATE
          MIDDLE: 1, // DOLLY
          RIGHT: 2, // PAN
        }
        // Touch: ONE = rotate, TWO = pan
        controls.touches = {
          ONE: 2, // ROTATE
          TWO: 1, // DOLLY_PAN
        }
        // Keyboard pan
        controls.keys = {
          LEFT: 'ArrowLeft',
          UP: 'ArrowUp',
          RIGHT: 'ArrowRight',
          BOTTOM: 'ArrowDown',
        }
        controls.keyPanSpeed = 50
        controls.listenToKeyEvents(window)
        controls.update()
        cleanupFns.push(() => controls.dispose())

        // Fit view function (resets camera + target)
        const fitView = () => {
          if (mode === '3d-advanced') {
            const d = diag * 0.7
            camera.position.set(cx + d, cy - d, d * 0.9)
          } else {
            camera.position.set(cx, cy - ph * 0.8, diag * 0.5)
          }
          camera.lookAt(cx, cy, 0)
          controls.target.set(cx, cy, 0)
          controls.update()
        }
        fitViewRef.current = fitView

        // ── Export screenshot ──
        const exportScreenshot = () => {
          renderer.render(scene, camera)
          const url = renderer.domElement.toDataURL('image/png')
          const a = document.createElement('a')
          a.href = url
          const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)
          a.download = `plan-3d-${mode}-${stamp}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
        exportRef.current = exportScreenshot

        // ── Animate ──
        let rafId = 0
        const animate = () => {
          if (disposed) return
          rafId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()
        cleanupFns.push(() => cancelAnimationFrame(rafId))

        // ── Resize (robust — uses ResizeObserver + requestAnimationFrame) ──
        let resizeRaf = 0
        const onResize = () => {
          if (!container || disposed) return
          cancelAnimationFrame(resizeRaf)
          resizeRaf = requestAnimationFrame(() => {
            const nw = container.clientWidth
            const nh = container.clientHeight
            if (nw === 0 || nh === 0) return
            camera.aspect = nw / nh
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh, false)
            renderer.domElement.style.width = '100%'
            renderer.domElement.style.height = '100%'
          })
        }
        window.addEventListener('resize', onResize)
        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)
        onResize() // Initial sizing
        cleanupFns.push(() => {
          cancelAnimationFrame(resizeRaf)
          window.removeEventListener('resize', onResize)
          resizeObserver.disconnect()
        })

        // ── Shift+Left-click for pan (alternative to right-click) ──
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Shift') {
            controls.mouseButtons.LEFT = 2 // PAN
          }
        }
        const onKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Shift') {
            controls.mouseButtons.LEFT = 0 // ROTATE
          }
        }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        cleanupFns.push(() => {
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('keyup', onKeyUp)
        })

        // ── Cleanup scene geometry/materials ──
        cleanupFns.push(() => {
          scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (mesh.geometry) mesh.geometry.dispose()
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
              for (const m of mats) m.dispose()
            }
          })
        })
      } catch (err) {
        console.error('[Plan3D] Error:', err)
        setStatus(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    init()

    return () => {
      disposed = true
      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        try { cleanupFns[i]() } catch { /* ignore */ }
      }
    }
  }, [filteredWalls, filteredSpaces, filteredDims, filteredCameras, filteredDoors, filteredBlindSpots, filteredPois, filteredSignage, filteredMoments, filteredJourneys, effectiveBounds, mode, showLabels, showFov, currentFloor, detectedFloors, floorOpacity, shadowsEnabled])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: '#0a0a14' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
        <div className="px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-400">
          {mode === '3d' ? 'Perspective 3D' : 'Vue Isométrique'} — {status}
        </div>
        <button
          onClick={() => fitViewRef.current?.()}
          className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 border border-blue-500 text-[10px] text-white font-medium transition-colors"
        >
          Recentrer
        </button>
        <button
          onClick={() => setShadowsEnabled(!shadowsEnabled)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
            shadowsEnabled ? 'bg-slate-600/80 hover:bg-slate-600 border-slate-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
          title="Ombres portees"
        >
          Ombres
        </button>
        <button
          onClick={() => exportRef.current?.()}
          className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 border border-purple-500 text-[10px] text-white font-medium transition-colors"
          title="Exporter la vue 3D en PNG"
        >
          📷 Export
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
            showLabels ? 'bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          Labels
        </button>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
            showDimensions ? 'bg-red-600/80 hover:bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          Cotes
        </button>
        {cameras.length > 0 && (
          <>
            <button
              onClick={() => setShowCameras(!showCameras)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                showCameras ? 'bg-indigo-600/80 hover:bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
              title="Cameras CCTV"
            >
              📷 Cameras ({cameras.length})
            </button>
            <button
              onClick={() => setShowFov(!showFov)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                showFov ? 'bg-indigo-600/50 hover:bg-indigo-600/70 border-indigo-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
              title="Cones de vision (FOV)"
            >
              FOV
            </button>
          </>
        )}
        {doors.length > 0 && (
          <button
            onClick={() => setShowDoors(!showDoors)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showDoors ? 'bg-green-600/80 hover:bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Portes et sorties"
          >
            🚪 Portes ({doors.length})
          </button>
        )}
        {blindSpots.length > 0 && (
          <button
            onClick={() => setShowBlindSpots(!showBlindSpots)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showBlindSpots ? 'bg-orange-600/80 hover:bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Angles morts"
          >
            ⚠ Angles morts ({blindSpots.length})
          </button>
        )}
        {pois.length > 0 && (
          <button
            onClick={() => setShowPois(!showPois)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showPois ? 'bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Points d'interet"
          >
            📍 POIs ({pois.length})
          </button>
        )}
        {signage.length > 0 && (
          <button
            onClick={() => setShowSignage(!showSignage)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showSignage ? 'bg-cyan-600/80 hover:bg-cyan-600 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Signaletique"
          >
            🪧 Signaletique ({signage.length})
          </button>
        )}
        {moments.length > 0 && (
          <button
            onClick={() => setShowMoments(!showMoments)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showMoments ? 'bg-teal-600/80 hover:bg-teal-600 border-teal-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Moments de parcours"
          >
            🎯 Moments ({moments.length})
          </button>
        )}
        {journeys.length > 0 && (
          <button
            onClick={() => setShowJourneys(!showJourneys)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
              showJourneys ? 'bg-green-500/80 hover:bg-green-500 border-green-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Parcours"
          >
            🗺 Parcours ({journeys.length})
          </button>
        )}
      </div>

      {/* Floor selector — top right */}
      {detectedFloors.length > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-gray-900/90 border border-white/[0.08] rounded-lg p-1">
          <span className="text-[9px] text-gray-500 px-2 uppercase tracking-wider">Etage</span>
          <button
            onClick={() => setCurrentFloor('all')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              currentFloor === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Tous
          </button>
          {[...detectedFloors].sort((a, b) => a.stackOrder - b.stackOrder).map(f => (
            <button
              key={f.id}
              onClick={() => setCurrentFloor(f.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                currentFloor === f.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {f.label}
              <span className="ml-1 text-[8px] opacity-60">({f.entityCount})</span>
            </button>
          ))}
        </div>
      )}

      {/* Right-side panels: floor controls (if multi-floor view) + layer panel */}
      {detectedFloors.length > 1 && currentFloor === 'all' && (
        <div className="absolute top-16 right-3 w-56 rounded-lg bg-gray-900/90 border border-white/[0.08] shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Etages superposes</span>
          </div>
          <div className="p-2 space-y-2">
            {[...detectedFloors].sort((a, b) => b.stackOrder - a.stackOrder).map(f => {
              const isHidden = hiddenFloors.has(f.id)
              const opacity = floorOpacity[f.id] ?? 1
              return (
                <div key={f.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setHiddenFloors(prev => {
                          const next = new Set(prev)
                          if (next.has(f.id)) next.delete(f.id)
                          else next.add(f.id)
                          return next
                        })
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        !isHidden ? 'bg-blue-500 border-blue-400' : 'bg-transparent border-gray-600'
                      }`}
                    >
                      {!isHidden && <span className="text-[8px] text-white">✓</span>}
                    </button>
                    <span className={`text-[11px] font-medium ${isHidden ? 'text-gray-600' : 'text-gray-200'}`}>
                      {f.label}
                    </span>
                    <span className="text-[9px] text-gray-500 ml-auto">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setFloorOpacity(prev => ({ ...prev, [f.id]: parseFloat(e.target.value) }))}
                    disabled={isHidden}
                    className="w-full h-1 accent-blue-500"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Layer panel toggle (bottom left) */}
      {allLayers.length > 0 && (
        <div className="absolute bottom-10 left-3 z-20">
          <button
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/90 border border-white/[0.08] hover:bg-gray-700/90 text-[10px] text-gray-300"
          >
            Calques ({allLayers.length - hiddenLayers.size}/{allLayers.length})
          </button>
          {layerPanelOpen && (
            <div className="absolute bottom-10 left-0 w-64 max-h-80 overflow-y-auto rounded-lg bg-gray-900 border border-white/[0.08] shadow-xl">
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-gray-900">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Calques DXF</span>
                <div className="flex gap-1">
                  <button onClick={() => setHiddenLayers(new Set())} className="text-[9px] text-blue-400 hover:text-blue-300 px-1">Tout</button>
                  <button onClick={() => setHiddenLayers(new Set(allLayers))} className="text-[9px] text-gray-500 hover:text-gray-300 px-1">Rien</button>
                </div>
              </div>
              {allLayers.map(layer => {
                const isHidden = hiddenLayers.has(layer)
                return (
                  <button
                    key={layer}
                    onClick={() => {
                      setHiddenLayers(prev => {
                        const next = new Set(prev)
                        if (next.has(layer)) next.delete(layer)
                        else next.add(layer)
                        return next
                      })
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1 text-left text-[10px] transition-colors hover:bg-gray-800 ${
                      isHidden ? 'text-gray-600' : 'text-gray-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${
                      isHidden ? 'bg-transparent border-gray-600' : 'bg-blue-500 border-blue-400'
                    }`} />
                    <span className="truncate">{layer}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Hovered space tooltip */}
      {hoveredSpace && !selectedSpace && (
        <div className="absolute top-16 left-3 px-3 py-2 rounded-lg bg-amber-900/90 border border-amber-700/40 text-[11px] text-amber-100 pointer-events-none shadow-xl max-w-xs">
          <div className="font-semibold text-white">{hoveredSpace.label}</div>
          <div className="text-[10px] text-amber-200/80 mt-0.5">
            {hoveredSpace.type} · {hoveredSpace.areaSqm.toFixed(1)} m²
            {hoveredSpace.floorId && ` · ${hoveredSpace.floorId}`}
          </div>
        </div>
      )}

      {/* Selection panel (bottom-center) */}
      {selectedSpace && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[min(420px,calc(100%-24px))] rounded-lg bg-gray-900/95 border border-blue-500/40 shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-blue-900/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full"
                style={{ background: selectedSpace.color || ZONE_COLORS[selectedSpace.type] || '#3b82f6' }} />
              <span className="text-[12px] text-white font-semibold truncate">
                {selectedSpace.label}
              </span>
            </div>
            <button
              onClick={() => setSelectedSpace(null)}
              className="text-gray-400 hover:text-white text-sm leading-none p-1"
            >✕</button>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 text-[10px]">
            <div>
              <span className="text-gray-500 uppercase tracking-wider">Type</span>
              <p className="text-white capitalize mt-0.5">{selectedSpace.type}</p>
            </div>
            <div>
              <span className="text-gray-500 uppercase tracking-wider">Surface</span>
              <p className="text-white font-mono mt-0.5">{selectedSpace.areaSqm.toFixed(1)} m²</p>
            </div>
            <div>
              <span className="text-gray-500 uppercase tracking-wider">Etage</span>
              <p className="text-white mt-0.5">{selectedSpace.floorId ?? '—'}</p>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between bg-gray-950/50">
            <span className="text-[9px] text-gray-500">ID: {selectedSpace.id}</span>
            <div className="flex gap-2">
              <button
                onClick={() => onSpaceClick?.(selectedSpace)}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-medium transition-colors"
              >
                Editer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation hint */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-500 pointer-events-none">
        Glisser: rotation · Molette: zoom · Clic droit / Shift+glisser: pan · Fleches: pan · Clic zone: selection
      </div>
    </div>
  )
}
