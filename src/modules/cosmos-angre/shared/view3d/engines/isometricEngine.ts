import type { Zone, Floor } from '../../proph3t/types'
import type { ExtrudedZone, ZoneHeight, IsoScene, IsoEntity, View3DConfig, View3DData, FloorStackConfig } from '../types/view3dTypes'
import { getVol1ZoneColors, getVol1ZoneLabel } from './vol1Renderer'
import { buildCameraEntities, buildBlindSpotOverlaySVG } from './vol2Renderer'
import { buildPOIEntities, buildMomentEntities, buildWayfindingPathsSVG } from './vol3Renderer'
import { defaultHeightForType } from './heightResolver'
import { populateAllZones } from './isoPopulator'
import { renderSymbolsSVG } from './isoSymbolRenderer'
import { generateFloorTilesSVG } from './isoFloorRenderer'
import { autoGenerateAnnotations, generateAnnotationsSVG } from './isoAnnotations'
import { facadeSign } from './isoSymbolLibrary'

const COS_ISO = Math.cos(Math.PI / 6)
const SIN_ISO = Math.sin(Math.PI / 6)

export function worldToIso(wX: number, wY: number, wZ: number, scale: number): [number, number] {
  return [
    (wX - wZ) * COS_ISO * scale,
    (wX + wZ) * SIN_ISO * scale - wY * scale,
  ]
}

const NEUTRAL_COLORS: Record<string, ExtrudedZone['colors']> = {
  parking:       { top: '#1e3a5f', left: '#0f1d2e', right: '#2a5080', front: '#162c48' },
  commerce:      { top: '#0d3320', left: '#061a10', right: '#1a5535', front: '#0a2818' },
  restauration:  { top: '#3d1500', left: '#1e0a00', right: '#6b2500', front: '#2e1000' },
  circulation:   { top: '#1a2a1a', left: '#0d150d', right: '#2a402a', front: '#152115' },
  technique:     { top: '#1a0a2e', left: '#0d0517', right: '#2e1550', front: '#140822' },
  backoffice:    { top: '#1a0a1a', left: '#0d050d', right: '#2e152e', front: '#140814' },
  financier:     { top: '#2a0a0a', left: '#150505', right: '#4a1515', front: '#1e0808' },
  loisirs:       { top: '#0a1a2a', left: '#050d15', right: '#152a42', front: '#08141e' },
  hotel:         { top: '#0a0a2a', left: '#050515', right: '#15154a', front: '#08081e' },
  bureaux:       { top: '#1a1a1a', left: '#0d0d0d', right: '#2e2e2e', front: '#141414' },
  exterieur:     { top: '#0a2a0a', left: '#051505', right: '#15451a', front: '#081e08' },
  sortie_secours:{ top: '#1a0000', left: '#0d0000', right: '#2e0000', front: '#140000' },
  services:      { top: '#1a1a0a', left: '#0d0d05', right: '#2e2e15', front: '#141408' },
}

function polyPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'
}

function extrudeZone(
  zone: Zone, height: ZoneHeight, floor: Floor,
  baseElev: number, scale: number,
  colors: ExtrudedZone['colors'], label?: string
): ExtrudedZone {
  const x0 = zone.x * floor.widthM, x1 = (zone.x + zone.w) * floor.widthM
  const z0 = zone.y * floor.heightM, z1 = (zone.y + zone.h) * floor.heightM
  const y0 = baseElev, y1 = baseElev + height.heightM

  const project = (x: number, y: number, z: number) => worldToIso(x, y, z, scale)

  return {
    zone, height, colors, label,
    iso: {
      topFace:   [project(x0,y1,z0), project(x1,y1,z0), project(x1,y1,z1), project(x0,y1,z1)],
      leftFace:  [project(x0,y0,z0), project(x0,y1,z0), project(x0,y1,z1), project(x0,y0,z1)],
      rightFace: [project(x0,y0,z1), project(x0,y1,z1), project(x1,y1,z1), project(x1,y0,z1)],
      frontFace: [project(x1,y0,z0), project(x1,y1,z0), project(x1,y1,z1), project(x1,y0,z1)],
    },
  }
}

export function buildIsoScene(data: View3DData, config: View3DConfig, scale = 60): IsoScene {
  const { floors, zones, transitions } = data
  const { floorStack } = config
  const extrudedZones: ExtrudedZone[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const sc of floorStack.filter(s => s.visible)) {
    const floor = floors.find(f => f.id === sc.floorId)
    if (!floor) continue
    const floorZones = zones.filter(z => z.floorId === floor.id)

    for (const zone of floorZones) {
      const heightCfg = config.zoneHeights.find(h => h.zoneId === zone.id) ?? {
        zoneId: zone.id, heightM: defaultHeightForType(zone.type),
        floorThicknessM: 0.3, hasGlazing: false, roofType: 'flat' as const,
      }

      const colors = data.sourceVolume === 'vol1' && data.tenants
        ? getVol1ZoneColors(zone, data.tenants, config)
        : (NEUTRAL_COLORS[zone.type] ?? NEUTRAL_COLORS.commerce)

      const label = data.sourceVolume === 'vol1' && data.tenants
        ? getVol1ZoneLabel(zone, data.tenants, config)
        : config.showFloorLabels ? zone.label : undefined

      const ez = extrudeZone(zone, heightCfg, floor, sc.baseElevationM, scale, colors, label)
      extrudedZones.push(ez)

      for (const pts of [ez.iso.topFace, ez.iso.leftFace, ez.iso.rightFace]) {
        for (const [x, y] of pts) {
          minX = Math.min(minX, x); minY = Math.min(minY, y)
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
        }
      }
    }
  }

  extrudedZones.sort((a, b) => (b.zone.x + b.zone.y) - (a.zone.x + a.zone.y))

  const margin = 50
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600 }
  const viewBox = { x: minX - margin, y: minY - margin, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 }

  const entities: IsoEntity[] = [
    ...(data.sourceVolume === 'vol2' && data.cameras
      ? buildCameraEntities(data.cameras, floors, floorStack, scale, config) : []),
    ...(data.sourceVolume === 'vol3' && data.pois
      ? buildPOIEntities(data.pois, floors, floorStack, scale, config) : []),
    ...(data.sourceVolume === 'vol3' && data.moments
      ? buildMomentEntities(data.moments, floors, floorStack, scale, config) : []),
    ...transitions.map(t => {
      const floor = floors.find(f => f.level === t.fromFloor)
      const stack = floorStack.find(s => s.floorId === floor?.id)
      if (!floor || !stack || !config.showTransitions) return null
      const [iX, iY] = worldToIso(t.x * floor.widthM, stack.baseElevationM + 0.5, t.y * floor.heightM, scale)
      return { id: t.id, type: 'transition' as const, isoX: iX, isoY: iY, elevation: 0, label: t.type === 'ascenseur' ? 'Asc' : 'Esc', color: '#f59e0b' }
    }).filter((e): e is IsoEntity => e !== null),
  ]

  const floor0 = floors[0]
  const stack0 = floorStack[0]
  const gridLines: [number, number][][] = []
  if (floor0 && stack0) {
    const step = 10
    for (let x = 0; x <= floor0.widthM; x += step)
      gridLines.push([worldToIso(x, stack0.baseElevationM, 0, scale), worldToIso(x, stack0.baseElevationM, floor0.heightM, scale)])
    for (let z = 0; z <= floor0.heightM; z += step)
      gridLines.push([worldToIso(0, stack0.baseElevationM, z, scale), worldToIso(floor0.widthM, stack0.baseElevationM, z, scale)])
  }

  return { viewBox, extrudedZones, entities, gridLines, scaleFactor: scale }
}

export function generateIsoSVG(scene: IsoScene, data: View3DData, config: View3DConfig): string {
  const { viewBox: vb, extrudedZones, entities, gridLines, scaleFactor } = scene
  const vbStr = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`
  const { floors, zones } = data

  // ── 1. Floor tiles (dalle avec joints) ──
  const floorTilesSVG = config.showFloorTiles
    ? data.floors.map(floor => {
        const stack = config.floorStack.find(s => s.floorId === floor.id)
        if (!stack || !stack.visible) return ''
        return generateFloorTilesSVG(floor, stack, scaleFactor)
      }).join('\n')
    : ''

  // ── 2. Grid ──
  const gridSVG = gridLines.map(([p1, p2]) =>
    `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="#ffffff06" stroke-width="0.5"/>`
  ).join('\n')

  // ── 3. Zone volumes ──
  const zonesSVG = extrudedZones.map(ez => {
    const { iso, colors, label, zone } = ez
    const topC = iso.topFace.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0])
    return `<g data-zone="${zone.id}">
      <path d="${polyPath(iso.leftFace)}" fill="${colors.left}" stroke="#ffffff06" stroke-width="0.5"/>
      <path d="${polyPath(iso.rightFace)}" fill="${colors.right}" stroke="#ffffff06" stroke-width="0.5"/>
      <path d="${polyPath(iso.frontFace)}" fill="${colors.front}" stroke="#ffffff06" stroke-width="0.5"/>
      <path d="${polyPath(iso.topFace)}" fill="${colors.top}" stroke="#ffffff12" stroke-width="0.8"/>
      ${label ? `<text x="${topC[0].toFixed(1)}" y="${(topC[1] - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#ffffffb0" font-family="system-ui,sans-serif">${label}</text>` : ''}
    </g>`
  }).join('\n')

  // ── 4. Symbols (people, furniture, vegetation) ──
  const showSymbols = config.showPeople || config.showFurniture || config.showVegetation
  let symbolsSVG = ''
  if (showSymbols) {
    const allInstances = floors.flatMap(floor => {
      const stack = config.floorStack.find(s => s.floorId === floor.id)
      if (!stack || !stack.visible) return []
      const floorZones = zones.filter(z => z.floorId === floor.id)
      return populateAllZones(floorZones, floor)
    })
    // Filter by enabled categories
    const filtered = allInstances.filter(inst => {
      const isPerson = inst.type.startsWith('person') || inst.type === 'mannequin'
      const isPlant = inst.type.startsWith('plant')
      const isFurniture = !isPerson && !isPlant
      if (isPerson && !config.showPeople) return false
      if (isPlant && !config.showVegetation) return false
      if (isFurniture && !config.showFurniture) return false
      return true
    })
    symbolsSVG = renderSymbolsSVG(filtered, zones, floors, config.floorStack, scaleFactor)
  }

  // ── 5. Entities (cameras, POI, transitions) ──
  const entitiesSVG = entities.map(e => `
    <circle cx="${e.isoX.toFixed(1)}" cy="${e.isoY.toFixed(1)}" r="5" fill="${e.color}" stroke="#ffffff30" stroke-width="0.8" opacity="${e.opacity ?? 1}"/>
    <text x="${e.isoX.toFixed(1)}" y="${(e.isoY + 3).toFixed(1)}" text-anchor="middle" font-size="6" fill="#ffffffcc" font-family="system-ui">${e.label.slice(0, 10)}</text>
  `).join('\n')

  // ── 6. Overlays (blindspots, wayfinding) ──
  const blindSpotSVG = data.sourceVolume === 'vol2' && data.blindSpots
    ? buildBlindSpotOverlaySVG(data.blindSpots, data.floors, config.floorStack, scaleFactor, config) : ''
  const wayfindingSVG = data.sourceVolume === 'vol3' && data.wayfindingPaths
    ? buildWayfindingPathsSVG(data.wayfindingPaths, data.floors, config.floorStack, scaleFactor, config) : ''

  // ── 7. Mall name on facade ──
  let mallNameSVG = ''
  if (config.showFacadeSigns && config.mallName) {
    const mainFloor = floors[1] ?? floors[0]
    const stack = config.floorStack.find(s => s.floorId === mainFloor?.id)
    if (mainFloor && stack) {
      const fx = mainFloor.widthM * 0.4
      const fz = 0  // front facade
      const fy = stack.baseElevationM + (stack.heightM ?? 4) * 0.7
      const [iX, iY] = worldToIso(fx, fy, fz, scaleFactor)
      mallNameSVG = `<g transform="translate(${iX.toFixed(1)},${iY.toFixed(1)})">${facadeSign(config.mallName, 100, 0.8)}</g>`
    }
  }

  // ── 8. Annotations (numbered zones with leader lines) ──
  let annotationsSVG = ''
  if (config.showAnnotationNumbers) {
    const annotations = autoGenerateAnnotations(zones)
    annotationsSVG = generateAnnotationsSVG(zones, annotations, floors, config.floorStack, vb, scaleFactor)
  }

  // ── COMPOSE FINAL SVG ──
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr}" width="100%" height="100%" style="background:${config.backgroundColor}" id="iso-scene">
    <defs><filter id="shadow"><feDropShadow dx="1.5" dy="3" stdDeviation="2.5" flood-color="#00000050"/></filter></defs>
    <g id="floor-tiles">${floorTilesSVG}</g>
    <g id="grid">${gridSVG}</g>
    <g id="zones" filter="url(#shadow)">${zonesSVG}</g>
    <g id="symbols">${symbolsSVG}</g>
    <g id="blindspots">${blindSpotSVG}</g>
    <g id="wayfinding">${wayfindingSVG}</g>
    <g id="entities">${entitiesSVG}</g>
    <g id="mall-name">${mallNameSVG}</g>
    <g id="annotations">${annotationsSVG}</g>
  </svg>`
}
