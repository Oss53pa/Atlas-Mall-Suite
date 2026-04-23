// ═══ AR FLOOR PLAN SCENE — Three.js geometry from EditableSpace[] ═══
//
// Converts the floor plan polygons into a flat Three.js Group
// that can be placed at the XR anchor position.
//
// Coordinate mapping:
//   Plan (metres)  →  Three.js world (metres, Y-up)
//   x → X,  y → -Z  (plan Y = depth in world Z)
//   All geometry lies on Y = 0 (the floor plane)

import * as THREE from 'three'
import type { EditableSpace } from '../../components/SpaceEditorCanvas'
import { SPACE_TYPE_META }    from '../../proph3t/libraries/spaceTypeLibrary'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parse a CSS hex color string → THREE.Color. */
function hexToColor(hex: string): THREE.Color {
  try { return new THREE.Color(hex) } catch { return new THREE.Color(0x888888) }
}

/** true if the space type should be rendered as a line rather than a fill. */
function isDoorType(type: string): boolean {
  return type.startsWith('porte_') || type === 'sortie_secours'
}

// ── Per-space mesh builders ────────────────────────────────────────────────

function buildFilledMesh(
  space: EditableSpace,
  color: THREE.Color,
  opacity: number,
): THREE.Mesh {
  const shape = new THREE.Shape()
  space.polygon.forEach((pt, i) => {
    if (i === 0) shape.moveTo(pt.x, -pt.y)
    else         shape.lineTo(pt.x, -pt.y)
  })
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape)
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  // Lay flat on the floor — ShapeGeometry is in XY; rotate so it lies in XZ
  mesh.rotation.x = -Math.PI / 2
  mesh.userData = { spaceId: space.id, type: space.type }
  return mesh
}

function buildEdgeMesh(
  space: EditableSpace,
  color: THREE.Color,
): THREE.LineLoop {
  const points = space.polygon.map((pt) => new THREE.Vector3(pt.x, 0, pt.y))
  if (points.length > 0) points.push(points[0].clone())  // close loop
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
    linewidth: 1,
  })
  return new THREE.LineLoop(geometry, material)
}

function buildDoorLine(space: EditableSpace, color: THREE.Color): THREE.Line | null {
  if (space.polygon.length < 2) return null
  // Use the longest edge as the door opening
  let maxLen = 0; let bestI = 0
  const poly = space.polygon
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    const d = Math.hypot(poly[j].x - poly[i].x, poly[j].y - poly[i].y)
    if (d > maxLen) { maxLen = d; bestI = i }
  }
  const p1 = poly[bestI]
  const p2 = poly[(bestI + 1) % poly.length]
  const points = [
    new THREE.Vector3(p1.x, 0.01, p1.y),
    new THREE.Vector3(p2.x, 0.01, p2.y),
  ]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 })
  return new THREE.Line(geometry, material)
}

// ── Text label sprite (canvas texture) ────────────────────────────────────

function buildLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas  = document.createElement('canvas')
  canvas.width  = 256
  canvas.height = 64
  const ctx     = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.roundRect?.(0, 0, canvas.width, canvas.height, 8) ?? ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fill()
  ctx.font      = 'bold 22px system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text.slice(0, 24), 128, 32)

  const texture  = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite   = new THREE.Sprite(material)
  sprite.scale.set(1.6, 0.4, 1)
  return sprite
}

// ── Main builder ────────────────────────────────────────────────────────────

export interface ARSceneOptions {
  /** Vertical offset for labels above the floor (metres). Default: 0.3. */
  labelHeight?: number
  /** Scale multiplier applied to all geometry (useful if plan unit ≠ metres). */
  scaleFactor?: number
  showLabels?: boolean
  showEdges?: boolean
}

/**
 * Builds a THREE.Group containing all floor plan geometry.
 * The group's origin corresponds to the plan's (0, 0) point.
 * Place the group at the XR anchor position to align with the real world.
 */
export function buildARFloorPlanGroup(
  spaces: EditableSpace[],
  options: ARSceneOptions = {},
): THREE.Group {
  const {
    labelHeight = 0.3,
    scaleFactor = 1,
    showLabels  = true,
    showEdges   = true,
  } = options

  const group = new THREE.Group()
  group.name  = 'atlas-floor-plan'

  // Thin elevation so filled polygons don't z-fight with the real floor
  const FLOOR_OFFSET = 0.005  // 5 mm above detected surface

  for (const space of spaces) {
    const meta = SPACE_TYPE_META[space.type]
    if (!meta || !space.polygon.length) continue

    const color = hexToColor(meta.color)
    const isDoor = isDoorType(space.type)

    const spaceGroup = new THREE.Group()
    spaceGroup.name = `space-${space.id}`

    if (isDoor) {
      const line = buildDoorLine(space, color)
      if (line) {
        line.position.y = FLOOR_OFFSET + 0.002
        spaceGroup.add(line)
      }
    } else {
      // Filled mesh
      const mesh = buildFilledMesh(space, color, 0.55)
      mesh.position.y = FLOOR_OFFSET
      spaceGroup.add(mesh)

      // Edge outline
      if (showEdges) {
        const edge = buildEdgeMesh(space, color)
        edge.position.y = FLOOR_OFFSET + 0.001
        spaceGroup.add(edge)
      }

      // Label sprite
      if (showLabels) {
        const labelText = space.vacant
          ? 'Disponible'
          : (space.tenant || space.name)
        if (labelText) {
          // Centroid
          const cx = space.polygon.reduce((s, p) => s + p.x, 0) / space.polygon.length
          const cy = space.polygon.reduce((s, p) => s + p.y, 0) / space.polygon.length
          const sprite = buildLabelSprite(labelText, meta.color)
          sprite.position.set(cx, labelHeight, cy)
          spaceGroup.add(sprite)
        }
      }
    }

    if (scaleFactor !== 1) spaceGroup.scale.setScalar(scaleFactor)
    group.add(spaceGroup)
  }

  return group
}

/**
 * Creates a reticle mesh for surface-detection targeting.
 * White ring that appears where the hit-test surface is detected.
 */
export function createReticle(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(0.08, 0.12, 32).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.visible = false
  mesh.name = 'reticle'
  return mesh
}

/**
 * Dispose all geometries and materials in a Group recursively.
 * Call when AR session ends to free GPU memory.
 */
export function disposeARGroup(group: THREE.Object3D): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineLoop) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => {
          if ((m as THREE.MeshBasicMaterial).map) (m as THREE.MeshBasicMaterial).map!.dispose()
          m.dispose()
        })
      } else {
        const m = obj.material as THREE.Material & { map?: THREE.Texture }
        if (m.map) m.map.dispose()
        m.dispose()
      }
    }
    if (obj instanceof THREE.Sprite) {
      const m = obj.material as THREE.SpriteMaterial
      m.map?.dispose()
      m.dispose()
    }
  })
}
