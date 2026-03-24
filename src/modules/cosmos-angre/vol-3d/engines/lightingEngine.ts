import * as THREE from 'three'
import type { LightingPreset } from '../store/vol3dTypes'

interface LightingConfig {
  ambient: { color: string; intensity: number }
  directional: { color: string; intensity: number; position: [number, number, number] }
  fill?: { color: string; intensity: number; position: [number, number, number] }
  point?: { color: string; intensity: number; position: [number, number, number]; distance: number }[]
  fog?: { color: string; near: number; far: number }
  background: string
}

const PRESETS: Record<LightingPreset, LightingConfig> = {
  day_natural: { ambient: { color: '#c8d8f0', intensity: 0.6 }, directional: { color: '#fff8e0', intensity: 1.8, position: [50, 80, 30] }, fill: { color: '#e0f0ff', intensity: 0.4, position: [-30, 40, -20] }, fog: { color: '#080c14', near: 80, far: 200 }, background: '#080c14' },
  day_overcast: { ambient: { color: '#d0d8e8', intensity: 1.0 }, directional: { color: '#e8ecf0', intensity: 0.8, position: [20, 60, 20] }, fog: { color: '#080c14', near: 60, far: 150 }, background: '#080c14' },
  evening_commercial: { ambient: { color: '#1a1228', intensity: 0.3 }, directional: { color: '#ff8c40', intensity: 0.6, position: [40, 30, 60] }, fill: { color: '#4040a0', intensity: 0.2, position: [-30, 20, -30] }, point: [{ color: '#fff5e0', intensity: 2, position: [20, 4, 20], distance: 25 }, { color: '#fff5e0', intensity: 2, position: [60, 4, 20], distance: 25 }, { color: '#fff0d0', intensity: 1.5, position: [40, 4, 40], distance: 20 }], fog: { color: '#0a0818', near: 50, far: 120 }, background: '#0a0818' },
  night_security: { ambient: { color: '#050810', intensity: 0.15 }, directional: { color: '#102030', intensity: 0.2, position: [0, 60, 0] }, point: [{ color: '#e8f0ff', intensity: 1, position: [20, 4, 20], distance: 15 }, { color: '#ff3300', intensity: 0.5, position: [40, 4, 40], distance: 10 }], fog: { color: '#050810', near: 30, far: 80 }, background: '#050810' },
  presentation: { ambient: { color: '#c0c8e0', intensity: 0.5 }, directional: { color: '#ffffff', intensity: 2.0, position: [60, 80, 40] }, fill: { color: '#8090ff', intensity: 0.3, position: [-40, 30, -30] }, fog: { color: '#080c14', near: 100, far: 250 }, background: '#080c14' },
}

let lightGroup: THREE.Group | null = null

export function applyLighting(scene: THREE.Scene, preset: LightingPreset) {
  if (lightGroup) scene.remove(lightGroup)
  lightGroup = new THREE.Group()
  lightGroup.name = 'lights'
  const cfg = PRESETS[preset]

  lightGroup.add(new THREE.AmbientLight(new THREE.Color(cfg.ambient.color), cfg.ambient.intensity))

  const dir = new THREE.DirectionalLight(new THREE.Color(cfg.directional.color), cfg.directional.intensity)
  dir.position.set(...cfg.directional.position)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.near = 1; dir.shadow.camera.far = 300
  dir.shadow.camera.left = -80; dir.shadow.camera.right = 80; dir.shadow.camera.top = 80; dir.shadow.camera.bottom = -80
  dir.shadow.bias = -0.0005
  lightGroup.add(dir)

  if (cfg.fill) { const f = new THREE.DirectionalLight(new THREE.Color(cfg.fill.color), cfg.fill.intensity); f.position.set(...cfg.fill.position); lightGroup.add(f) }
  if (cfg.point) { for (const pt of cfg.point) { const p = new THREE.PointLight(new THREE.Color(pt.color), pt.intensity, pt.distance); p.position.set(...pt.position); lightGroup.add(p) } }
  if (cfg.fog) scene.fog = new THREE.Fog(new THREE.Color(cfg.fog.color), cfg.fog.near, cfg.fog.far)
  scene.background = new THREE.Color(cfg.background)
  scene.add(lightGroup)
}
