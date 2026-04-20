// ═══ GLB Exporter ═══
//
// Génère un fichier GLB (glTF 2.0 binaire) à partir du ParsedPlan +
// de la scène courante. Format universel pour visualisation 3D externe
// (Blender, SketchFab, Three.js viewers, AR/VR via <model-viewer>).
//
// Structure produite :
//   - Sol (plane grand format)
//   - Polygones espaces extrudés (hauteur ~15 cm) coloré par type
//   - Murs extrudés (hauteur scene.wallHeight, défaut 3 m)
//
// Dépendance : three.js (déjà présent) + GLTFExporter (addon officiel).

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'
import { SPACE_TYPE_META, type SpaceTypeKey } from '../../shared/proph3t/libraries/spaceTypeLibrary'

export async function exportSceneGlb(
  plan: ParsedPlan,
  scene?: { wallHeight?: number; name?: string },
): Promise<Blob> {
  const wallHeight = scene?.wallHeight ?? 3
  const root = new THREE.Scene()
  root.name = scene?.name ?? 'AtlasPlan'

  const { bounds } = plan
  const cx = bounds.minX + bounds.width / 2
  const cy = bounds.minY + bounds.height / 2

  // Centrer autour de l'origine (meilleur pour viewers externes)
  const offsetX = -cx
  const offsetY = -cy

  // ─── Sol ───
  const floorGeo = new THREE.PlaneGeometry(bounds.width * 1.05, bounds.height * 1.05)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.9 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.name = 'Floor'
  root.add(floor)

  // ─── Espaces (dalles fines colorées) ───
  for (const sp of plan.spaces) {
    if (!sp.polygon || sp.polygon.length < 3) continue
    const meta = SPACE_TYPE_META[sp.type as SpaceTypeKey]
    const color = new THREE.Color(sp.color ?? meta?.color ?? '#9ca3af')
    const shape = new THREE.Shape()
    shape.moveTo(sp.polygon[0][0] + offsetX, sp.polygon[0][1] + offsetY)
    for (let i = 1; i < sp.polygon.length; i++) {
      shape.lineTo(sp.polygon[i][0] + offsetX, sp.polygon[i][1] + offsetY)
    }
    shape.closePath()
    const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false })
    slabGeo.rotateX(-Math.PI / 2)  // Z devient Y (convention glTF : Y up)
    slabGeo.translate(0, 0.01, 0)
    const slabMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.8,
    })
    const slab = new THREE.Mesh(slabGeo, slabMat)
    slab.name = `Space_${sanitizeName(sp.label)}`
    slab.userData = {
      id: sp.id,
      label: sp.label,
      type: sp.type,
      areaSqm: sp.areaSqm,
      floorId: sp.floorId,
    }
    root.add(slab)
  }

  // ─── Murs (instanced pour perfs sur gros plans) ───
  const wallThick = 0.2
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xa0a8b8, roughness: 0.7 })
  const wallGeo = new THREE.BoxGeometry(1, 1, 1)
  const instancedWalls = new THREE.InstancedMesh(wallGeo, wallMat, plan.wallSegments.length)
  instancedWalls.name = 'Walls'
  const dummy = new THREE.Object3D()
  let wallCount = 0
  for (const w of plan.wallSegments) {
    const dx = w.x2 - w.x1
    const dy = w.y2 - w.y1
    const len = Math.hypot(dx, dy)
    if (len < 0.05) continue
    const mx = (w.x1 + w.x2) / 2 + offsetX
    const my = (w.y1 + w.y2) / 2 + offsetY
    // Convention glTF : Y up. Z monde devient X ou Z selon l'orientation.
    dummy.position.set(mx, wallHeight / 2, my)
    dummy.rotation.set(0, -Math.atan2(dy, dx), 0)
    dummy.scale.set(len, wallHeight, wallThick)
    dummy.updateMatrix()
    instancedWalls.setMatrixAt(wallCount++, dummy.matrix)
  }
  instancedWalls.count = wallCount
  instancedWalls.instanceMatrix.needsUpdate = true
  if (wallCount > 0) root.add(instancedWalls)

  // ─── Lumières (éclairage basique — Blender ajustera) ───
  const amb = new THREE.AmbientLight(0xffffff, 0.6)
  amb.name = 'AmbientLight'
  const sun = new THREE.DirectionalLight(0xffffff, 0.8)
  sun.position.set(50, 100, 50)
  sun.name = 'SunLight'
  root.add(amb, sun)

  // ─── Export via GLTFExporter ───
  const exporter = new GLTFExporter()
  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      root,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }))
        } else {
          const json = JSON.stringify(result)
          resolve(new Blob([json], { type: 'model/gltf+json' }))
        }
      },
      (err) => reject(err),
      { binary: true, embedImages: true },
    )
  })
}

function sanitizeName(s: string): string {
  return (s || 'Space').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
}
