// ═══ <ExportGLBButton> — Export scène 3D en GLB pour Twinmotion/Blender ═══
//
// Bouton flottant qui :
//   1. Convertit le modeledPlan en SpatialEntity[]
//   2. Construit la scène Three.js complète (sols, murs, voitures, arbres)
//   3. Sérialise via THREE.GLTFExporter
//   4. Télécharge le fichier .glb
//
// Le user peut ouvrir le .glb dans :
//   - Twinmotion (drag&drop, rendu temps réel photoréaliste)
//   - Blender → Cycles (rendu offline V-Ray-like)
//   - Lumion / Enscape
//   - Web : https://gltf-viewer.donmccurdy.com/

import { useState } from 'react'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { Download, Loader2 } from 'lucide-react'
import type { ParsedPlan } from '../planReader/planEngineTypes'
import { detectedSpacesToSpatialEntities } from '../engines/geometry/editableSpaceAdapter'
import { autoPopulate } from '../../../../../packages/spatial-core/src/rendering/autoPopulate'
import { getRenderDirective } from '../../../../../packages/spatial-core/src/rendering/sceneDispatcher'
import { getMaterial } from '../../../../../packages/spatial-core/src/domain/MaterialRegistry'
import type { SpatialEntity, Polygon } from '../../../../../packages/spatial-core/src/domain/SpatialEntity'
import { isPoint, isPolygon, isPolyline } from '../../../../../packages/spatial-core/src/domain/SpatialEntity'

interface Props {
  readonly plan: ParsedPlan
  readonly projectId: string
  readonly className?: string
}

// ─── Construction de la scène Three.js ────────────────────

function buildSceneFromEntities(entities: SpatialEntity[]): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#cfd8dc')

  // Lights for export viewer compatibility
  const amb = new THREE.AmbientLight(0xffffff, 0.6)
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(50, 80, 50)
  dir.castShadow = true
  scene.add(amb, dir)

  for (const e of entities) {
    const directive = getRenderDirective(e)
    if (directive.strategy === 'skip' || directive.strategy === 'experience_overlay_2d') continue
    const mesh = buildMeshForEntity(e, directive)
    if (mesh) scene.add(mesh)
  }
  return scene
}

function buildMeshForEntity(
  e: SpatialEntity,
  directive: ReturnType<typeof getRenderDirective>,
): THREE.Object3D | null {
  const mat = getMaterial(directive.materialId)
  const material = new THREE.MeshStandardMaterial({
    color: mat.baseColor,
    metalness: mat.metalness,
    roughness: mat.roughness,
    opacity: mat.opacity,
    transparent: mat.transparent,
  })

  // Helper centroid pour les instances ponctuelles
  const centroid = (): { x: number; z: number } => {
    if (isPoint(e.geometry)) return { x: e.geometry.point.x, z: e.geometry.point.y }
    if (isPolygon(e.geometry)) {
      const o = e.geometry.outer
      let sx = 0, sy = 0
      for (const p of o) { sx += p.x; sy += p.y }
      return { x: sx / o.length, z: sy / o.length }
    }
    return { x: 0, z: 0 }
  }

  switch (directive.strategy) {
    case 'wall_extrusion': {
      if (!isPolygon(e.geometry) && !isPolyline(e.geometry)) return null
      const points = isPolygon(e.geometry) ? e.geometry.outer : e.geometry.points
      const closed = isPolygon(e.geometry) || (isPolyline(e.geometry) && e.geometry.closed)
      const pos: number[] = []
      const idx: number[] = []
      let bIdx = 0
      const n = closed ? points.length : points.length - 1
      for (let i = 0; i < n; i++) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        pos.push(a.x, directive.baseElevation, a.y)
        pos.push(b.x, directive.baseElevation, b.y)
        pos.push(b.x, directive.baseElevation + directive.extrusionHeight, b.y)
        pos.push(a.x, directive.baseElevation + directive.extrusionHeight, a.y)
        idx.push(bIdx, bIdx + 1, bIdx + 2, bIdx, bIdx + 2, bIdx + 3)
        bIdx += 4
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setIndex(idx)
      g.computeVertexNormals()
      return new THREE.Mesh(g, material)
    }

    case 'flat_surface': {
      if (!isPolygon(e.geometry)) return null
      const outer = (e.geometry as Polygon).outer
      if (outer.length < 3) return null
      const pos: number[] = []
      const idx: number[] = []
      for (const p of outer) pos.push(p.x, directive.baseElevation, p.y)
      for (let i = 1; i < outer.length - 1; i++) idx.push(0, i, i + 1)
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setIndex(idx)
      g.computeVertexNormals()
      return new THREE.Mesh(g, material)
    }

    case 'low_volume_extrusion': {
      if (!isPolygon(e.geometry)) return null
      const outer = (e.geometry as Polygon).outer
      if (outer.length < 3) return null
      const shape = new THREE.Shape()
      shape.moveTo(outer[0].x, outer[0].y)
      for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, outer[i].y)
      shape.closePath()
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: directive.extrusionHeight,
        bevelEnabled: false,
        curveSegments: 4,
      })
      geo.rotateX(-Math.PI / 2)
      geo.translate(0, directive.baseElevation, 0)
      geo.computeVertexNormals()
      return new THREE.Mesh(geo, material)
    }

    case 'tree_instance':
    case 'palm_instance': {
      const c = centroid()
      const trunkH = directive.extrusionHeight * 0.85
      const crownR = Math.max(0.8, directive.extrusionHeight * 0.25)
      const group = new THREE.Group()
      group.position.set(c.x, 0, c.z)
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, trunkH, 8),
        new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.95 }),
      )
      trunk.position.y = trunkH / 2
      group.add(trunk)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(crownR, 12, 8),
        new THREE.MeshStandardMaterial({
          color: directive.strategy === 'palm_instance' ? '#3a6b1f' : '#2d5016',
          roughness: 0.9,
        }),
      )
      crown.position.y = trunkH + crownR * 0.7
      group.add(crown)
      return group
    }

    case 'car_instance': {
      const c = centroid()
      const group = new THREE.Group()
      group.position.set(c.x, 0, c.z)
      // Châssis
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.9, 1.8),
        new THREE.MeshStandardMaterial({ color: mat.baseColor, metalness: 0.7, roughness: 0.25 }),
      )
      body.position.y = 0.45 + 0.25
      group.add(body)
      // Cabine
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(2.475, 0.55, 1.656),
        new THREE.MeshStandardMaterial({ color: mat.baseColor, metalness: 0.5, roughness: 0.2 }),
      )
      cabin.position.y = 0.9 + 0.25 + 0.275
      group.add(cabin)
      // 4 roues (cylindres rotated)
      const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.18, 14)
      const wheelMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.85 })
      const wheelPositions: Array<[number, number]> = [
        [4.5 * 0.32, -1.8 * 0.45], [4.5 * 0.32, 1.8 * 0.45],
        [-4.5 * 0.32, -1.8 * 0.45], [-4.5 * 0.32, 1.8 * 0.45],
      ]
      for (const [dx, dz] of wheelPositions) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat)
        wheel.position.set(dx, 0.27, dz)
        wheel.rotation.x = Math.PI / 2
        group.add(wheel)
      }
      return group
    }

    case 'point_instance':
    case 'wayfinder_instance':
    case 'safety_marker_instance':
    case 'equipment_instance': {
      const c = centroid()
      const w = 0.5, d = 0.3, h = directive.extrusionHeight
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
      mesh.position.set(c.x, directive.baseElevation + h / 2, c.z)
      return mesh
    }

    default:
      return null
  }
}

// ─── Composant ────────────────────────────────────────────

export function ExportGLBButton({ plan, projectId, className }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const baseEntities = detectedSpacesToSpatialEntities(plan.spaces, projectId)
      const autoEntities = autoPopulate(baseEntities, { parkingFillRate: 0.7, treeSpacingM: 8 })
      const allEntities = [...baseEntities, ...autoEntities]

      const scene = buildSceneFromEntities(allEntities)

      const exporter = new GLTFExporter()
      const result = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          scene,
          (out) => resolve(out as ArrayBuffer),
          (err) => reject(err),
          { binary: true, embedImages: true },
        )
      })

      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectId}-${new Date().toISOString().slice(0, 10)}.glb`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ExportGLB] échec', err)
      alert(`Échec de l'export GLB : ${(err as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !plan}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/20 shadow transition ${
        exporting ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
      } ${className ?? ''}`}
      title="Exporte la scène 3D en .glb pour ouvrir dans Twinmotion / Blender / Lumion / glTF Viewer"
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {exporting ? 'Export...' : 'Exporter GLB'}
    </button>
  )
}
